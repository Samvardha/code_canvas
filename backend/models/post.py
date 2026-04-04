from pydantic import BaseModel, Field, model_validator
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from utils.serialization import COMMON_JSON_ENCODERS
from enum import Enum


class Category(str, Enum):
    """Broad classification for posts in the feed."""
    COLLAB = "collab"
    EVENT = "event"


class Link(BaseModel):
    """External URL shared within a post content block."""
    url: str
    title: Optional[str] = None


class MediaType(str, Enum):
    """Supported file types for post media attachments."""
    IMAGE = "image"
    VIDEO = "video"


class Media(BaseModel):
    """Rich media metadata (images/videos) associated with a post."""
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
    """Container for the primary text, links, and media of a post."""
    text: Optional[str] = None
    links: List[Link] = Field(default_factory=list)
    media: List[Media] = Field(default_factory=list)


class GitHubMeta(BaseModel):
    """Repository information for posts linking to GitHub projects."""
    repo_url: Optional[str] = None
    repo_name: Optional[str] = None
    repo_owner: Optional[str] = None


class PostStatus(str, Enum):
    """Operational status of a collaboration request."""
    OPEN = "open"
    CLOSED = "closed"
    FILLED = "filled"


class CollabMeta(BaseModel):
    """Specialized metadata for collaboration-focused posts."""
    title: str
    looking_for: List[str] = Field(default_factory=list)
    requirements: List[str] = Field(default_factory=list)
    duration: Optional[int] = None
    status: PostStatus = PostStatus.OPEN


class EventMode(str, Enum):
    """Specifies if an event is held physically or virtually."""
    OFFLINE = "offline"
    ONLINE = "online"


class EventStatus(str, Enum):
    """Lifecycle state of a scheduled event."""
    UPCOMING = "upcoming"
    ONGOING = "ongoing"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class Venue(BaseModel):
    """Physical location details for offline events."""
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None


class EventMeta(BaseModel):
    """Specialized metadata for event-focused posts."""
    title: str
    description: Optional[str] = None
    venue: Optional[Venue] = None
    start_at: date
    end_at: Optional[date] = None
    rsvp_url: Optional[str] = None
    mode: EventMode
    status: EventStatus = EventStatus.UPCOMING


class PostStats(BaseModel):
    """Engagement counters (likes, comments, etc.) for a post."""
    likes_count: int = 0
    comments_count: int = 0
    shares_count: int = 0


class PostCreateRequest(BaseModel):
    """Schema for validating incoming data when creating a new post."""
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
    """Full post data structure sent to the frontend UI."""
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
    """Paginated list of posts for various feed views."""
    posts: List[PostResponse]
    total: int
    has_more: bool

    class Config:
        populate_by_name = True
        json_encoders = COMMON_JSON_ENCODERS
