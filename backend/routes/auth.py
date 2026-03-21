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

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["authentication"])


@router.post("/session", response_model=SessionResponse)
async def create_session(request: SessionRequest, background_tasks: BackgroundTasks):
    """
    Create or update user session after Firebase authentication.
    
    Verifies the Firebase ID token and provisions/updates the user in the database.
    For Google provider, extracts profile data (name, avatar, location).
    """
    try:
        decoded_token = await asyncio.to_thread(auth.verify_id_token, request.id_token)
        uid = decoded_token["uid"]
        email = decoded_token.get("email", "") or request.email or ""

        # Fallback: fetch email from Firebase Admin if not available
        if not email:
            try:
                firebase_user = await asyncio.to_thread(auth.get_user, uid)
                email = firebase_user.email or ""
                if not email and firebase_user.provider_data:
                    for provider in firebase_user.provider_data:
                        if provider.email:
                            email = provider.email
                            break
            except Exception as e:
                logger.warning("Failed to fetch email from Firebase", exc_info=True)

        logger.info(
            "Session creation initiated",
            extra={"uid": uid, "provider": request.provider_id},
        )

        # Encrypt GitHub token if provided
        encrypted_token = None
        if request.github_access_token:
            encrypted_token = encrypt_token(request.github_access_token)

        # Extract provider-specific data
        provider_data = None
        if request.provider_id == "google.com":
            provider_data = UserService._extract_google_profile_data(decoded_token)
        elif request.provider_id == "github.com" and request.github_access_token:
            # Extract GitHub username
            github_username = await GitHubService.extract_github_username(request.github_access_token)
            provider_data = {"username": github_username}

        # Provision user in background
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


@router.post("/onboarding")
async def complete_onboarding(
    onboarding_data: OnboardingRequest,
    uid: str = Depends(get_current_uid),
):
    """
    Complete user onboarding after email/password signup.
    
    Collects and stores user profile information (name, username, bio, location, skills).
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
