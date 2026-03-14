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
        await peers.create_index("users", unique=True, background=True)

        print("Successfully ensured database indexes.")
    except Exception as e:
        print(f"Failed to ensure indexes: {e}")
