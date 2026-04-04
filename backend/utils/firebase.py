import os
import logging
import firebase_admin
from firebase_admin import credentials

# [ FIREBASE CONFIGURATION ] ───────────────────────────────────────────────────
logger = logging.getLogger(__name__)


def initialize_firebase():
    """
    Initialize the Firebase Admin SDK for identity orchestration.
    
    Logic Flow:
    1. Singleton Check: Prevents redundant initializations.
    2. Credential Lookup: Searches for serviceAccountKey.json or env variables.
    3. Bootstrapping: Connects to the Cloud Identity provider.
    """
    # 1. Singleton Check
    if firebase_admin._apps:
        logger.info("Firebase Admin already initialized")
        return

    # 2. Credential Discovery
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
