import logging
import asyncio
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from firebase_admin import auth

# [ AUTH DEPENDENCIES ] ────────────────────────────────────────────────────────
logger = logging.getLogger(__name__)
bearer_scheme = HTTPBearer()


async def get_current_uid(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> str:
    """
    Extract and verify a Firebase ID token from the Authorization header.
    
    Logic Flow:
    1. Extraction: Retrieves the Bearer token from the request header.
    2. Verification: Offloads Firebase token validation to a worker thread.
    3. Categorization: Raises specific HTTP 401 errors for invalid vs expired tokens.
    """
    token = credentials.credentials
    try:
        # 1. Verification of the cryptographic signature
        decoded = await asyncio.to_thread(auth.verify_id_token, token)
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
