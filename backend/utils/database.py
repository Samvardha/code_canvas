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
