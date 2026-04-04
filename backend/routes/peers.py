import logging
from typing import List
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse

from utils.auth import get_current_uid
from services.peers import ConnectionService
from models.peers import (
    ConnectionStatusResponse,
    UserConnectionsResponse
)

# [ CONFIGURATION ] ────────────────────────────────────────────────────────────
logger = logging.getLogger(__name__)
router = APIRouter(prefix="/peers", tags=["peers"])


# [ PEER REQUEST OPERATIONS ] ──────────────────────────────────────────────────

@router.post("/request/{targetUserId}")
async def send_peer_request(
    targetUserId: str,
    current_uid: str = Depends(get_current_uid)
):
    """
    Initiate a peer connection request with another user.
    
    - Authorization: Requires valid Firebase UID.
    - Idempotency: Returns existing request if one is already pending.
    """
    success, message, ui_state, req_id = await ConnectionService.send_request(current_uid, targetUserId)
    
    if not success:
        return JSONResponse(
            status_code=400,
            content={"error": True, "message": message}
        )
    
    return {"message": message, "status": ui_state, "requestId": req_id}


@router.post("/accept/{requestId}")
async def accept_peer_request(
    requestId: str,
    current_uid: str = Depends(get_current_uid)
):
    """
    Approve a pending peer connection request.
    
    - Finalizes the bi-directional connection between peers.
    - Returns 403 if the user is not the intended recipient.
    """
    success, message = await ConnectionService.accept_request(requestId, current_uid)
    
    if not success:
        status_code = 404 if "not found" in message.lower() else 400
        if "Unauthorized" in message:
            status_code = 403
        raise HTTPException(status_code=status_code, detail=message)
        
    return {"message": message}


@router.post("/reject/{requestId}")
async def reject_peer_request(
    requestId: str,
    current_uid: str = Depends(get_current_uid)
):
    """
    Dismiss a pending peer request received by the current user.
    """
    success = await ConnectionService.reject_request(requestId, current_uid)
    
    if not success:
        raise HTTPException(status_code=404, detail="Request not found or unauthorized")

    return {"message": "Peer request rejected"}


@router.post("/cancel/{targetUserId}")
async def cancel_sent_request(
    targetUserId: str,
    current_uid: str = Depends(get_current_uid)
):
    """
    Retract a peer request previously sent by the current user.
    """
    success = await ConnectionService.cancel_request(current_uid, targetUserId)

    if not success:
        raise HTTPException(status_code=404, detail="Pending request not found")

    return {"message": "Peer request cancelled"}


# [ CONNECTION STATUS ] ────────────────────────────────────────────────────────

@router.get("/status/{targetUserId}", response_model=ConnectionStatusResponse)
async def get_peer_status(
    targetUserId: str,
    current_uid: str = Depends(get_current_uid)
):
    """Retrieve the current relationship status between two peers."""
    status, req_id = await ConnectionService.get_status(current_uid, targetUserId)
    return ConnectionStatusResponse(status=status, requestId=req_id)


@router.get("/{userId}", response_model=UserConnectionsResponse)
async def get_user_peers(
    userId: str,
    current_uid: str = Depends(get_current_uid)
):
    """
    Fetch a complete list of peer IDs for a specific user profile.
    
    - Used to build the peer network graph in the UI.
    """
    connections = await ConnectionService.get_connections(userId)
    return UserConnectionsResponse(userId=userId, connections=connections)


# [ PEER REMOVAL ] ─────────────────────────────────────────────────────────────

@router.delete("/{targetUserId}")
async def unpeer_user(
    targetUserId: str,
    current_uid: str = Depends(get_current_uid)
):
    """
    Terminate an established peer-to-peer connection.
    
    - Cleans up connection records for both users.
    - Does NOT delete shared chat history (archive only).
    """
    success = await ConnectionService.remove_peer(current_uid, targetUserId)
    
    if not success:
        raise HTTPException(status_code=404, detail="Peer connection not found")

    return {"message": "Peer removed successfully"}
