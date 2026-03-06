from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import firebase_admin
from firebase_admin import credentials, auth
import os

# ─── Firebase Admin SDK Init ───────────────────────────────────────
# Option 1: Service account JSON file (set GOOGLE_APPLICATION_CREDENTIALS env var)
# Option 2: Place a 'serviceAccountKey.json' in this directory
cred_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "serviceAccountKey.json")

if os.path.exists(cred_path):
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)
else:
    # Falls back to Application Default Credentials (works on GCP)
    firebase_admin.initialize_app()

# ─── FastAPI App ───────────────────────────────────────────────────
app = FastAPI(title="Code Canvas API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tighten this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TokenRequest(BaseModel):
    token: str


class TokenResponse(BaseModel):
    uid: str


@app.post("/verify-token", response_model=TokenResponse)
async def verify_token(request: TokenRequest):
    """Verify a Firebase ID token and return the user's UID."""
    try:
        decoded_token = auth.verify_id_token(request.token)
        uid = decoded_token["uid"]
        return TokenResponse(uid=uid)
    except auth.InvalidIdTokenError:
        raise HTTPException(status_code=401, detail="Invalid ID token")
    except auth.ExpiredIdTokenError:
        raise HTTPException(status_code=401, detail="Expired ID token")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token verification failed: {str(e)}")


@app.get("/health")
async def health():
    return {"status": "ok"}
