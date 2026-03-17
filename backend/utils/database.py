import os
import motor.motor_asyncio
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")

if not MONGO_URI:
    raise ValueError("MONGO_URI environment variable is not set!")

client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI)
db = client.get_database("techconnect")



async def get_users_collection():
    """Dependency to get the MongoDB users collection."""
    return db.get_collection("users")


async def get_peer_requests_collection():
    """Dependency to get the peer_requests collection."""
    return db.get_collection("peer_requests")


async def get_peers_collection():
    """Dependency to get the peers collection."""
    return db.get_collection("peers")


async def get_posts_collection():
    """Dependency to get the MongoDB posts collection."""
    return db.get_collection("posts")


async def get_post_likes_collection():
    """Dependency to get the MongoDB post_likes collection."""
    return db.get_collection("post_likes")


async def get_comments_collection():
    """Dependency to get the MongoDB comments collection."""
    return db.get_collection("comments")


async def get_comment_likes_collection():
    """Dependency to get the MongoDB comment_likes collection."""
    return db.get_collection("comment_likes")


async def ensure_indexes():
    """Create necessary database indexes."""
    try:
        users = await get_users_collection()
        # Create unique index on username
        await users.create_index(
            "profile.username",
            unique=True,
            partialFilterExpression={"profile.username": {"$gt": ""}},
            background=True
        )
        await users.create_index("profile.name", background=True)

        # Indexes for peer_requests
        peer_reqs = await get_peer_requests_collection()
        await peer_reqs.create_index([("sender_id", 1), ("receiver_id", 1)], unique=True, background=True)
        await peer_reqs.create_index("receiver_id", background=True)

        # Indexes for peers
        peers = await get_peers_collection()
        try:
            await peers.drop_index("users_1")
        except Exception:
            pass
        await peers.create_index("users", background=True)

        # Indexes for posts
        posts = await get_posts_collection()
        await posts.create_index("created_at", background=True)
        await posts.create_index([("categories", 1), ("created_at", -1)], background=True)
        await posts.create_index([("author_id", 1), ("created_at", -1)], background=True)
        await posts.create_index("collab_meta.status", background=True)
        await posts.create_index("event_meta.start_at", background=True)

        # Indexes for post_likes
        post_likes = await get_post_likes_collection()
        await post_likes.create_index([("post_id", 1), ("user_id", 1)], unique=True, background=True)

        # Indexes for comments
        comments = await get_comments_collection()
        await comments.create_index([("post_id", 1), ("created_at", -1)], background=True)
        await comments.create_index("parent_comment_id", background=True)

        # Indexes for comment_likes
        comment_likes = await get_comment_likes_collection()
        await comment_likes.create_index([("comment_id", 1), ("user_id", 1)], unique=True, background=True)

        print("Successfully ensured database indexes.")
    except Exception as e:
        print(f"Failed to ensure indexes: {e}")
