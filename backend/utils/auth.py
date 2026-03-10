import logging

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from firebase_admin import auth

logger = logging.getLogger(__name__)

bearer_scheme = HTTPBearer()


async def get_current_uid(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> str:
    """
    FastAPI dependency that extracts a Firebase ID token from the
    Authorization: Bearer <token> header, verifies it, and returns the UID.
    """
    token = credentials.credentials
    try:
        decoded = auth.verify_id_token(token)
        uid = decoded["uid"]
        logger.debug("✅ Verified Firebase ID token for uid=%s", uid)
        return uid
    except auth.InvalidIdTokenError:
        logger.info("❌ Invalid Firebase ID token in Authorization header")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid ID token",
        )
    except auth.ExpiredIdTokenError:
        logger.info("⏳ Expired Firebase ID token in Authorization header")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Expired ID token",
        )
    except Exception:
        logger.exception("🚨 Unexpected error while verifying Firebase ID token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token verification failed",
        )
