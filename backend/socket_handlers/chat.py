import logging
import socketio
import time
from bson import ObjectId
from typing import Dict, Tuple
from utils.database import get_conversations_collection
from services.chat import ChatService

# [ CONFIGURATION ] ────────────────────────────────────────────────────────────
logger = logging.getLogger(__name__)

# State tracking for signal frequency control
_last_event_times: Dict[Tuple[str, str], float] = {}


# [ THROTTLING UTILS ] ────────────────────────────────────────────────────────

def is_throttled(sid: str, event_type: str, interval: float) -> bool:
    """
    Enforce frequency limits on high-volume socket events.
    
    Prevents flood attacks and reduces redundant processing for near-simultaneous signals.
    """
    now = time.time()
    last_time = _last_event_times.get((sid, event_type), 0.0)
    if now - last_time < interval:
        return True
    _last_event_times[(sid, event_type)] = now
    return False


def cleanup_throttles(sid: str):
    """ Purge runtime throttle state upon socket termination. """
    keys_to_clear = [k for k in _last_event_times.keys() if k[0] == sid]
    for k in keys_to_clear:
        _last_event_times.pop(k, None)
    logger.debug("Cleaned up chat throttling data for sid %s", sid)


# [ SOCKET REGISTRATION ] ──────────────────────────────────────────────────────

def register_chat_handlers(sio: socketio.AsyncServer):
    """
    Register real-time transmission event handlers.
    
    Logic Flow:
    - send_message: Broadcasts a new transmission to all channel participants.
    - mark_as_read: Resets unread counters and informs the network.
    - typing: Propagates non-persistent signals (ephemeral presence).
    """

    # [ EVENT HANDLERS ] ───────────────────────────────────────────────────────

    @sio.on("send_message")
    async def on_send_message(sid, data):
        """
        Broadcast a new message signal.
        
        Logic Flow:
        1. Auth Check: Verify UID exists in the current socket session.
        2. Throttling: Enforce 1-second transmission delay.
        3. Persistence: Write message to the permanent record via ChatService.
        4. Propagation: Emit 'new_message' to all participants in their private rooms.
        """
        session = await sio.get_session(sid)
        uid = session.get("uid")
        if not uid:
            await sio.emit("error", {"message": "Access Denied: Not authenticated"}, to=sid)
            return

        # 1. Frequency Control
        if is_throttled(sid, "send_message", 1.0):
            await sio.emit("error", {"message": "Messaging frequency limit reached. Please wait."}, to=sid)
            return

        # 2. Payload Validation
        if not isinstance(data, dict):
            await sio.emit("error", {"message": "Invalid network payload"}, to=sid)
            return

        conversation_id = data.get("conversationId")
        text = data.get("text", "").strip()

        if not conversation_id or not text:
            await sio.emit("error", {"message": "Payload mismatch: conversationId and text required"}, to=sid)
            return

        if len(text) > 2000:
            await sio.emit("error", {"message": "Signal overflow: max 2000 characters"}, to=sid)
            return

        # 3. Backend Persistence
        success, msg, message_doc = await ChatService.send_message(
            sender_id=uid,
            conversation_id=conversation_id,
            text=text,
        )

        if not success:
            return {"status": "error", "message": msg}

        # 4. Multi-room Propagation
        client_msg_id = data.get("clientMessageId")
        conv_col = await get_conversations_collection()
        conv = await conv_col.find_one({"_id": ObjectId(conversation_id)}, {"participants": 1})
        
        if conv:
            for p_uid in conv.get("participants", []):
                # We skip the sender's SID to allow them to handle the ACK manually via return
                await sio.emit("new_message", message_doc, room=p_uid, skip_sid=sid)
        
        logger.debug(f"Signal broadcast: {uid} in channel {conversation_id}")
        return {
            "status": "ok", 
            "message": message_doc,
            "clientMessageId": client_msg_id
        }


    @sio.on("mark_as_read")
    async def on_mark_as_read(sid, data):
        """ Reset transmission counters for a specific channel. """
        session = await sio.get_session(sid)
        uid = session.get("uid")
        if not uid:
            await sio.emit("error", {"message": "Access Denied"}, to=sid)
            return

        conversation_id = data.get("conversationId") if isinstance(data, dict) else None
        if not conversation_id:
            await sio.emit("error", {"message": "Channel identification required"}, to=sid)
            return

        success, msg = await ChatService.mark_as_read(uid, conversation_id)
        if not success:
            await sio.emit("error", {"message": msg}, to=sid)


    @sio.on("typing")
    async def on_typing(sid, data):
        """ Propagate ephemeral presence signals to channel peers. """
        session = await sio.get_session(sid)
        uid = session.get("uid")
        if not uid or not isinstance(data, dict):
            return

        # High-frequency presence throttle
        if is_throttled(sid, "typing", 0.1):
            return

        conversation_id = data.get("conversationId")
        is_typing = data.get("isTyping", False)

        if not conversation_id:
            return

        # Verify participant status before emitting presence
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
                # Propagate to the peer's private room
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
            pass
