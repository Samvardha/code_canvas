from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum
from utils.serialization import COMMON_JSON_ENCODERS


class NotificationType(str, Enum):
    """Classification of notification trigger events."""
    LIKE = "like"
    COMMENT = "comment"
    COMMENT_LIKE = "comment_like"
    COMMENT_REPLY = "comment_reply"
    PEER_REQUEST = "peer_request"
    PEER_ACCEPT = "peer_accept"


class EntityType(str, Enum):
    """The type of resource that a notification references."""
    POST = "post"
    USER = "user"
    COMMENT = "comment"
    CONVERSATION = "conversation"


class NotificationEntity(BaseModel):
    """Reference to the entity (post, user, etc.) that triggered the notification."""
    id: str
    type: EntityType


class NotificationCreateRequest(BaseModel):
    """Input schema for the notification creation service."""
    recipient_id: str
    sender_id: str
    type: NotificationType
    entity: NotificationEntity


class NotificationResponse(BaseModel):
    """Single notification document sent to the frontend."""
    id: str = Field(alias="_id")
    recipient_id: str
    sender_id: str
    sender_username: str
    type: NotificationType
    entity: NotificationEntity
    is_read: bool = False
    created_at: datetime

    class Config:
        populate_by_name = True
        json_encoders = COMMON_JSON_ENCODERS


class NotificationListResponse(BaseModel):
    """Paginated list of notifications with cursor for infinite scroll."""
    notifications: List[NotificationResponse]
    next_cursor: Optional[str] = None

    class Config:
        populate_by_name = True
        json_encoders = COMMON_JSON_ENCODERS


class UnreadCountResponse(BaseModel):
    """Response model for the unread notification count."""
    unread_count: int
