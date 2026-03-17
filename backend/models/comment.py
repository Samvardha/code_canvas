from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from utils.serialization import COMMON_JSON_ENCODERS

class CommentContent(BaseModel):
    text: str

class CommentStats(BaseModel):
    likes_count: int = 0

class CommentCreateRequest(BaseModel):
    text: str

class CommentAuthor(BaseModel):
    firebase_uid: str
    username: Optional[str] = None
    name: Optional[str] = None
    avatar_url: Optional[str] = None

class CommentResponse(BaseModel):
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
