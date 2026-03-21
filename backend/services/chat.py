import logging
from datetime import datetime
from typing import Optional, Tuple, List, Dict, Any
from bson import ObjectId
import pymongo.errors
from utils.database import (get_conversations_collection, get_messages_collection, get_peers_collection)
from models.chat import (Conversation, Message, MessageContent, MessageStatus)
from services.user import UserService
from utils.serialization import datetime_serializer

logger = logging.getLogger(__name__)


class ChatService:
    """Service layer for all chat business logic."""


    @staticmethod
    async def _are_peers(user_a: str, user_b: str) -> bool:
        """Check whether two users are connected peers."""
        peers_col = await get_peers_collection()
        users_sorted = sorted([user_a, user_b])
        doc = await peers_col.find_one({"users": users_sorted})
        return doc is not None


    @staticmethod
    async def start_or_get_conversation(
        current_uid: str, target_uid: str
    ) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """
        Start a new conversation or return existing one.
        Returns (success, message, conversation_doc | None).
        """
        if current_uid == target_uid:
            return False, "Cannot start a conversation with yourself", None

        # 1. Verify peer connection
        if not await ChatService._are_peers(current_uid, target_uid):
            return False, "You can only chat with your peers", None

        conv_col = await get_conversations_collection()
        participants = sorted([current_uid, target_uid])

        # 2. Check existing
        existing = await conv_col.find_one({"participants": participants})
        if existing:
            existing["id"] = str(existing.pop("_id"))
            await ChatService._enrich_conversation_profiles([existing])
            return True, "Conversation found", existing


        # 3. Create new
        now = datetime.utcnow()
        new_conv = Conversation(
            participants=participants,
            unread_counts={current_uid: 0, target_uid: 0},
            created_at=now,
            updated_at=now,
        )
        try:
            result = await conv_col.insert_one(new_conv.dict())
            doc = new_conv.dict()
            doc["id"] = str(result.inserted_id)
        except pymongo.errors.DuplicateKeyError:
            existing = await conv_col.find_one({"participants": participants})
            if not existing:
                return False, "Failed to create or retrieve conversation", None
            existing["id"] = str(existing.pop("_id"))
            doc = existing

        await ChatService._enrich_conversation_profiles([doc])
        
        logger.info(
            "Conversation created or retrieved between %s and %s", current_uid, target_uid
        )
        return True, "Success", doc

    @staticmethod
    async def get_conversations(
        user_id: str, cursor: Optional[str] = None, limit: int = 10
    ) -> Tuple[List[Dict[str, Any]], Optional[str]]:
        """
        Paginated list of conversations for a user.
        Uses cursor-based pagination on `updated_at`.
        """
        conv_col = await get_conversations_collection()

        query: Dict[str, Any] = {"participants": user_id}
        if cursor:
            try:
                if "|" in cursor:
                    ts_str, id_str = cursor.split("|")
                    cursor_dt = datetime.fromisoformat(ts_str)
                    cursor_oid = ObjectId(id_str)
                    query["$or"] = [
                        {"updated_at": {"$lt": cursor_dt}},
                        {"updated_at": cursor_dt, "_id": {"$lt": cursor_oid}},
                    ]
                else:
                    cursor_dt = datetime.fromisoformat(cursor)
                    query["updated_at"] = {"$lt": cursor_dt}
            except Exception:
                pass

        docs = await (
            conv_col.find(query)
            .sort([("updated_at", -1), ("_id", -1)])
            .limit(limit + 1)
            .to_list(length=limit + 1)
        )

        next_cursor: Optional[str] = None
        if len(docs) > limit:
            docs = docs[:limit]
            last = docs[-1]
            next_cursor = f"{last['updated_at'].isoformat()}|{str(last['_id'])}"

        await ChatService._enrich_conversation_profiles(docs)

        results = []
        for d in docs:
            d["id"] = str(d.pop("_id"))
            d["unread_count"] = d.get("unread_counts", {}).get(user_id, 0)
            if "created_at" in d:
                d["created_at"] = datetime_serializer(d["created_at"])
            if "updated_at" in d:
                d["updated_at"] = datetime_serializer(d["updated_at"])
            if d.get("last_message") and "created_at" in d["last_message"]:
                d["last_message"]["created_at"] = datetime_serializer(d["last_message"]["created_at"])
            results.append(d)

        return results, next_cursor


    @staticmethod
    async def _enrich_conversation_profiles(conversations: List[Dict[str, Any]]) -> None:
        """Helper to batch fetch participant profiles and attach to conversations."""
        all_participant_ids = set()
        for d in conversations:
            all_participant_ids.update(d.get("participants", []))
        
        if not all_participant_ids:
            return

        profiles = await UserService.fetch_chat_profiles(list(all_participant_ids))
        profile_map = {p["user_id"]: p for p in profiles}

        for d in conversations:
            d["participant_profiles"] = {
                uid: profile_map.get(uid, {}) for uid in d.get("participants", [])
            }


    @staticmethod
    async def get_messages(
        user_id: str,
        conversation_id: str,
        cursor: Optional[str] = None,
        limit: int = 20,
    ) -> Tuple[bool, str, List[Dict[str, Any]], Optional[str]]:
        """
        Paginated messages for a conversation.
        Returns (success, message, messages, next_cursor).
        """
        conv_col = await get_conversations_collection()

        try:
            conv_oid = ObjectId(conversation_id)
        except Exception:
            return False, "Invalid conversation ID", [], None

        conv = await conv_col.find_one({"_id": conv_oid})
        if not conv:
            return False, "Conversation not found", [], None
        if user_id not in conv.get("participants", []):
            return False, "You are not a participant", [], None

        msg_col = await get_messages_collection()
        query: Dict[str, Any] = {"conversation_id": conv_oid}
        if cursor:
            try:
                if "|" in cursor:
                    ts_str, id_str = cursor.split("|")
                    cursor_dt = datetime.fromisoformat(ts_str)
                    cursor_oid = ObjectId(id_str)
                    query["$or"] = [
                        {"created_at": {"$lt": cursor_dt}},
                        {"created_at": cursor_dt, "_id": {"$lt": cursor_oid}},
                    ]
                else:
                    cursor_dt = datetime.fromisoformat(cursor)
                    query["created_at"] = {"$lt": cursor_dt}
            except Exception:
                pass

        docs = await (
            msg_col.find(query)
            .sort([("created_at", -1), ("_id", -1)])
            .limit(limit + 1)
            .to_list(length=limit + 1)
        )

        next_cursor: Optional[str] = None
        if len(docs) > limit:
            docs = docs[:limit]
            last = docs[-1]
            next_cursor = f"{last['created_at'].isoformat()}|{str(last['_id'])}"

        results = []
        for d in docs:
            d["id"] = str(d.pop("_id"))
            d["conversation_id"] = str(d["conversation_id"])
            if "created_at" in d:
                d["created_at"] = datetime_serializer(d["created_at"])
            results.append(d)

        return True, "OK", results, next_cursor


    @staticmethod
    async def send_message(
        sender_id: str, conversation_id: str, text: str
    ) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """
        Validate, persist, and return the new message document.
        Returns (success, error_or_ok, message_doc | None).
        """
        conv_col = await get_conversations_collection()

        try:
            conv_oid = ObjectId(conversation_id)
        except Exception:
            return False, "Invalid conversation ID", None

        conv = await conv_col.find_one({"_id": conv_oid})
        if not conv:
            return False, "Conversation not found", None

        participants = conv.get("participants", [])
        if sender_id not in participants:
            return False, "You are not a participant", None

        # Identify receiver
        receiver_id = (
            participants[0] if participants[1] == sender_id else participants[1]
        )

        # Verify peer connection still exists
        if not await ChatService._are_peers(sender_id, receiver_id):
            return False, "You are no longer peers with this user", None

        # Persist message
        now = datetime.utcnow()
        msg = Message(
            conversation_id=conversation_id,
            sender_id=sender_id,
            content=MessageContent(text=text),
            status=MessageStatus.SENT,
            created_at=now,
        )
        msg_dict = msg.dict()
        msg_dict["conversation_id"] = conv_oid

        msg_col = await get_messages_collection()
        result = await msg_col.insert_one(msg_dict)

        # Update conversation
        await conv_col.update_one(
            {"_id": conv_oid},
            {
                "$set": {
                    "last_message": {
                        "text": text,
                        "sender_id": sender_id,
                        "created_at": now,
                    },
                    "updated_at": now,
                },
                "$inc": {f"unread_counts.{receiver_id}": 1},
            },
        )

        # Build response payload
        msg_doc = {
            "id": str(result.inserted_id),
            "conversation_id": conversation_id,
            "sender_id": sender_id,
            "content": {"text": text},
            "status": MessageStatus.SENT.value,
            "created_at": datetime_serializer(now),
        }
        return True, "OK", msg_doc


    @staticmethod
    async def mark_as_read(
        user_id: str, conversation_id: str
    ) -> Tuple[bool, str]:
        """Reset unread count for `user_id` in the conversation."""
        conv_col = await get_conversations_collection()

        try:
            conv_oid = ObjectId(conversation_id)
        except Exception:
            return False, "Invalid conversation ID"

        conv = await conv_col.find_one({"_id": conv_oid})
        if not conv:
            return False, "Conversation not found"
        if user_id not in conv.get("participants", []):
            return False, "You are not a participant"

        await conv_col.update_one(
            {"_id": conv_oid},
            {"$set": {f"unread_counts.{user_id}": 0}},
        )

        # Optionally: mark all messages as seen
        msg_col = await get_messages_collection()
        await msg_col.update_many(
            {
                "conversation_id": conv_oid,
                "sender_id": {"$ne": user_id},
                "status": {"$ne": MessageStatus.SEEN.value},
            },
            {"$set": {"status": MessageStatus.SEEN.value}},
        )

        return True, "OK"
