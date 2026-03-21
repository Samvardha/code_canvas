from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime
from enum import Enum


class MessageStatus(str, Enum):
    SENT = "sent"
    DELIVERED = "delivered"
    SEEN = "seen"


class MessageContent(BaseModel):
    text: str


class LastMessage(BaseModel):
    text: str
    sender_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Conversation(BaseModel):
    """Model for a conversation document."""
    participants: List[str]
    last_message: Optional[LastMessage] = None
    unread_counts: Dict[str, int] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class Message(BaseModel):
    """Model for a message document."""
    conversation_id: str
    sender_id: str
    content: MessageContent
    status: MessageStatus = MessageStatus.SENT
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ConversationResponse(BaseModel):
    id: str
    participants: List[str]
    last_message: Optional[LastMessage] = None
    unread_count: int = 0
    created_at: datetime
    updated_at: datetime


class ConversationListResponse(BaseModel):
    conversations: List[ConversationResponse]
    next_cursor: Optional[str] = None


class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    sender_id: str
    content: MessageContent
    status: MessageStatus
    created_at: datetime


class MessageListResponse(BaseModel):
    messages: List[MessageResponse]
    next_cursor: Optional[str] = None
