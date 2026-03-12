# Code Canvas

A creative coding workspace application featuring a Next.js frontend and a FastAPI backend, with a fully integrated Firebase Authentication system.

## 🚀 Features

- **Modern Tech Stack**: React 19, Next.js 16, Tailwind CSS v4, and FastAPI.
- **Robust Authentication**: Firebase Auth supporting Google, GitHub, and Email/Password sign-in.
- **Secure Architecture**: 
  - Frontend handles client-side auth and stores minimal user data (`{uid, email}`) in Firestore.
  - Backend securely verifies Firebase ID tokens using the Firebase Admin SDK.
- **Beautiful UI**: Custom shadcn-style dark glassmorphism design system using pure Tailwind CSS utility classes.

---

## 📁 Project Structure

This is a monorepo containing two main services:

```text
code_canvas/
├── frontend/             # Next.js Application
│   ├── app/              # App router (login, profile, layout)
│   ├── contexts/         # React Contexts (AuthContext)
│   ├── lib/              # Firebase initialization
│   └── public/           # Static assets
└── backend/              # FastAPI Application
    ├── main.py           # API endpoints & Token verification
    └── requirements.txt  # Python dependencies
```

---

## 🛠️ Setup & Installation

### Prerequisites
- Node.js (v20+)
- Python (v3.10+)
- A Firebase Project (with Firestore enabled)

### 1. Frontend Setup
```bash
cd frontend
npm install
```

**Environment Variables:**
Copy the template file to create your local config:
```bash
cp .env.example .env.local
```
Fill in `.env.local` with your Firebase Project settings (found in Firebase Console → Project Settings).

### 2. Backend Setup
```bash
cd backend
python -m venv venv

# Activate virtual environment
# On Windows:
.\venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
```

**Firebase Admin SDK:**
1. Generate a new private key from Firebase Console → Project Settings → Service Accounts.
2. Download the JSON file, rename it to `serviceAccountKey.json`, and place it in the `backend/` directory.

---

## 🏃‍♂️ Running the Apps

You will need two terminal windows to run both services simultaneously.

**Terminal 1 (Backend):**
```bash
cd backend
# Make sure your venv is activated
uvicorn main:app --reload
# Runs on http://localhost:8000
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
# Runs on http://localhost:3000
```

---

## 🔐 Authentication Flow

1. User clicks a sign-in button (Google, GitHub, or Email) on the Next.js frontend.
2. Firebase Authentication handles the secure pop-up or form submission.
3. Upon success, the frontend writes the user's `email` and `uid` to a Firestore `users/{uid}` document.
4. The frontend passes the Firebase ID token to the FastAPI backend (`POST /verify-token`).
5. The backend uses the Firebase Admin SDK to cryptographically verify the token and confirm the user's identity.

---

## 🛡️ Security Notes
- **Never commit `.env.local` or `serviceAccountKey.json`.** (These are already protected by the `.gitignore` files).
- The `frontend/.env.example` file is intentionally committed as a template for other developers.
