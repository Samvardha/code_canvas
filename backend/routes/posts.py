import json
import logging
from typing import List
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Query

from utils.auth import get_current_uid
from services.post import PostService
from models.post import PostCreateRequest, PostResponse, FeedResponse, Category
from utils.cloudinary_utils import upload_media


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/posts", tags=["posts"])

# Constants for file validation
MAX_IMAGE_SIZE = 5 * 1024 * 1024
MAX_VIDEO_SIZE = 50 * 1024 * 1024
ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]
ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"] # mov is video/quicktime

@router.post("", response_model=PostResponse)
async def create_post(
    data: str = Form(...),  # JSON string containing PostCreateRequest
    files: List[UploadFile] = File(None),
    uid: str = Depends(get_current_uid)
):
    """
    Create a new post with optional media.
    The 'data' field should be a JSON string matching PostCreateRequest.
    """
    try:
        # 1. Parse and validate JSON data
        try:
            json_data = json.loads(data)
            post_request = PostCreateRequest(**json_data)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid JSON data: {str(e)}")

        # 2. Process and validate files
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

        # 3. Create post in database
        post = await PostService.create_post(uid, post_request, media_items)
        
        return post

    except HTTPException:
        raise
    except Exception:
        logger.error("Failed to create post", exc_info=True, extra={"uid": uid})
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/feed/explore", response_model=FeedResponse)
async def get_explore_feed(
    offset: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=50),
    uid: str = Depends(get_current_uid)
):
    """Get all posts, latest first."""
    return await PostService.fetch_feed(offset=offset, limit=limit, current_user_id=uid)


@router.get("/feed/collab", response_model=FeedResponse)
async def get_collab_feed(
    offset: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=50),
    uid: str = Depends(get_current_uid)
):
    """Get only collab posts."""
    return await PostService.fetch_feed(categories=[Category.COLLAB], offset=offset, limit=limit, current_user_id=uid)


@router.get("/feed/events", response_model=FeedResponse)
async def get_events_feed(
    offset: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=50),
    uid: str = Depends(get_current_uid)
):
    """Get only event posts."""
    return await PostService.fetch_feed(categories=[Category.EVENT], offset=offset, limit=limit, current_user_id=uid)


@router.get("/user/{userId}", response_model=FeedResponse)
async def get_user_posts(
    userId: str,
    offset: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=50),
    uid: str = Depends(get_current_uid)
):
    """Get posts by a specific user."""
    return await PostService.fetch_feed(userId=userId, offset=offset, limit=limit, current_user_id=uid)


@router.get("/{postId}", response_model=PostResponse)
async def get_single_post(postId: str, uid: str = Depends(get_current_uid)):
    """Get a single post by ID."""
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
    data: dict,  # Simple JSON body for updates
    uid: str = Depends(get_current_uid)
):
    """Update post details."""
    try:
        # Note: In a real app, you might want to handle media changes here too.
        # But per requirements, we'll keep it robust but not overengineered.
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
    """Delete a post."""
    try:
        success = await PostService.delete_post(postId, uid)
        if not success:
            raise HTTPException(status_code=404, detail="Post not found")
        return {"success": True, "message": "Post deleted"}
    except Exception as e:
        if str(e) == "Unauthorized":
            raise HTTPException(status_code=403, detail="You can only delete your own posts")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{postId}/like")
async def toggle_post_like(
    postId: str,
    uid: str = Depends(get_current_uid)
):
    """Toggle like on a post."""
    try:
        result = await PostService.toggle_like(postId, uid)
        return {
            "success": True,
            **result
        }
    except Exception:
        logger.error(f"Failed to toggle like for post {postId}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")
