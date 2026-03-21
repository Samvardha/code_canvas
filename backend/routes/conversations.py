import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from utils.auth import get_current_uid
from services.chat import ChatService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/conversations", tags=["chat"])


@router.post("/{targetUserId}")
async def start_or_get_conversation(
    targetUserId: str,
    current_uid: str = Depends(get_current_uid),
):
    """
    Start a new conversation with a peer or retrieve existing one.
    Returns 403 if the users are not peers.
    """
    success, message, conv = await ChatService.start_or_get_conversation(
        current_uid, targetUserId
    )

    if not success:
        status = 400
        if "peers" in message.lower():
            status = 403
        raise HTTPException(status_code=status, detail=message)

    return {"conversation": conv}



@router.get("")
async def get_conversations(
    cursor: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=50),
    current_uid: str = Depends(get_current_uid),
):
    """
    Paginated list of conversations for the current user,
    sorted by most recently updated.
    """
    conversations, next_cursor = await ChatService.get_conversations(
        current_uid, cursor=cursor, limit=limit
    )
    return {"conversations": conversations, "next_cursor": next_cursor}


@router.get("/{conversationId}/messages")
async def get_messages(
    conversationId: str,
    cursor: Optional[str] = Query(None),
    limit: int = Query(30, ge=1, le=100),
    current_uid: str = Depends(get_current_uid),
):
    """
    Paginated messages for a conversation.
    User must be a participant.
    """
    success, msg, messages, next_cursor = await ChatService.get_messages(
        current_uid, conversationId, cursor=cursor, limit=limit
    )

    if not success:
        status = 400
        if "not found" in msg.lower():
            status = 404
        if "not a participant" in msg.lower():
            status = 403
        raise HTTPException(status_code=status, detail=msg)

    return {"messages": messages, "next_cursor": next_cursor}
