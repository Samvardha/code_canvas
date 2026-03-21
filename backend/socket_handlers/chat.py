"""
Socket.IO event handlers for real-time chat.

Rooms:
  - Each user joins a room named after their uid (for future notifications).
  - Each conversation is a room named after its conversation_id.

Client → Server events:
  - join_conversation  { conversationId }
  - send_message       { conversationId, text }
  - mark_as_read       { conversationId }
  - typing             { conversationId, isTyping: bool }

Server → Client events:
  - new_message        { id, conversation_id, sender_id, content, status, created_at }
  - user_typing        { conversation_id, user_id, is_typing }
  - error              { message }
"""

import logging

import socketio

from bson import ObjectId
import time
from typing import Dict, Tuple
from utils.database import get_conversations_collection
from services.chat import ChatService

logger = logging.getLogger(__name__)

_last_event_times: Dict[Tuple[str, str], float] = {}


def is_throttled(sid: str, event_type: str, interval: float) -> bool:
    """Check if an event from a socket is within the allowed interval."""
    now = time.time()
    last_time = _last_event_times.get((sid, event_type), 0.0)
    if now - last_time < interval:
        return True
    _last_event_times[(sid, event_type)] = now
    return False


def cleanup_throttles(sid: str):
    """Cleanup throttling data when a socket disconnects."""
    keys_to_clear = [k for k in _last_event_times.keys() if k[0] == sid]
    for k in keys_to_clear:
        _last_event_times.pop(k, None)
    logger.debug("Cleaned up chat throttling data for sid %s", sid)


def register_chat_handlers(sio: socketio.AsyncServer):
    """Register all chat-related Socket.IO event handlers."""


    @sio.on("send_message")
    async def on_send_message(sid, data):
        session = await sio.get_session(sid)
        uid = session.get("uid")
        if not uid:
            await sio.emit("error", {"message": "Not authenticated"}, to=sid)
            return

        # Throttling: 1 message per second
        if is_throttled(sid, "send_message", 1.0):
            await sio.emit(
                "error", {"message": "Messaging too fast. Please wait."}, to=sid
            )
            return

        if not isinstance(data, dict):
            await sio.emit("error", {"message": "Invalid payload"}, to=sid)
            return

        conversation_id = data.get("conversationId")
        text = data.get("text", "").strip()

        if not conversation_id:
            await sio.emit("error", {"message": "conversationId is required"}, to=sid)
            return
        if not text:
            await sio.emit("error", {"message": "Message text cannot be empty"}, to=sid)
            return

        if len(text) > 2000:
            await sio.emit(
                "error", {"message": "Message is too long (max 2000 chars)"}, to=sid
            )
            return

        success, msg, message_doc = await ChatService.send_message(
            sender_id=uid,
            conversation_id=conversation_id,
            text=text,
        )

        if not success:
            return {"status": "error", "message": msg}

        client_msg_id = data.get("clientMessageId")

        conv_col = await get_conversations_collection()
        conv = await conv_col.find_one({"_id": ObjectId(conversation_id)}, {"participants": 1})
        if conv:
            for p_uid in conv.get("participants", []):
                await sio.emit("new_message", message_doc, room=p_uid, skip_sid=sid)
        
        logger.debug("Message sent by %s in conversation %s", uid, conversation_id)
        
        return {
            "status": "ok", 
            "message": message_doc,
            "clientMessageId": client_msg_id
        }


    @sio.on("mark_as_read")
    async def on_mark_as_read(sid, data):
        session = await sio.get_session(sid)
        uid = session.get("uid")
        if not uid:
            await sio.emit("error", {"message": "Not authenticated"}, to=sid)
            return

        conversation_id = data.get("conversationId") if isinstance(data, dict) else None
        if not conversation_id:
            await sio.emit("error", {"message": "conversationId is required"}, to=sid)
            return

        success, msg = await ChatService.mark_as_read(uid, conversation_id)
        if not success:
            await sio.emit("error", {"message": msg}, to=sid)

    @sio.on("typing")
    async def on_typing(sid, data):
        session = await sio.get_session(sid)
        uid = session.get("uid")
        if not uid or not isinstance(data, dict):
            return

        if is_throttled(sid, "typing", 0.1):
            return

        conversation_id = data.get("conversationId")
        is_typing = data.get("isTyping", False)

        if not conversation_id:
            return

        conv_col = await get_conversations_collection()
        try:
            conv_oid = ObjectId(conversation_id)
            conv = await conv_col.find_one({"_id": conv_oid}, {"participants": 1})
            if not conv:
                return

            participants = conv.get("participants", [])
            if uid not in participants:
                return

            for p_uid in participants:
                if p_uid == uid:
                    continue
                await sio.emit(
                    "user_typing",
                    {
                        "conversation_id": conversation_id,
                        "user_id": uid,
                        "is_typing": is_typing,
                    },
                    room=p_uid,
                )
        except Exception:
            return
