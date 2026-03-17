from pydantic import BaseModel, Field, model_validator
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from utils.serialization import COMMON_JSON_ENCODERS
from enum import Enum


class Category(str, Enum):
    COLLAB = "collab"
    EVENT = "event"


class Link(BaseModel):
    url: str
    title: Optional[str] = None


class MediaType(str, Enum):
    IMAGE = "image"
    VIDEO = "video"


class Media(BaseModel):
    type: MediaType
    url: str
    thumbnail_url: Optional[str] = None
    mime_type: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    duration_sec: Optional[float] = None
    public_id: Optional[str] = None
    bytes: Optional[int] = None


class Content(BaseModel):
    text: Optional[str] = None
    links: List[Link] = Field(default_factory=list)
    media: List[Media] = Field(default_factory=list)


class GitHubMeta(BaseModel):
    repo_url: Optional[str] = None
    repo_name: Optional[str] = None
    repo_owner: Optional[str] = None


class PostStatus(str, Enum):
    OPEN = "open"
    CLOSED = "closed"
    FILLED = "filled"


class CollabMeta(BaseModel):
    title: str
    looking_for: List[str] = Field(default_factory=list)
    requirements: List[str] = Field(default_factory=list)
    duration: Optional[int] = None
    status: PostStatus = PostStatus.OPEN


class EventMode(str, Enum):
    OFFLINE = "offline"
    ONLINE = "online"


class EventStatus(str, Enum):
    UPCOMING = "upcoming"
    ONGOING = "ongoing"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class Venue(BaseModel):
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None


class EventMeta(BaseModel):
    title: str
    description: Optional[str] = None
    venue: Optional[Venue] = None
    start_at: date
    end_at: Optional[date] = None
    rsvp_url: Optional[str] = None
    mode: EventMode
    status: EventStatus = EventStatus.UPCOMING


class PostStats(BaseModel):
    likes_count: int = 0
    comments_count: int = 0
    shares_count: int = 0


class PostCreateRequest(BaseModel):
    categories: List[Category] = Field(default_factory=list)
    content: Content
    github: Optional[GitHubMeta] = None
    collab_meta: Optional[CollabMeta] = None
    event_meta: Optional[EventMeta] = None

    @model_validator(mode="after")
    def validate_meta_requirements(self) -> "PostCreateRequest":
        # Check if collab is in categories but collab_meta is missing
        if Category.COLLAB in self.categories and not self.collab_meta:
            raise ValueError("collab_meta is required when 'collab' category is selected")
        
        # Check if event is in categories but event_meta is missing
        if Category.EVENT in self.categories and not self.event_meta:
            raise ValueError("event_meta is required when 'event' category is selected")
            
        # Optional: nullify meta if category not present (cleaner data)
        if Category.COLLAB not in self.categories:
            self.collab_meta = None
        if Category.EVENT not in self.categories:
            self.event_meta = None

        # Check if at least one meaningful content source exists
        has_content = (
            (self.content.text and self.content.text.strip()) or
            (self.content.links) or
            (self.content.media) or
            (self.github and self.github.repo_url) or
            (self.collab_meta) or
            (self.event_meta)
        )
        if not has_content:
            raise ValueError("Post must have at least some content (text, links, media, github, or meta)")

        return self


class PostResponse(BaseModel):
    id: str = Field(alias="_id")
    author_id: str
    author: Optional[Dict[str, Any]] = None 
    categories: List[Category]
    content: Content
    github: Optional[GitHubMeta] = None
    collab_meta: Optional[CollabMeta] = None
    event_meta: Optional[EventMeta] = None
    stats: PostStats
    is_liked: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True
        json_encoders = COMMON_JSON_ENCODERS


class FeedResponse(BaseModel):
    posts: List[PostResponse]
    total: int
    has_more: bool

    class Config:
        populate_by_name = True
        json_encoders = COMMON_JSON_ENCODERS
