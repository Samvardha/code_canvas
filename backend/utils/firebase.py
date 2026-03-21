import os
import logging
import firebase_admin
from firebase_admin import credentials

logger = logging.getLogger(__name__)

def initialize_firebase():
    """Initialize Firebase Admin SDK."""
    if firebase_admin._apps:
        logger.info("Firebase Admin already initialized")
        return

    cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "serviceAccountKey.json")
    try:
        if os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
            logger.info("Firebase Admin SDK initialized with credentials from %s", cred_path)
        else:
            firebase_admin.initialize_app()
            logger.info("Firebase Admin SDK initialized with default credentials")
    except Exception as e:
        logger.error("Failed to initialize Firebase Admin SDK: %s", e)
        raise
