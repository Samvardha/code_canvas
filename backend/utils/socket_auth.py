"""
Socket.IO authentication middleware.
Verifies Firebase ID tokens on socket connection.
"""
import logging
import asyncio
from firebase_admin import auth

logger = logging.getLogger(__name__)


async def socket_authenticate(environ: dict, auth_data: dict) -> str:
    """
    Called during Socket.IO connection handshake.
    Expects the client to pass { "token": "<firebase_id_token>" } as auth.

    Returns the verified Firebase UID.
    Raises ConnectionRefusedError on failure.
    """
    token = None

    # 1. Try auth payload (recommended)
    if auth_data and isinstance(auth_data, dict):
        token = auth_data.get("token")

    # 2. Fallback: query string
    if not token:
        from urllib.parse import parse_qs

        qs = environ.get("QUERY_STRING", "")
        params = parse_qs(qs)
        token_list = params.get("token", [])
        if token_list:
            token = token_list[0]

    if not token:
        logger.warning("Socket connection rejected: no token provided")
        raise ConnectionRefusedError("Authentication token required")

    try:
        decoded = await asyncio.to_thread(auth.verify_id_token, token)
        uid = decoded["uid"]
        logger.debug("Socket authenticated for uid=%s", uid)
        return uid
    except auth.InvalidIdTokenError:
        logger.info("Socket connection rejected: invalid token")
        raise ConnectionRefusedError("Invalid authentication token")
    except auth.ExpiredIdTokenError:
        logger.info("Socket connection rejected: expired token")
        raise ConnectionRefusedError("Expired authentication token")
    except Exception as e:
        logger.exception("Socket auth error: %s", e)
        raise ConnectionRefusedError("Authentication failed")
