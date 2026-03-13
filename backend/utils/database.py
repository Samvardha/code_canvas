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


async def ensure_indexes():
    """Create necessary database indexes."""
    try:
        users = await get_users_collection()
        # Create unique index on username
        # We use background=True to not block the server if it's already running
        await users.create_index(
            "profile.username",
            unique=True,
            partialFilterExpression={"profile.username": {"$gt": ""}},
            background=True
        )
        # Added ascending index on profile.name for efficient search
        await users.create_index("profile.name", background=True)
        print("Successfully ensured database indexes.")
    except Exception as e:
        print(f"Failed to ensure indexes: {e}")
