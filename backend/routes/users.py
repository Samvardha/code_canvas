import re
import logging
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Query
from fastapi.responses import JSONResponse
from utils.auth import get_current_uid
from services.user import UserService
from services.github import GitHubService
from utils.security import decrypt_token
from utils.database import get_users_collection
from utils.cloudinary_utils import upload_image

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/search")
async def search_users(
    q: str = Query(None),
    limit: int = Query(10, le=20),
    current_uid: str = Depends(get_current_uid)
):
    """
    Search for users by username or name.
    """
    if q is None or not q.strip():
        return JSONResponse(
            status_code=400,
            content={"error": True, "message": "Search query cannot be empty"}
        )
    
    query_str = q.strip()
    if len(query_str) < 2:
        return JSONResponse(
            status_code=400,
            content={"error": True, "message": "Search query must be at least 2 characters"}
        )

    q_escaped = re.escape(query_str)
    
    collection = await get_users_collection()
    
    # Query: $or on profile.username and profile.name, excluding current user
    # Note: Using profile.name as "display_name" as per model schema
    search_filter = {
        "$and": [
            {"_id": {"$ne": current_uid}},
            {
                "$or": [
                    {"profile.username": {"$regex": q_escaped, "$options": "i"}},
                    {"profile.name": {"$regex": q_escaped, "$options": "i"}}
                ]
            }
        ]
    }
    
    # Project specific fields as requested
    projection = {
        "_id": 1,
        "profile.username": 1,
        "profile.name": 1,
        "profile.avatar_url": 1,
        "profile.bio": 1,
        "profile.skills": 1
    }
    
    cursor = collection.find(search_filter, projection).limit(limit)
    
    users = []
    async for user in cursor:
        profile = user.get("profile", {})
        users.append({
            "firebase_uid": user["_id"],
            "username": profile.get("username", ""),
            "display_name": profile.get("name", ""),
            "avatar_url": profile.get("avatar_url"),
            "bio": profile.get("bio")
        })
        
    return {
        "users": users,
        "count": len(users),
        "query": query_str
    }


@router.get("/profile/{username}")
async def get_user_by_username(username: str, uid: str = Depends(get_current_uid)):
    """
    Fetch any user's profile by their username.
    
    Returns public user profile with sensitive data redacted.
    """
    try:
        user = await UserService.fetch_user_by_username(username)

        if not user:
            logger.warning("User handle not found", extra={"username": username})
            raise HTTPException(status_code=404, detail="User not found")

        return user

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to fetch user by handle", exc_info=True, extra={"username": username})
        raise HTTPException(status_code=500, detail="Failed to fetch user profile")


@router.get("/check-username/{username}")
async def check_username(username: str):
    """
    Check if a username is available.
    """
    try:
        available = await UserService.is_username_available(username)
        return {"available": available}
    except Exception as e:
        logger.error("Failed to check username", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to check username")


@router.get("/me")
async def get_current_user(uid: str = Depends(get_current_uid)):
    """
    Fetch authenticated user's profile.
    
    Returns user profile with sensitive data redacted.
    """
    try:
        user = await UserService.fetch_user_profile(uid)

        if not user:
            logger.warning("User not found", extra={"uid": uid})
            raise HTTPException(status_code=404, detail="User not found")

        return user

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to fetch user profile", exc_info=True, extra={"uid": uid})
        raise HTTPException(status_code=500, detail="Failed to fetch user profile")


@router.get("/me/github")
async def get_github_profile(uid: str = Depends(get_current_uid)):
    """
    Fetch fresh GitHub profile data for authenticated user.
    
    Retrieves real-time data from GitHub API without caching.
    """
    try:
        collection = await get_users_collection()
        user_doc = await collection.find_one(
            {"_id": uid},
            {"providers.github.access_token": 1},
        )

        if not user_doc:
            logger.warning("User not found", extra={"uid": uid})
            raise HTTPException(status_code=404, detail="User not found")

        github_info = user_doc.get("providers", {}).get("github", {})
        encrypted_token = github_info.get("access_token")

        if not encrypted_token:
            logger.info("GitHub not connected for user", extra={"uid": uid})
            return {
                "connected": False,
                "data": None,
            }

        # Decrypt and fetch fresh GitHub data
        plain_token = decrypt_token(encrypted_token)
        if not plain_token:
            logger.error("Failed to decrypt GitHub token", extra={"uid": uid})
            raise HTTPException(status_code=500, detail="Failed to decrypt GitHub token")

        github_data = await GitHubService.fetch_user_profile(plain_token)
 
        logger.info(
            "GitHub profile retrieved",
            extra={"uid": uid, "username": github_data.get("identity", {}).get("username")},
        )

        return {
            "connected": True,
            "data": github_data,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to fetch GitHub profile", exc_info=True, extra={"uid": uid})
        raise HTTPException(status_code=500, detail="Failed to fetch GitHub profile")


@router.post("/me/upload-avatar")
async def upload_user_avatar(
    file: UploadFile = File(...),
    uid: str = Depends(get_current_uid)
):
    """
    Upload user avatar to Cloudinary.
    
    Accepts image file, validates size (< 5MB) and type (JPEG/PNG),
    and returns the Cloudinary URL.
    """
    # 1. Validate file type
    if file.content_type not in ["image/jpeg", "image/png"]:
        raise HTTPException(status_code=400, detail="ONLY_JPEG_OR_PNG_ALLOWED")
    
    # 2. Validate file size (5MB = 5 * 1024 * 1024 bytes)
    MAX_SIZE = 5 * 1024 * 1024
    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="FILE_TOO_LARGE_MAX_5MB")
    
    # 3. Upload to Cloudinary
    # Reset file pointer to beginning for upload if needed, 
    # but since we already have content, we can pass it directly
    url = upload_image(content)
    
    if not url:
        raise HTTPException(status_code=500, detail="UPLOAD_FAILED")
    
    return {"url": url}
