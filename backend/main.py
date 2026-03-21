import os
import logging
from dotenv import load_dotenv
from utils.firebase import initialize_firebase
from app_factory import create_fastapi_app, create_socket_app

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
)

# Initialize Firebase
initialize_firebase()

# Configure Allowed Origins
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "")
allowed_origins = [o.strip() for o in allowed_origins_env.split(",") if o.strip()] if allowed_origins_env.strip() else ["*"]

# Create Applications
fastapi_app = create_fastapi_app(allowed_origins)
app, sio = create_socket_app(allowed_origins, fastapi_app)
