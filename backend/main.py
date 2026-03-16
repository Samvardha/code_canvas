import os
import logging

import firebase_admin
from firebase_admin import credentials
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from routes.auth import router as auth_router
from routes.users import router as users_router
from routes.peers import router as peers_router
from routes.posts import router as posts_router
from routes.health import router as health_router
from routes.ai import router as ai_router

load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
)

logger = logging.getLogger(__name__)

# Firebase Admin SDK Initialization
cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "serviceAccountKey.json")
if os.path.exists(cred_path):
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)
else:
    firebase_admin.initialize_app()

logger.info("Firebase Admin SDK initialized")

# FastAPI Application Setup
app = FastAPI(
    title="Tech Connect API",
    version="1.0.0",
    description="Backend API for Tech Connect platform",
)

@app.on_event("startup")
async def startup_event():
    from utils.database import ensure_indexes
    await ensure_indexes()

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Route Registration
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(peers_router)
app.include_router(posts_router)
app.include_router(health_router)
app.include_router(ai_router)

logger.info("All routes registered successfully")
