import re
import os
from typing import Optional
import logging
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Query
from fastapi.responses import JSONResponse
from utils.auth import get_current_uid
from services.user import UserService
from services.github import GitHubService
from utils.security import decrypt_token
from utils.database import get_users_collection
from utils.cloudinary_utils import upload_image

# [ CONFIGURATION & ROUTING ] ──────────────────────────────────────────────────
logger = logging.getLogger(__name__)
router = APIRouter(prefix="/users", tags=["users"])


# [ SEARCH & VALIDATION ] ──────────────────────────────────────────────────────

@router.get("/search")
async def search_users(
    q: str = Query(None),
    offset: int = Query(0, ge=0),
    limit: int = Query(10, le=50),
    current_uid: str = Depends(get_current_uid)
):
    """
    Search for users by username or name with pagination.
    
    - Filters out the current user from results.
    - Performs a case-insensitive regex search.
    - Returns total match count for frontend pagination.
    """
    # 1. Validate search query
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

    # 2. Prepare database filters
    q_escaped = re.escape(query_str)
    collection = await get_users_collection()
    
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
    
    projection = {
        "_id": 1,
        "profile.username": 1,
        "profile.name": 1,
        "profile.avatar_url": 1,
        "profile.bio": 1
    }
    
    # 3. Execute paginated query
    total_matches = await collection.count_documents(search_filter)
    cursor = collection.find(search_filter, projection).skip(offset).limit(limit)
    
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
        "total": total_matches,
        "has_more": offset + len(users) < total_matches,
        "query": query_str
    }


@router.get("/check-username/{username}")
async def check_username(username: str):
    """
    Check if a username handle is globally available.
    """
    try:
        available = await UserService.is_username_available(username)
        return {"available": available}
    except Exception:
        logger.error("Failed to check username availability", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to check username")


# [ PROFILE ACCESS ] ───────────────────────────────────────────────────────────

@router.get("/profile/{username}")
async def get_user_by_username(username: str, uid: str = Depends(get_current_uid)):
    """
    Fetch any user's public profile by their unique username handle.
    
    - Redacts sensitive information (emails, tokens).
    - Includes basic stats (follower/post counts).
    """
    try:
        user = await UserService.fetch_user_by_username(username)

        if not user:
            logger.warning("User handle not found", extra={"username": username})
            raise HTTPException(status_code=404, detail="User not found")

        return user

    except HTTPException:
        raise
    except Exception:
        logger.error("Failed to fetch user by handle", exc_info=True, extra={"username": username})
        raise HTTPException(status_code=500, detail="Failed to fetch user profile")


@router.get("/me")
async def get_current_user(uid: str = Depends(get_current_uid)):
    """
    Fetch the complete profile for the currently authenticated user.
    """
    try:
        user = await UserService.fetch_user_profile(uid)

        if not user:
            logger.warning("Authenticated user not found in DB", extra={"uid": uid})
            raise HTTPException(status_code=404, detail="User not found")

        return user

    except HTTPException:
        raise
    except Exception:
        logger.error("Failed to fetch current user profile", exc_info=True, extra={"uid": uid})
        raise HTTPException(status_code=500, detail="Failed to fetch user profile")


# [ MEDIA & UPLOADS ] ──────────────────────────────────────────────────────────

@router.post("/me/upload-avatar")
async def upload_user_avatar(
    file: UploadFile = File(...),
    uid: str = Depends(get_current_uid)
):
    """
    Upload a new profile picture to Cloudinary.
    
    - Validates MIME types (JPEG/PNG only).
    - Enforces 5MB file size limit.
    - Returns the hosted CDN URL.
    """
    # 1. Validate file type
    if file.content_type not in ["image/jpeg", "image/png"]:
        raise HTTPException(status_code=400, detail="ONLY_JPEG_OR_PNG_ALLOWED")
    
    # 2. Validate file size (5MB)
    MAX_SIZE = 5 * 1024 * 1024
    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="FILE_TOO_LARGE_MAX_5MB")
    
    # 3. Securely upload to Cloudinary
    url = upload_image(content)
    
    if not url:
        raise HTTPException(status_code=500, detail="CDN_UPLOAD_FAILED")
    
    return {"url": url}


# [ GITHUB INTEGRATION ] ───────────────────────────────────────────────────────

@router.get("/profile/{username}/github")
async def get_public_github_profile(
    username: str, 
    page: int = Query(1, ge=1),
    per_page: int = Query(9, ge=1, le=100),
    uid: str = Depends(get_current_uid)
):
    """
    Fetch public GitHub profile data for any peer.
    
    - Uses a tiered token system (Requester Token > System Token > Public) for rate limits.
    - Returns repository lists and account overview.
    """
    try:
        # 1. Identify target GitHub handle
        user_doc = await UserService.fetch_user_by_username(username)
        if not user_doc:
            raise HTTPException(status_code=404, detail="User not found")

        github_info = user_doc.get("providers", {}).get("github", {})
        github_username = github_info.get("username")

        if not github_username or not github_info.get("linked"):
            return {
                "connected": False,
                "data": None,
            }

        # 2. Extract requester's token to avoid system rate-limiting
        collection = await get_users_collection()
        requester_doc = await collection.find_one(
            {"_id": uid},
            {"providers.github.access_token": 1}
        )
        
        access_token = None
        if requester_doc:
            encrypted_token = requester_doc.get("providers", {}).get("github", {}).get("access_token")
            if encrypted_token:
                access_token = decrypt_token(encrypted_token)

        # 3. Fallback to server-side system token
        if not access_token:
            encrypted_system_token = os.getenv("GITHUB_TOKEN")
            if encrypted_system_token:
                access_token = decrypt_token(encrypted_system_token)

        # 4. Proxy request to GitHub APIs
        github_data = await GitHubService.fetch_public_profile(
            github_username, 
            page=page, 
            per_page=per_page,
            access_token=access_token
        )

        return {
            "connected": True,
            "data": github_data,
        }

    except HTTPException:
        raise
    except Exception:
        logger.error("GitHub public profile fetch failed", exc_info=True, extra={"username": username})
        raise HTTPException(status_code=500, detail="Failed to fetch public GitHub profile")


@router.get("/me/github")
async def get_github_profile(
    page: int = Query(1, ge=1),
    per_page: int = Query(9, ge=1, le=100),
    repos: Optional[str] = Query(None),
    uid: str = Depends(get_current_uid)
):
    """
    Fetch fresh GitHub data or repositories for the authenticated user.
    """
    try:
        # 1. Verify user's GitHub link status
        collection = await get_users_collection()
        user_doc = await collection.find_one(
            {"_id": uid},
            {"providers.github.access_token": 1},
        )

        if not user_doc:
            raise HTTPException(status_code=404, detail="User records missing")

        github_info = user_doc.get("providers", {}).get("github", {})
        encrypted_token = github_info.get("access_token")

        if not encrypted_token:
            if repos is not None:
                return {"repos": [], "has_more": False}
            return {"connected": False, "data": None}

        # 2. Decrypt PII (Tokens)
        plain_token = decrypt_token(encrypted_token)
        if not plain_token:
            logger.error("Token decryption failed", extra={"uid": uid})
            raise HTTPException(status_code=500, detail="Token processing error")

        # 3. Execute selective GitHub API call
        repos_only = repos is not None
        github_data = await GitHubService.fetch_user_profile(
            plain_token, 
            page=page, 
            per_page=per_page,
            repos_only=repos_only
        )

        if repos_only:
            return github_data

        return {
            "connected": True,
            "data": github_data,
        }

    except HTTPException:
        raise
    except Exception:
        logger.error("GitHub private data fetch failed", exc_info=True, extra={"uid": uid})
        raise HTTPException(status_code=500, detail="Internal GitHub sync error")
