import logging
import asyncio
from pymongo.errors import DuplicateKeyError
from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from firebase_admin import auth
from models.auth import SessionRequest, SessionResponse
from models.user import OnboardingRequest
from services.user import UserService
from services.github import GitHubService
from utils.security import encrypt_token
from utils.auth import get_current_uid

# [ CONFIGURATION ] ────────────────────────────────────────────────────────────
logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["authentication"])


# [ SESSION MANAGEMENT ] ───────────────────────────────────────────────────────

@router.post("/session", response_model=SessionResponse)
async def create_session(request: SessionRequest, background_tasks: BackgroundTasks):
    """
    Synchronize user session with Firebase authentication.
    
    - Verifies the integrity of the Firebase ID token.
    - Provisions new users or updates existing ones in background tasks.
    - Extracts provider-specific profile data (Google/GitHub).
    """
    try:
        # 1. Verify token integrity
        decoded_token = await asyncio.to_thread(auth.verify_id_token, request.id_token)
        uid = decoded_token["uid"]
        email = decoded_token.get("email", "") or request.email or ""

        # 2. Extract profile/provider data
        encrypted_token = None
        if request.github_access_token:
            encrypted_token = encrypt_token(request.github_access_token)

        provider_data = None
        if request.provider_id == "google.com":
            provider_data = UserService._extract_google_profile_data(decoded_token)
        elif request.provider_id == "github.com" and request.github_access_token:
            github_username = await GitHubService.extract_github_username(request.github_access_token)
            provider_data = {"username": github_username}

        # 3. Offload database synchronization to background
        background_tasks.add_task(
            UserService.provision_user_on_auth,
            uid=uid,
            email=email,
            provider_id=request.provider_id,
            encrypted_token=encrypted_token,
            provider_data=provider_data,
        )

        return SessionResponse(uid=uid, status="Session created successfully")

    except auth.InvalidIdTokenError:
        logger.warning("Invalid ID token provided", extra={"provider": request.provider_id})
        raise HTTPException(status_code=401, detail="Invalid ID token")

    except auth.ExpiredIdTokenError:
        logger.warning("Expired ID token provided", extra={"provider": request.provider_id})
        raise HTTPException(status_code=401, detail="Expired ID token")

    except Exception as e:
        logger.error("Session creation failed", exc_info=True)
        raise HTTPException(status_code=500, detail="Session creation failed")


# [ ONBOARDING FLOW ] ─────────────────────────────────────────────────────────

@router.post("/onboarding")
async def complete_onboarding(
    onboarding_data: OnboardingRequest,
    uid: str = Depends(get_current_uid),
):
    """
    Finalize user profile setup after initial authentication.
    
    - Validates username uniqueness.
    - Captures professional metadata (bio, skills, location).
    """
    try:
        logger.info(
            "Onboarding initiated",
            extra={"uid": uid, "username": onboarding_data.username},
        )

        await UserService.complete_user_onboarding(
            uid=uid,
            onboarding_data=onboarding_data.dict(),
        )

        return {
            "status": "success",
            "message": "Onboarding completed successfully",
        }

    except DuplicateKeyError:
        logger.warning("Onboarding failed: duplicate username", extra={"uid": uid, "username": onboarding_data.username})
        raise HTTPException(status_code=400, detail="USERNAME_ALREADY_TAKEN")
    except Exception as e:
        logger.error("Onboarding failed", exc_info=True, extra={"uid": uid})
        raise HTTPException(status_code=500, detail="Onboarding failed")
