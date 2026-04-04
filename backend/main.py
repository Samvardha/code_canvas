import os
import logging
from dotenv import load_dotenv
from utils.firebase import initialize_firebase
from app_factory import create_fastapi_app, create_socket_app

# [ BOOTSTRAP SEQUENCE ] ───────────────────────────────────────────────────────
load_dotenv()

# Configure Global Signal Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
)

# 1. Initialize Federated Identity Provider
initialize_firebase()

# 2. Synchronize Networking Parameters
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "")
allowed_origins = [o.strip() for o in allowed_origins_env.split(",") if o.strip()] if allowed_origins_env.strip() else ["*"]


# [ APP INITIALIZATION ] ───────────────────────────────────────────────────────

# 3. Instantiate RESTful and Real-time Gateways
fastapi_app = create_fastapi_app(allowed_origins)
app, sio = create_socket_app(allowed_origins, fastapi_app)
