import logging
import socketio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

# [ ROUTE IMPORTS ] ────────────────────────────────────────────────────────────
from routes.auth import router as auth_router
from routes.users import router as users_router
from routes.peers import router as peers_router
from routes.posts import router as posts_router
from routes.comments import router as comments_router
from routes.health import router as health_router
from routes.ai import router as ai_router
from routes.conversations import router as conversations_router
from routes.notifications import router as notifications_router
from routes.devices import router as devices_router

# [ SOCKET HANDLER IMPORTS ] ───────────────────────────────────────────────────
from socket_handlers.chat import register_chat_handlers
from socket_handlers.core import register_core_handlers

logger = logging.getLogger(__name__)


# [ LIFECYCLE OPERATIONS ] ─────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manage the application lifecycle and side-car dependencies.
    """
    from utils.database import ensure_indexes
    # 1. Synchronize database states
    await ensure_indexes()
    logger.info("Database indexes ensured")
    yield


# [ FASTAPI CONFIGURATION ] ────────────────────────────────────────────────────

def create_fastapi_app(allowed_origins: list) -> FastAPI:
    """
    Provision and configure the primary FastAPI interface.
    
    Logic Flow:
    1. Instantiation: Creates the core RESTful gateway.
    2. Security: Injects CORS policies for allowed network nodes.
    3. Routing: Mounts all module-specific API routers.
    """
    app = FastAPI(
        title="Tech Connect API",
        version="1.0.0",
        description="Backend API for Tech Connect platform",
        lifespan=lifespan,
    )

    # 2. CORS Middleware: Security parameters for cross-origin transmissions
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

    # 3. Comprehensive Router Mounting
    app.include_router(auth_router)
    app.include_router(users_router)
    app.include_router(peers_router)
    app.include_router(posts_router)
    app.include_router(comments_router)
    app.include_router(health_router)
    app.include_router(ai_router)
    app.include_router(conversations_router)
    app.include_router(notifications_router)
    app.include_router(devices_router)

    return app


# [ SOCKET.IO CONFIGURATION ] ──────────────────────────────────────────────────

def create_socket_app(allowed_origins: list, fastapi_app: FastAPI):
    """
    Provision the real-time Socket.IO server and combine with the FastAPI stack.
    """
    sio = socketio.AsyncServer(
        async_mode="asgi",
        cors_allowed_origins=allowed_origins if allowed_origins != ["*"] else "*",
        logger=False,
        engineio_logger=False,
    )

    # 1. Event Handler Registration
    register_core_handlers(sio)
    register_chat_handlers(sio)

    # 2. Inject Socket.IO reference into the notification service
    from services.notification import set_sio
    set_sio(sio)

    # 3. Inject Socket.IO reference into the push notification service
    from services.push_notifications import set_push_sio
    set_push_sio(sio)

    # 4. Combined Network Stack Generation
    combined_app = socketio.ASGIApp(sio, other_asgi_app=fastapi_app)
    return combined_app, sio
