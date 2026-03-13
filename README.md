# TechConnect — Developer Community Platform

A full-stack developer collaboration platform built with **Next.js 16** and **FastAPI**, featuring Firebase Authentication, GitHub integration, user search, and a dark brutalist-tech design system.

---

## 🚀 Features

- **Authentication** — Firebase Auth (Google, GitHub, Email/Password) with secure token verification via the Admin SDK
- **User Profiles** — Onboarding flow, avatar uploads (Cloudinary), skills, bio, and profile completion tracking
- **GitHub Integration** — OAuth linking, pinned repos, language stats, activity feed, and identity display
- **User Search** — Debounced, regex-based search with secure field projection and keyboard shortcut (⌘/Ctrl+K)
- **Public Profiles** — View any user's profile via `/profile/[username]` dynamic routes
- **Dark Brutalist UI** — Custom design system with accent borders, monospace typography, and Framer Motion animations

---

## 📁 Project Structure

```text
code_canvas/
├── backend/                    # FastAPI Application
│   ├── main.py                 # App setup, CORS, route registration
│   ├── models/
│   │   ├── auth.py             # Auth request/response models
│   │   └── user.py             # Profile, Stats, Providers, Settings models
│   ├── routes/
│   │   ├── auth.py             # Login, onboarding, session endpoints
│   │   ├── users.py            # Search, profile, avatar upload endpoints
│   │   └── health.py           # Health check with DB ping
│   ├── services/
│   │   ├── user.py             # User CRUD, profile completion, stats
│   │   └── github.py           # GitHub API integration & data aggregation
│   ├── utils/
│   │   ├── auth.py             # Firebase token verification dependency
│   │   ├── database.py         # MongoDB connection & indexes
│   │   ├── security.py         # Fernet encryption for OAuth tokens
│   │   └── cloudinary_utils.py # Image upload utility
│   ├── requirements.txt
│   ├── .env.example
│   └── .gitignore
│
└── frontend/                   # Next.js 16 Application (App Router)
    ├── app/
    │   ├── page.tsx            # Landing page
    │   ├── layout.tsx          # Root layout with fonts & providers
    │   ├── login/page.tsx      # Auth page (Google, GitHub, Email)
    │   ├── onboarding/page.tsx # Profile setup flow
    │   ├── feed/page.tsx       # Main feed with sidebar
    │   └── profile/
    │       ├── page.tsx        # Authenticated user's profile
    │       └── [username]/page.tsx  # Public profile view
    ├── components/             # Reusable UI components
    │   ├── TopNavbar.tsx       # Navigation bar with integrated search
    │   ├── NavbarWrapper.tsx   # Conditional navbar display
    │   ├── PostCard.tsx        # Feed post component
    │   └── ...                 # Landing page sections
    ├── contexts/
    │   └── AuthContext.tsx     # Firebase auth state & backend sync
    ├── lib/
    │   ├── firebase.ts         # Firebase client initialization
    │   ├── messages.ts         # Auth error message mapping
    │   └── api/users.ts        # User search API utility
    ├── package.json
    ├── .env.example
    └── .gitignore
```

---

## 🛠️ Setup & Installation

### Prerequisites
- **Node.js** v20+
- **Python** v3.10+
- A **Firebase** project (Auth enabled with Google & GitHub providers)
- A **MongoDB Atlas** cluster
- A **Cloudinary** account (for avatar uploads)

### 1. Backend

```bash
cd backend
python -m venv venv

# Activate virtual environment
# Windows:
.\venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
```

**Environment:**
```bash
cp .env.example .env
```
Fill in `.env` with your MongoDB URI, Fernet encryption key, and Cloudinary credentials.

**Firebase Admin SDK:**
1. Go to Firebase Console → Project Settings → Service Accounts
2. Generate a new private key
3. Save as `serviceAccountKey.json` in the `backend/` directory

### 2. Frontend

```bash
cd frontend
npm install
```

**Environment:**
```bash
cp .env.example .env.local
```
Fill in `.env.local` with your Firebase project config (found in Firebase Console → Project Settings → General).

---

## 🏃 Running Locally

Open **two terminals**:

**Terminal 1 — Backend** (http://localhost:8000):
```bash
cd backend
# Activate venv first
uvicorn main:app --reload
```

**Terminal 2 — Frontend** (http://localhost:3000):
```bash
cd frontend
npm run dev
```

---

## 🔐 Authentication Flow

1. User signs in via Google, GitHub, or Email on the frontend
2. Firebase handles authentication and returns an ID token
3. Frontend syncs the session with the backend (`POST /auth/session`)
4. Backend verifies the ID token using the Firebase Admin SDK
5. A user document is provisioned in MongoDB on first login
6. Subsequent API requests pass the ID token as a `Bearer` token in the `Authorization` header

---

## 🛡️ Security

- **Never commit** `.env`, `.env.local`, or `serviceAccountKey.json` — all covered by `.gitignore`
- GitHub OAuth tokens are **AES-encrypted** (Fernet) before storage in MongoDB
- User search results exclude sensitive fields (tokens, providers)
- The `.env.example` files are safe templates for other developers

---

## 📦 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React 19, Tailwind CSS v4, Framer Motion, Lucide Icons |
| Backend | FastAPI, Motor (async MongoDB), Firebase Admin SDK |
| Database | MongoDB Atlas |
| Auth | Firebase Authentication |
| Storage | Cloudinary (avatars) |
| Encryption | Fernet (cryptography) |
