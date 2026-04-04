import logging
import os
from cryptography.fernet import Fernet
from dotenv import load_dotenv

# [ ENCRYPTION CONFIG ] ────────────────────────────────────────────────────────
load_dotenv()
logger = logging.getLogger(__name__)

_enc_key = os.getenv("ENCRYPTION_KEY")
if not _enc_key:
    raise ValueError("FATAL ERROR: ENCRYPTION_KEY environment variable is not set!")

# Initialize the primary cryptographic cipher suite
cipher_suite = Fernet(_enc_key.encode())


# [ TOKEN SECURITY ] ──────────────────────────────────────────────────────────

def encrypt_token(plain_token: str) -> str:
    """Encrypts a plain text token."""
    if not plain_token:
        return ""
    encrypted = cipher_suite.encrypt(plain_token.encode())
    return encrypted.decode()


def decrypt_token(encrypted_token: str) -> str:
    """Decrypts an encrypted token string."""
    if not encrypted_token:
        return ""
    try:
        decrypted = cipher_suite.decrypt(encrypted_token.encode())
        return decrypted.decode()
    except Exception:
        logger.warning("⚠️ Failed to decrypt token", exc_info=True)
        return ""
