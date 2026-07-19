import logging
from datetime import datetime
from typing import Optional, Dict, Any, List
from bson import ObjectId
from services.user import UserService
from utils.database import get_notifications_collection
from services.push_notifications import PushNotificationService
from utils.push_helpers import build_push_body, build_push_route

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
        entity: Dict[str, Any],
        comment_id: Optional[str] = None
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
                "type": entity.get("type", ""),
                "comment_id": str(comment_id) if comment_id else None
            },
            "is_read": False,
            "created_at": datetime.utcnow()
        }

        try:
            result = await notifications_col.insert_one(notification_doc)
            notification_doc["_id"] = str(result.inserted_id)

            logger.info(f"Notification created: {type} | {sender_id} -> {recipient_id}")

            profiles = await UserService.fetch_chat_profiles([sender_id])
            sender_username = (
                profiles[0].get("username", sender_id) if profiles else sender_id
            )

            # 3. Real-time emission to the recipient's Socket.IO room
            if _sio:
                socket_payload_serializable: Dict[str, Any] = dict(notification_doc)
                dt = socket_payload_serializable.get("created_at")
                if isinstance(dt, datetime):
                    socket_payload_serializable["created_at"] = dt.strftime('%Y-%m-%dT%H:%M:%SZ')
                socket_payload_serializable["sender_username"] = sender_username

                await _sio.emit("new_notification", socket_payload_serializable, room=recipient_id)
                logger.debug(f"Notification emitted to room: {recipient_id}")

            # 4. Push notification to inactive devices
            try:
                push_title = "Tech Connect"
                push_body = build_push_body(sender_username, type, entity)
                push_data = {"route": build_push_route(type, entity, sender_username)}

                # Determine skip criteria based on notification type
                skip_screen = None
                skip_entity_id = None
                if type in ("like", "comment", "comment_like", "comment_reply"):
                    skip_screen = "post"
                    skip_entity_id = str(entity.get("id", ""))
                elif type == "message":
                    skip_screen = "chat"
                    skip_entity_id = str(entity.get("id", ""))

                await PushNotificationService.send_push_notification(
                    user_id=recipient_id,
                    title=push_title,
                    body=push_body,
                    data=push_data,
                    skip_screen=skip_screen,
                    skip_entity_id=skip_entity_id,
                )
            except Exception:
                logger.debug("Push delivery failed (non-critical)", exc_info=True)

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
        query: Dict[str, Any] = {"recipient_id": recipient_id}
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

    # [ CLEANUP OPERATIONS ] ───────────────────────────────────────────────────

    @staticmethod
    async def delete_notification(sender_id: str, recipient_id: str, notif_type: str, entity_id: str, comment_id: Optional[str] = None) -> None:
        """
        Retract a specific notification (e.g. when un-liking a post).
        """
        try:
            notifications_col = await get_notifications_collection()
            query = {
                "sender_id": sender_id,
                "recipient_id": recipient_id,
                "type": notif_type,
                "entity.id": str(entity_id)
            }
            if comment_id:
                query["entity.comment_id"] = str(comment_id)
                
            await notifications_col.delete_many(query)
        except Exception:
            logger.error(f"Failed to retract notification: {notif_type}", exc_info=True)

    @staticmethod
    async def delete_all_for_comments(comment_ids: List[str]) -> None:
        """
        Purge all notifications tied to a specific set of comments (likes, replies, etc).
        """
        try:
            notifications_col = await get_notifications_collection()
            await notifications_col.delete_many({
                "entity.comment_id": {"$in": [str(cid) for cid in comment_ids]}
            })
        except Exception:
            logger.error("Failed to purge notifications for comment list", exc_info=True)

    @staticmethod
    async def delete_all_for_entity(entity_id: str, entity_type: str) -> None:
        """
        Cascade purge all notifications tied to a destroyed entity (e.g., deleted post).
        """
        try:
            notifications_col = await get_notifications_collection()
            await notifications_col.delete_many({
                "entity.id": str(entity_id),
                "entity.type": entity_type
            })
        except Exception:
            logger.error(f"Failed to purge notifications for entity: {entity_id}", exc_info=True)
