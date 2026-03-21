import logging
import socketio
from utils.socket_auth import socket_authenticate
from .chat import cleanup_throttles

logger = logging.getLogger(__name__)

def register_core_handlers(sio: socketio.AsyncServer):
    """Register top-level Socket.IO connection and disconnection handlers."""

    @sio.event
    async def connect(sid, environ, auth):
        """
        Top-level connect handler.
        Authenticates the user and stores uid in session.
        """
        try:
            uid = await socket_authenticate(environ, auth)
            await sio.save_session(sid, {"uid": uid})
            await sio.enter_room(sid, uid)
            logger.info("Socket connected: uid=%s sid=%s", uid, sid)
        except ConnectionRefusedError:
            raise

    @sio.event
    async def disconnect(sid):
        """Cleanup on socket disconnection."""
        session = await sio.get_session(sid)
        uid = session.get("uid", "unknown") if session else "unknown"

        cleanup_throttles(sid)
            
        logger.info("Socket disconnected: uid=%s sid=%s", uid, sid)
