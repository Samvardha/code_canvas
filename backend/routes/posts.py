import json
import logging
from typing import List
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Query
from utils.auth import get_current_uid
from services.post import PostService
from models.post import PostCreateRequest, PostResponse, FeedResponse, Category
from utils.cloudinary_utils import upload_media

# [ CONFIGURATION & CONSTANTS ] ────────────────────────────────────────────────
logger = logging.getLogger(__name__)
router = APIRouter(prefix="/posts", tags=["posts"])

MAX_IMAGE_SIZE = 5 * 1024 * 1024
MAX_VIDEO_SIZE = 50 * 1024 * 1024
ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]
ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"]


# [ FEED OPERATIONS ] ─────────────────────────────────────────────────────────

@router.get("/feed/explore", response_model=FeedResponse)
async def get_explore_feed(
    offset: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=50),
    uid: str = Depends(get_current_uid)
):
    """
    Retrieve the global explore feed.
    
    - Returns latest posts from all categories.
    - Supported pagination via offset and limit.
    """
    return await PostService.fetch_feed(offset=offset, limit=limit, current_user_id=uid)


@router.get("/feed/collab", response_model=FeedResponse)
async def get_collab_feed(
    offset: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=50),
    uid: str = Depends(get_current_uid)
):
    """Get only 'collaboration' category posts."""
    return await PostService.fetch_feed(categories=[Category.COLLAB], offset=offset, limit=limit, current_user_id=uid)


@router.get("/feed/events", response_model=FeedResponse)
async def get_events_feed(
    offset: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=50),
    uid: str = Depends(get_current_uid)
):
    """Get only 'event' category posts."""
    return await PostService.fetch_feed(categories=[Category.EVENT], offset=offset, limit=limit, current_user_id=uid)


@router.get("/user/{userId}", response_model=FeedResponse)
async def get_user_posts(
    userId: str,
    offset: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=50),
    uid: str = Depends(get_current_uid)
):
    """Fetch all transmissions broadcasted by a specific peer."""
    return await PostService.fetch_feed(userId=userId, offset=offset, limit=limit, current_user_id=uid)


# [ SINGULAR POST OPERATIONS ] ────────────────────────────────────────────────

@router.post("", response_model=PostResponse)
async def create_post(
    data: str = Form(...),
    files: List[UploadFile] = File(None),
    uid: str = Depends(get_current_uid)
):
    """
    Create a new post with optional rich media.
    
    - Validates MIME types for images/videos.
    - Uploads media to Cloudinary CDN.
    - Requires valid Firebase UID via dependency.
    """
    try:
        # 1. Parse and validate JSON metadata
        try:
            json_data = json.loads(data)
            post_request = PostCreateRequest(**json_data)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid JSON data: {str(e)}")

        # 2. Process and synchronize media attachments
        media_items = []
        if files:
            for file in files:
                content_type = file.content_type
                
                # Check file type
                if content_type in ALLOWED_IMAGE_TYPES:
                    max_size = MAX_IMAGE_SIZE
                    res_type = "image"
                elif content_type in ALLOWED_VIDEO_TYPES:
                    max_size = MAX_VIDEO_SIZE
                    res_type = "video"
                else:
                    raise HTTPException(status_code=400, detail=f"Unsupported file type: {content_type}")
                
                # Check file size
                content = await file.read()
                if len(content) > max_size:
                    size_mb = max_size // (1024 * 1024)
                    raise HTTPException(status_code=400, detail=f"File {file.filename} too large. Max {size_mb}MB allowed for {res_type}.")
                
                # Upload to Cloudinary
                upload_res = upload_media(content, resource_type=res_type)
                if not upload_res:
                    raise HTTPException(status_code=500, detail=f"Failed to upload {file.filename}")
                
                media_items.append(upload_res)

        # 3. Finalize the database transaction
        post = await PostService.create_post(uid, post_request, media_items)
        return post

    except HTTPException:
        raise
    except Exception:
        logger.error("Failed to create post", exc_info=True, extra={"uid": uid})
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/{postId}", response_model=PostResponse)
async def get_single_post(postId: str, uid: str = Depends(get_current_uid)):
    """Retrieve a specific post by its Unique ID."""
    from bson.errors import InvalidId
    try:
        post = await PostService.fetch_post(postId, current_user_id=uid)
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")
        return post
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid post ID")


@router.patch("/{postId}", response_model=PostResponse)
async def update_post(
    postId: str,
    data: dict,
    uid: str = Depends(get_current_uid)
):
    """
    Update details of an existing post.
    
    - Authorization check: only authors can update.
    - Supports atomic removal of media IDs.
    """
    try:
        # Note: Handled author authorization in service layer
        removed_media = data.pop("removed_media_ids", [])
        
        post = await PostService.update_post(postId, uid, data, removed_media)
        if not post:
            raise HTTPException(status_code=404, detail="Post not found or unauthorized")
        return post
    except Exception as e:
        if str(e) == "Unauthorized":
            raise HTTPException(status_code=403, detail="You can only update your own posts")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{postId}")
async def delete_post(postId: str, uid: str = Depends(get_current_uid)):
    """Remove a post and its associated engagement data."""
    try:
        success = await PostService.delete_post(postId, uid)
        if not success:
            raise HTTPException(status_code=404, detail="Post not found")
        return {"success": True, "message": "Post deleted"}
    except Exception as e:
        if str(e) == "Unauthorized":
            raise HTTPException(status_code=403, detail="You can only delete your own posts")
        raise HTTPException(status_code=500, detail=str(e))


# [ SOCIAL ENGAGEMENT ] ───────────────────────────────────────────────────────

@router.post("/{postId}/like")
async def toggle_post_like(
    postId: str,
    uid: str = Depends(get_current_uid)
):
    """Toggle a peer's like status on a specific post."""
    try:
        result = await PostService.toggle_like(postId, uid)
        return {
            "success": True,
            **result
        }
    except Exception:
        logger.error(f"Failed to toggle like for post {postId}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")
