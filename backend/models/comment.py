from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from utils.serialization import COMMON_JSON_ENCODERS

class CommentContent(BaseModel):
    """The textual content of a peer's comment."""
    text: str

class CommentStats(BaseModel):
    """Engagement metrics specifically for comments."""
    likes_count: int = 0

class CommentCreateRequest(BaseModel):
    """Schema for incoming data to create a new comment or reply."""
    text: str

class CommentAuthor(BaseModel):
    """Simplified profile data of the user who authored the comment."""
    firebase_uid: str
    username: Optional[str] = None
    name: Optional[str] = None
    avatar_url: Optional[str] = None

class CommentResponse(BaseModel):
    """Detailed comment data structure, including nested replies and metadata."""
    id: str = Field(alias="_id")
    post_id: str
    author_id: str
    author: Optional[CommentAuthor] = None
    content: CommentContent
    parent_comment_id: Optional[str] = None
    stats: CommentStats
    is_liked: bool = False
    replies: List["CommentResponse"] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True
        json_encoders = COMMON_JSON_ENCODERS

CommentResponse.model_rebuild()
