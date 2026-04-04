import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from utils.auth import get_current_uid
from services.chat import ChatService

# [ CONFIGURATION & UTILS ] ──────────────────────────────────────────────────
logger = logging.getLogger(__name__)
router = APIRouter(prefix="/conversations", tags=["chat"])


# [ CONVERSATION OPERATIONS ] ────────────────────────────────────────────────

@router.post("/{targetUserId}")
async def start_or_get_conversation(
    targetUserId: str,
    current_uid: str = Depends(get_current_uid),
):
    """
    Establish a secure transmission channel with a peer.
    
    - Authorization check: users must be established peers.
    - Idempotent: returns existing conversation if already created.
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
    Retrieve a chronologically sorted list of transmission channels.
    
    - Sorted by most recently received/sent communication.
    - Supports cursor-based pagination for large inboxes.
    """
    conversations, next_cursor = await ChatService.get_conversations(
        current_uid, cursor=cursor, limit=limit
    )
    return {"conversations": conversations, "next_cursor": next_cursor}


# [ MESSAGE OPERATIONS ] ───────────────────────────────────────────────────────

@router.get("/{conversationId}/messages")
async def get_messages(
    conversationId: str,
    cursor: Optional[str] = Query(None),
    limit: int = Query(30, ge=1, le=100),
    current_uid: str = Depends(get_current_uid),
):
    """
    Fetch historical communication logs for a specific channel.
    
    - Validation: requesters must be participants of the conversation.
    - Supports scrolling history via cursor-based pagination.
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
