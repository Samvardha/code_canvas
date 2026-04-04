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
    4. Cleanup: Purges runtime state on disconnection.
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
            
            # 2. State & Room Assignment
            await sio.save_session(sid, {"uid": uid})
            await sio.enter_room(sid, uid)
            
            logger.info(f"⚡ [SOCKET] Connection established: UID={uid} | SID={sid}")
        except ConnectionRefusedError:
            # Let the exception bubble up to terminate the handshake
            raise


    @sio.event
    async def disconnect(sid):
        """
        Terminate the transmission tunnel and purge associated runtime memory.
        """
        session = await sio.get_session(sid)
        uid = session.get("uid", "unknown") if session else "unknown"

        # 4. State Purification
        cleanup_throttles(sid)
            
        logger.info("Socket disconnected: uid=%s sid=%s", uid, sid)
