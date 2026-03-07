import os
from cryptography.fernet import Fernet
from dotenv import load_dotenv

load_dotenv()

_enc_key = os.getenv("ENCRYPTION_KEY")
if not _enc_key:
    raise ValueError("ENCRYPTION_KEY environment variable is not set!")

cipher_suite = Fernet(_enc_key.encode())


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
    except Exception as e:
        print(f"Failed to decrypt token: {e}")
        return ""
