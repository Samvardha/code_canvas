import logging
from datetime import datetime
from typing import Optional, Dict, Any
from bson import ObjectId
from services.user import UserService
from utils.database import get_notifications_collection

# [ CONFIGURATION ] ────────────────────────────────────────────────────────────
logger = logging.getLogger(__name__)

# Module-level reference to the Socket.IO server, injected at startup
_sio = None


def set_sio(sio):
    """
    Inject the Socket.IO server instance for real-time notification delivery.
    
    Called once during application bootstrap in app_factory.py.
    """
    global _sio
    _sio = sio


class NotificationService:
    """
    Service for creating, retrieving, and managing user notifications.
    
    Handles persistent storage in MongoDB and real-time delivery via Socket.IO.
    Designed to be called from any trigger point (routes, services, socket handlers).
    """

    # [ NOTIFICATION CREATION ] ────────────────────────────────────────────────

    @staticmethod
    async def create_notification(
        recipient_id: str,
        sender_id: str,
        type: str,
        entity: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """
        Create a notification, persist it to the database, and emit it in real-time.
        
        Logic Flow:
        1. Self-Check: Prevents self-notifications.
        2. Persistence: Inserts the notification document into MongoDB.
        3. Emission: Broadcasts via Socket.IO to the recipient's private room.
        
        Returns the notification document if created, None if skipped (self-notification).
        """
        # 1. Block self-notifications
        if sender_id == recipient_id:
            logger.debug(f"Skipped self-notification: {sender_id} -> {recipient_id}")
            return None

        notifications_col = await get_notifications_collection()

        # 2. Build and persist the notification document
        notification_doc = {
            "recipient_id": recipient_id,
            "sender_id": sender_id,
            "type": type,
            "entity": {
                "id": str(entity.get("id", "")),
                "type": entity.get("type", "")
            },
            "is_read": False,
            "created_at": datetime.utcnow()
        }

        try:
            result = await notifications_col.insert_one(notification_doc)
            notification_doc["_id"] = str(result.inserted_id)

            logger.info(f"Notification created: {type} | {sender_id} -> {recipient_id}")

            # 3. Real-time emission to the recipient's Socket.IO room
            if _sio:
                socket_payload = dict(notification_doc)
                dt = socket_payload.get("created_at")
                if isinstance(dt, datetime):
                    socket_payload["created_at"] = dt.strftime('%Y-%m-%dT%H:%M:%SZ')
                
                # Fetch dynamically for socket payload
                profiles = await UserService.fetch_chat_profiles([sender_id])
                if profiles:
                    socket_payload["sender_username"] = profiles[0].get("username", sender_id)
                else:
                    socket_payload["sender_username"] = sender_id
                
                await _sio.emit("new_notification", socket_payload, room=recipient_id)
                logger.debug(f"Notification emitted to room: {recipient_id}")

            return notification_doc

        except Exception:
            logger.error("Failed to create notification", exc_info=True)
            raise


    # [ RETRIEVAL OPERATIONS ] ─────────────────────────────────────────────────

    @staticmethod
    async def get_notifications(
        recipient_id: str,
        cursor: Optional[str] = None,
        limit: int = 20
    ) -> Dict[str, Any]:
        """
        Fetch paginated notifications for a user, sorted newest-first.
        
        Logic Flow:
        1. Query Construction: Builds filter with optional cursor for pagination.
        2. Execution: Fetches limit+1 documents to determine if more pages exist.
        3. Cursor Generation: Returns the created_at ISO string of the last item.
        """
        notifications_col = await get_notifications_collection()

        # 1. Build the query with optional cursor-based pagination
        query = {"recipient_id": recipient_id}
        if cursor:
            try:
                cursor_date = datetime.fromisoformat(cursor.replace("Z", "+00:00"))
                query["created_at"] = {"$lt": cursor_date}
            except (ValueError, TypeError):
                logger.warning(f"Invalid cursor value received: {cursor}")

        # 2. Fetch limit+1 to detect next page existence
        docs = await notifications_col.find(query) \
            .sort("created_at", -1) \
            .limit(limit + 1) \
            .to_list(length=limit + 1)

        has_more = len(docs) > limit
        if has_more:
            docs = docs[:limit]

        # 3. Stringify ObjectIds for API response compatibility and inject usernames
        sender_ids = list(set([doc["sender_id"] for doc in docs]))
        profiles = await UserService.fetch_chat_profiles(sender_ids)
        profile_map = {p["user_id"]: p.get("username", "Someone") for p in profiles}

        notifications = []
        for doc in docs:
            doc["_id"] = str(doc["_id"])
            if "entity" in doc and "id" in doc["entity"]:
                doc["entity"]["id"] = str(doc["entity"]["id"])
            doc["sender_username"] = profile_map.get(doc["sender_id"], doc["sender_id"])
            notifications.append(doc)

        # 4. Generate the next cursor from the last document
        next_cursor = None
        if has_more and notifications:
            last_created_at = notifications[-1].get("created_at")
            if isinstance(last_created_at, datetime):
                next_cursor = last_created_at.strftime('%Y-%m-%dT%H:%M:%SZ')
            elif isinstance(last_created_at, str):
                next_cursor = last_created_at

        return {
            "notifications": notifications,
            "next_cursor": next_cursor
        }


    # [ STATE MANAGEMENT ] ─────────────────────────────────────────────────────

    @staticmethod
    async def mark_as_read(notification_id: str, recipient_id: str) -> bool:
        """
        Mark a single notification as read.
        
        Logic Flow:
        1. Validation: Verifies the ObjectId and ownership.
        2. Update: Sets is_read to True for the matched document.
        """
        notifications_col = await get_notifications_collection()

        try:
            notif_oid = ObjectId(notification_id)
        except Exception:
            return False

        # 1. Ownership-guarded update
        result = await notifications_col.update_one(
            {"_id": notif_oid, "recipient_id": recipient_id},
            {"$set": {"is_read": True}}
        )

        return result.modified_count > 0


    @staticmethod
    async def mark_all_as_read(recipient_id: str) -> int:
        """
        Mark all unread notifications as read for a given user.
        
        Returns the count of notifications that were updated.
        """
        notifications_col = await get_notifications_collection()

        result = await notifications_col.update_many(
            {"recipient_id": recipient_id, "is_read": False},
            {"$set": {"is_read": True}}
        )

        logger.info(f"Marked {result.modified_count} notifications as read for {recipient_id}")
        return result.modified_count


    @staticmethod
    async def get_unread_count(recipient_id: str) -> int:
        """
        Count the total number of unread notifications for a user.
        """
        notifications_col = await get_notifications_collection()

        count = await notifications_col.count_documents({
            "recipient_id": recipient_id,
            "is_read": False
        })

        return count
