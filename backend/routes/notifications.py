import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from utils.auth import get_current_uid
from services.notification import NotificationService
from models.notification import (
    NotificationListResponse,
    UnreadCountResponse
)

# [ CONFIGURATION ] ────────────────────────────────────────────────────────────
logger = logging.getLogger(__name__)
router = APIRouter(prefix="/notifications", tags=["notifications"])


# [ RETRIEVAL OPERATIONS ] ─────────────────────────────────────────────────────

@router.get("", response_model=NotificationListResponse)
async def get_notifications(
    cursor: Optional[str] = Query(None, description="ISO timestamp cursor for pagination"),
    limit: int = Query(20, ge=1, le=50, description="Number of notifications per page"),
    uid: str = Depends(get_current_uid)
):
    """
    Fetch paginated notifications for the authenticated user.
    
    - Cursor-based pagination using created_at timestamps.
    - Returns newest notifications first.
    """
    try:
        result = await NotificationService.get_notifications(uid, cursor=cursor, limit=limit)
        return result
    except Exception:
        logger.error("Failed to fetch notifications", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/unread-count", response_model=UnreadCountResponse)
async def get_unread_count(
    uid: str = Depends(get_current_uid)
):
    """Retrieve the total count of unread notifications for the current user."""
    try:
        count = await NotificationService.get_unread_count(uid)
        return {"unread_count": count}
    except Exception:
        logger.error("Failed to fetch unread count", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


# [ STATE MANAGEMENT ] ─────────────────────────────────────────────────────────

@router.patch("/{notificationId}/read")
async def mark_notification_read(
    notificationId: str,
    uid: str = Depends(get_current_uid)
):
    """
    Mark a single notification as read.
    
    - Validates ownership: users can only mark their own notifications.
    """
    try:
        success = await NotificationService.mark_as_read(notificationId, uid)
        if not success:
            raise HTTPException(status_code=404, detail="Notification not found or already read")
        return {"success": True, "message": "Notification marked as read"}
    except HTTPException:
        raise
    except Exception:
        logger.error(f"Failed to mark notification {notificationId} as read", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.patch("/read-all")
async def mark_all_notifications_read(
    uid: str = Depends(get_current_uid)
):
    """Mark all unread notifications as read for the current user."""
    try:
        updated_count = await NotificationService.mark_all_as_read(uid)
        return {"success": True, "message": f"Marked {updated_count} notifications as read"}
    except Exception:
        logger.error("Failed to mark all notifications as read", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")
