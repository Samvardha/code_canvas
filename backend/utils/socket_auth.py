import logging
import asyncio
from firebase_admin import auth

# [ SOCKET SECURITY ] ──────────────────────────────────────────────────────────
logger = logging.getLogger(__name__)


async def socket_authenticate(environ: dict, auth_data: dict) -> str:
    """
    Validate a user's identity during the Socket.IO connection handshake.
    
    Logic Flow:
    1. Extraction: Attempts to pull the token from the 'auth' payload (recommended).
    2. Fallback: Extracts token from the query string if the payload is empty.
    3. Verification: Decodes the Firebase JWT to extract the global UID.
    """
    token = None

    # 1. Payload-based extraction (Primary)
    if auth_data and isinstance(auth_data, dict):
        token = auth_data.get("token")

    # 2. Query-based extraction (Legacy fallback)
    if not token:
        from urllib.parse import parse_qs
        qs = environ.get("QUERY_STRING", "")
        params = parse_qs(qs)
        token_list = params.get("token", [])
        if token_list:
            token = token_list[0]

    # 3. Identity Verification
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
