import logging
import socketio
from utils.socket_auth import socket_authenticate
from .chat import cleanup_throttles

# [ SOCKET REGISTRATION ] ──────────────────────────────────────────────────────
logger = logging.getLogger(__name__)


def register_core_handlers(sio: socketio.AsyncServer):
    """
    Register the foundational Socket.IO handshake and termination logic.
    
    Logic Flow:
    1. Authentication: Verifies identity before allowing a connection.
    2. Session Management: Persists the UID to the socket session.
    3. Networking: Assigns the user to a private room for targeted events.
    4. Presence: Tracks device_id and active screen for push decision logic.
    5. Cleanup: Purges runtime state on disconnection.
    """

    # [ CONNECTION LIFECYCLE ] ──────────────────────────────────────────────────

    @sio.event
    async def connect(sid, environ, auth):
        """
        Authenticate the client and established a dedicated transmission tunnel.
        """
        try:
            # 1. Identity Verification
            uid = await socket_authenticate(environ, auth)
            
            # 2. State & Room Assignment (include device_id from auth payload)
            device_id = auth.get("device_id") if isinstance(auth, dict) else None
            await sio.save_session(sid, {
                "uid": uid,
                "device_id": device_id,
                "active_screen": None,
                "entity_id": None,
            })
            await sio.enter_room(sid, uid)
            
            logger.info(f"⚡ [SOCKET] Connection established: UID={uid} | SID={sid} | Device={device_id or 'N/A'}")
        except ConnectionRefusedError:
            # Let the exception bubble up to terminate the handshake
            raise


    @sio.on("update_presence")
    async def on_update_presence(sid, data):
        """
        Update the active screen and conversation context for a socket session.
        
        Called by the frontend when navigating between screens so the push
        service can skip notifications for screens the user is actively viewing.
        """
        session = await sio.get_session(sid)
        if not session:
            return

        if not isinstance(data, dict):
            return

        session["active_screen"] = data.get("activeScreen")
        session["entity_id"] = data.get("entityId")
        await sio.save_session(sid, session)


    @sio.event
    async def disconnect(sid):
        """
        Terminate the transmission tunnel and purge associated runtime memory.
        """
        session = await sio.get_session(sid)
        uid = session.get("uid", "unknown") if session else "unknown"

        # State Purification
        cleanup_throttles(sid)
            
        logger.info("Socket disconnected: uid=%s sid=%s", uid, sid)
