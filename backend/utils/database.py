import os
import motor.motor_asyncio
from dotenv import load_dotenv

# [ ORCHESTRATION ] ────────────────────────────────────────────────────────────
load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
if not MONGO_URI:
    raise ValueError("FATAL ERROR: MONGO_URI environment variable is not set!")

client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI)
db = client.get_database("techconnect")


# [ COLLECTIONS ] ─────────────────────────────────────────────────────────────

async def get_users_collection():
    """Access point for Global User Identity records."""
    return db.get_collection("users")


async def get_peer_requests_collection():
    """Access point for PENDING Connection Requests."""
    return db.get_collection("peer_requests")


async def get_peers_collection():
    """Access point for ESTABLISHED Peer-to-Peer links."""
    return db.get_collection("peers")


async def get_posts_collection():
    """Access point for Global Post Transmissions."""
    return db.get_collection("posts")


async def get_post_likes_collection():
    """Access point for Post Engagement (Likes)."""
    return db.get_collection("post_likes")


async def get_comments_collection():
    """Access point for Threaded Comment Nodes."""
    return db.get_collection("comments")


async def get_comment_likes_collection():
    """Access point for Comment Engagement (Likes)."""
    return db.get_collection("comment_likes")


async def get_conversations_collection():
    """Access point for Private Transmission Channels."""
    return db.get_collection("conversations")


async def get_messages_collection():
    """Access point for Granular Message Logs."""
    return db.get_collection("messages")


# [ INDEXING CORE ] ───────────────────────────────────────────────────────────

async def ensure_indexes():
    """
    Synchronize database indexes to ensure performant query execution.
    
    Logic Flow:
    1. Identity: Enforce unique handles and background search indexes.
    2. Networking: Optimize peer discovery and status checks.
    3. Feed: Background indexing for chronological feed retrieval.
    4. Chat: Cursor-based performance for high-volume logs.
    """
    try:
        # 1. User Identity Indexes
        users = await get_users_collection()
        await users.create_index(
            "profile.username",
            unique=True,
            partialFilterExpression={"profile.username": {"$gt": ""}},
            background=True
        )
        await users.create_index("profile.name", background=True)

        # 2. Peer & Connection Indexes
        peer_reqs = await get_peer_requests_collection()
        await peer_reqs.create_index([("sender_id", 1), ("receiver_id", 1)], unique=True, background=True)
        await peer_reqs.create_index("receiver_id", background=True)

        peers = await get_peers_collection()
        try:
            await peers.drop_index("users_1")
        except Exception:
            pass
        await peers.create_index("users", background=True)

        # 3. Post Feed & Engagement Indexes
        posts = await get_posts_collection()
        await posts.create_index("created_at", background=True)
        await posts.create_index([("categories", 1), ("created_at", -1)], background=True)
        await posts.create_index([("author_id", 1), ("created_at", -1)], background=True)
        await posts.create_index("collab_meta.status", background=True)
        await posts.create_index("event_meta.start_at", background=True)

        post_likes = await get_post_likes_collection()
        await post_likes.create_index([("post_id", 1), ("user_id", 1)], unique=True, background=True)

        # 4. Threading & Social Indexes
        comments = await get_comments_collection()
        await comments.create_index([("post_id", 1), ("created_at", -1)], background=True)
        await comments.create_index("parent_comment_id", background=True)

        comment_likes = await get_comment_likes_collection()
        await comment_likes.create_index([("comment_id", 1), ("user_id", 1)], unique=True, background=True)

        # 5. Transmission Channel Indexes
        conversations = await get_conversations_collection()
        try:
            await conversations.drop_index("participants_1")
        except Exception:
            pass
        await conversations.create_index("participants", background=True)
        await conversations.create_index([("updated_at", -1)], background=True)
        await conversations.create_index([("participants", 1), ("updated_at", -1), ("_id", -1)], background=True)

        messages = await get_messages_collection()
        await messages.create_index([("conversation_id", 1), ("created_at", -1), ("_id", -1)], background=True)

        print("Successfully ensured database indexes.")
    except Exception as e:
        print(f"Failed to ensure indexes: {e}")
