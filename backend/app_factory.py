import logging
import socketio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from routes.auth import router as auth_router
from routes.users import router as users_router
from routes.peers import router as peers_router
from routes.posts import router as posts_router
from routes.comments import router as comments_router
from routes.health import router as health_router
from routes.ai import router as ai_router
from routes.conversations import router as conversations_router

from socket_handlers.chat import register_chat_handlers
from socket_handlers.core import register_core_handlers

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle events for the FastAPI application."""
    from utils.database import ensure_indexes
    await ensure_indexes()
    logger.info("Database indexes ensured")
    yield

def create_fastapi_app(allowed_origins: list) -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title="Tech Connect API",
        version="1.0.0",
        description="Backend API for Tech Connect platform",
        lifespan=lifespan,
    )

    # CORS Middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Root route
    @app.get("/")
    async def root():
        """Root endpoint."""
        return {"message": "Welcome to Tech Connect API", "status": "online"}

    # Route Registration
    app.include_router(auth_router)
    app.include_router(users_router)
    app.include_router(peers_router)
    app.include_router(posts_router)
    app.include_router(comments_router)
    app.include_router(health_router)
    app.include_router(ai_router)
    app.include_router(conversations_router)

    return app

def create_socket_app(allowed_origins: list, fastapi_app: FastAPI):
    """Create and configure the Socket.IO server and combined ASGI application."""
    sio = socketio.AsyncServer(
        async_mode="asgi",
        cors_allowed_origins=allowed_origins if allowed_origins != ["*"] else "*",
        logger=False,
        engineio_logger=False,
    )

    # Socket.IO Handlers Registration
    register_core_handlers(sio)
    register_chat_handlers(sio)

    combined_app = socketio.ASGIApp(sio, other_asgi_app=fastapi_app)
    return combined_app, sio
