import logging
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends
from utils.auth import get_current_uid
from services.comment import CommentService
from models.comment import CommentCreateRequest, CommentResponse

logger = logging.getLogger(__name__)

router = APIRouter(tags=["comments"])

@router.post("/posts/{postId}/comments", response_model=CommentResponse)
async def add_post_comment(
    postId: str,
    data: CommentCreateRequest,
    uid: str = Depends(get_current_uid)
):
    """Add a top-level comment to a post."""
    try:
        comment = await CommentService.add_comment(postId, uid, data)
        return comment
    except Exception:
        logger.error(f"Failed to add comment to post {postId}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/posts/{postId}/comments", response_model=List[CommentResponse])
async def get_post_comments(
    postId: str,
    uid: Optional[str] = Depends(get_current_uid) # Optional for viewing
):
    """Fetch comments for a post."""
    try:
        return await CommentService.fetch_comments(postId, uid)
    except Exception:
        logger.error(f"Failed to fetch comments for post {postId}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/comments/{commentId}/reply", response_model=CommentResponse)
async def reply_to_comment(
    commentId: str,
    data: CommentCreateRequest,
    uid: str = Depends(get_current_uid)
):
    """Reply to a specific comment."""
    from bson import ObjectId
    from utils.database import get_comments_collection
    try:
        comments_col = await get_comments_collection()
        parent = await comments_col.find_one({"_id": ObjectId(commentId)})
        if not parent:
            raise HTTPException(status_code=404, detail="Parent comment not found")
        
        reply = await CommentService.add_comment(str(parent["post_id"]), uid, data, parent_comment_id=commentId)
        return reply
    except HTTPException:
        raise
    except Exception:
        logger.error(f"Failed to reply to comment {commentId}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

@router.delete("/comments/{commentId}")
async def delete_comment(
    commentId: str,
    uid: str = Depends(get_current_uid)
):
    """Delete a comment (cascade)."""
    try:
        success = await CommentService.delete_comment(commentId, uid)
        if not success:
            raise HTTPException(status_code=404, detail="Comment not found")
        return {"success": True, "message": "Comment and its replies deleted"}
    except Exception as e:
        if str(e) == "Unauthorized":
            raise HTTPException(status_code=403, detail="You can only delete your own comments")
        logger.error(f"Failed to delete comment {commentId}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/comments/{commentId}/like")
async def toggle_comment_like(
    commentId: str,
    uid: str = Depends(get_current_uid)
):
    """Toggle like on a comment."""
    try:
        result = await CommentService.toggle_like(commentId, uid)
        return {
            "success": True,
            **result
        }
    except Exception:
        logger.error(f"Failed to toggle like for comment {commentId}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")
