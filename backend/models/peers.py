from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from enum import Enum


class ConnectionStatus(str, Enum):
    ADD = "add"
    PENDING = "pending"
    ACCEPT = "accept"
    CONNECTED = "connected"
    SELF = "self"


class PeerRequest(BaseModel):
    """Model for a peer request document."""
    sender_id: str
    receiver_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Peer(BaseModel):
    """Model for an established peer connection document."""
    users: List[str]
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ConnectionStatusResponse(BaseModel):
    """Response model for connection status check."""
    status: ConnectionStatus
    requestId: Optional[str] = None


class UserConnectionsResponse(BaseModel):
    """Response model for listing user connections."""
    userId: str
    connections: List[str]
