import logging

from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from firebase_admin import auth

from models.auth import SessionRequest, SessionResponse
from services.github import sync_github_profile
from utils.security import encrypt_token
from utils.database import get_users_collection
from utils.auth import get_current_uid

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/auth/session", response_model=SessionResponse)
async def create_session(request: SessionRequest, background_tasks: BackgroundTasks):
    """
    Verifies the Firebase ID token and triggers a background sync of the
    user's GitHub profile to MongoDB if applicable.
    """
    try:
        decoded_token = auth.verify_id_token(request.id_token)
        uid = decoded_token["uid"]
        email = decoded_token.get("email", "")
        logger.info(
            "✅ Creating session for uid=%s via provider_id=%s",
            uid,
            request.provider_id,
        )
        enc_token = (
            encrypt_token(request.github_access_token)
            if request.github_access_token
            else ""
        )

        background_tasks.add_task(
            sync_github_profile,
            uid=uid,
            email=email,
            provider_id=request.provider_id,
            encrypted_token=enc_token,
            plain_token=request.github_access_token or "",
        )

        return SessionResponse(
            uid=uid,
            status="Session active, data sync in progress",
        )

    except auth.InvalidIdTokenError:
        logger.info("❌ Invalid ID token when creating session")
        raise HTTPException(status_code=401, detail="Invalid ID token")
    except auth.ExpiredIdTokenError:
        logger.info("⏳ Expired ID token when creating session")
        raise HTTPException(status_code=401, detail="Expired ID token")
    except Exception:
        logger.exception("🚨 Unexpected error verifying ID token when creating session")
        raise HTTPException(status_code=401, detail="Token verification failed")


@router.get("/users/me")
async def get_current_user_profile(uid: str = Depends(get_current_uid)):
    """Fetches the authenticated user's profile from MongoDB."""
    collection = await get_users_collection()
    user_doc = await collection.find_one({"_id": uid})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User profile not found")

    user_doc.pop("github_access_token", None)
    return user_doc
