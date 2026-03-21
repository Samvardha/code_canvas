# Tech Connect — Developer Community Platform

A full-stack developer collaboration platform built with **Next.js 16** and **FastAPI**, featuring Firebase Authentication, GitHub integration, user search, and a dark brutalist-tech design system.

---

## 🚀 Features

- **Authentication** — Firebase Auth (Google, GitHub, Email/Password) with secure token verification via the Admin SDK
- **Real-Time Chat** — Socket.IO powered direct messaging, routing integration, and a dedicated `ChatDrawer` with optimistic UI
- **User Profiles** — Onboarding flow, refined avatar uploads (preview & manual confirm via Cloudinary), skills, bio, and progress tracking
- **GitHub Integration** — OAuth linking, pinned repos, language stats, active feed, AES-encrypted token storage with system fallback
- **User Search** — Debounced, regex-based paginated search with infinite scroll and keyboard shortcut (⌘/Ctrl+K)
- **Public Profiles** — View any user's profile via `/profile/[username]` dynamic routes
- **Posts & Feed** — Dedicated post creation page, markdown support, media attachments. Infinite scroll feeds for `collab`, `event`, and `explore`
- **Post Interactions** — Like/unlike posts with real-time count updates and optimistic UI rendering
- **Comments & Replies** — Integrated node-based UI with clear thread visuals, nesting, auto-capitalization, and responsive side actions
- **Comment Interactions** — Like/unlike comments, delete comments (cascade deletes replies), proper authorization
- **Peer Connections** — Send/accept connection requests and manage peer relationships
- **Dark Brutalist UI** — Custom design system with distinct `Toast` / `Popup` components, monospace typography, and Framer Motion animations

---

## 📁 Project Structure

```text
code_canvas/
├── backend/                    # FastAPI Application
│   ├── main.py                 # App setup, CORS, route registration, Socket.IO
│   ├── models/
│   │   ├── auth.py             # Auth request/response models
│   │   ├── user.py             # Profile, Stats, Providers, Settings models
│   │   ├── post.py             # Post creation, response models with media & categories
│   │   ├── comment.py          # Comment/reply models with author & like stats
│   │   ├── peers.py            # Peer request and connection models
│   │   ├── chat.py             # Chat message, conversation models
│   │   └── ai.py               # AI signal generation request model
│   ├── routes/
│   │   ├── auth.py             # Login, onboarding, session endpoints
│   │   ├── users.py            # Search, profile, avatar upload endpoints
│   │   ├── posts.py            # Create, read, update, delete, like posts
│   │   ├── comments.py         # Comments, replies, likes endpoints
│   │   ├── peers.py            # Send/accept connection requests
│   │   ├── health.py           # Health check with DB ping
│   │   └── ai.py               # AI signal generation endpoint
│   ├── services/
│   │   ├── user.py             # User CRUD, profile completion, stats
│   │   ├── github.py           # GitHub API integration & data aggregation
│   │   ├── post.py             # Post CRUD, like management, count tracking
│   │   ├── comment.py          # Comment/reply CRUD, tree building, likes
│   │   ├── peers.py            # Connection request & peer management
│   │   ├── chat.py             # Chat message persistence and retrieval
│   │   └── ai.py               # AI signal generation logic
│   ├── socket_handlers/        # Real-time WebSocket event listeners
│   │   ├── chat.py             # Messaging and conversational events
│   │   └── core.py             # Base socket connection event handlers
│   ├── utils/
│   │   ├── auth.py             # Firebase token verification dependency
│   │   ├── database.py         # MongoDB connection & indexes
│   │   ├── security.py         # Fernet encryption for OAuth tokens
│   │   ├── cloudinary_utils.py # Image upload utility
│   │   └── serialization.py    # Common JSON encoders for datetime
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
    │   ├── posts/
    │   │   └── create/page.tsx # Post creation page with media & category selection
    │   ├── collab-feed/page.tsx # Collaboration focused feed (Infinite Scroll)
    │   ├── explore-feed/page.tsx # Discovery feed (Infinite Scroll)
    │   ├── events-feed/page.tsx # Events focused feed (Infinite Scroll)
    │   ├── profile/
    │   │   ├── page.tsx        # Authenticated user's profile
    │   │   └── [username]/page.tsx  # Public profile view
    │   └── globals.css         # Global styles
    ├── components/             # Reusable UI components
    │   ├── Navbar.tsx & NavbarWrapper.tsx  # Navigation with search
    │   ├── ChatDrawer.tsx      # Real-time direct messaging drawer
    │   ├── ChatMessageBubble.tsx # Message bubble for chat
    │   ├── PostCard.tsx        # Feed post with interactions
    │   ├── CommentForm.tsx     # Comment & reply input with auto-capitalization
    │   ├── CommentItem.tsx     # Node-based comment with nested replies
    │   ├── CommentSection.tsx  # Comments container with tree rendering
    │   ├── Toast.tsx           # Error/success notifications
    │   ├── Button.tsx          # Reusable button component
    │   ├── Popup.tsx           # Confirmation dialogs
    │   ├── AvatarUploadModal.tsx # Avatar staging and manual upload
    │   └── ...                 # Landing page & modal components
    ├── contexts/
    │   └── AuthContext.tsx     # Firebase auth state & backend sync
    ├── hooks/
    │   ├── useChatDrawer.ts    # Chat routing, UI state, and logic
    │   ├── useSocket.ts        # Socket.IO client connection hook
    │   ├── useIntersectionObserver.ts # Infinite scroll trigger observer
    │   ├── useFeed.ts          # Feed data fetching with pagination & infinite scroll
    │   ├── useCreatePost.ts    # Post creation hook
    │   ├── useGithubRepos.ts   # GitHub repos integration
    │   └── ...                 # Other custom hooks
    ├── lib/
    │   ├── firebase.ts         # Firebase client initialization
    │   ├── messages.ts         # Auth error message mapping
    │   ├── api/
    │   │   ├── client.ts       # API base URL & header utilities
    │   │   ├── auth.ts         # Authentication endpoints
    │   │   ├── users.ts        # Paginated user search & profile endpoints
    │   │   ├── posts.ts        # Post create, read, like endpoints
    │   │   ├── comments.ts     # Comment, reply, like endpoints
    │   │   ├── peers.ts        # Connection request endpoints
    │   │   └── ...
    │   └── utils/
    │       └── validation.ts   # Input validation & sanitization (comments, usernames, etc.)
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

---

## 🔐 Authentication Flow

1. User signs in via Google, GitHub, or Email on the frontend
2. Firebase handles authentication and returns an ID token
3. Frontend syncs the session with the backend (`POST /auth/session`)
4. Backend verifies the ID token using the Firebase Admin SDK
5. A user document is provisioned in MongoDB on first login
6. Subsequent API requests pass the ID token as a `Bearer` token in the `Authorization` header

---

## 📝 Posts & Feed

### Creating Posts
- Posts support **markdown content** with optional **media attachments** (images, videos)
- **Category tags** organize content: `collab` (collaboration), `event` (events), `explore` (discovery)
- Optional GitHub links and collaboration metadata
- Media stored on Cloudinary with URL stored in MongoDB

### Post Interactions
- **Like/Unlike** posts with optimistic UI updates and count synchronization
- Real-time statistics: `likes_count`, `comments_count`, `shares`
- Posts are indexed by `created_at` and category for efficient querying
- Comment counts accurately reflect total comments including nested replies

### Feed Filtering
- **Collab Feed** (`/collab-feed`) — Shows only collaboration posts
- **Explore Feed** (`/explore-feed`) — Discovery of diverse content
- **Events Feed** (`/events-feed`) — Event-specific posts with metadata

---

## 💬 Comments & Nested Replies

### Comment Features
- **Nested threaded comments** — Reply to any comment to create conversations
- **Auto-capitalization** — First letter automatically capitalized as users type
- **Validation** — Must start with capital letter, no consecutive spaces, non-empty
- **Responsive Design** — Comment and reply fields scale on smaller screens with reduced padding
- **Tree Structure Building** — Backend constructs parent-child relationships automatically

### Comment Interactions
- **Like/Unlike comments** — Same as post likes with optimistic updates
- **Delete Comments** — Owner can delete; cascade deletes all nested replies
- **Author Info** — Display comment author avatar, username, and timestamp
- **Proper Authorization** — Only comment owners can delete their comments

### Frontend Components
- `CommentForm.tsx` — Reusable textarea with auto-capitalization and validation
- `CommentItem.tsx` — Individual comment with actions (like, reply, delete)
- `CommentSection.tsx` — Container managing fetch, create, and tree rendering

### Backend Implementation
- **Endpoints**:
  - `POST /posts/{postId}/comments` — Create top-level comment
  - `POST /comments/{commentId}/reply` — Add reply to comment
  - `GET /posts/{postId}/comments` — Fetch comment tree
  - `DELETE /comments/{commentId}` — Delete comment & replies
  - `POST /comments/{commentId}/like` — Toggle comment like
- **Collections**: `comments` (with indexes on `post_id`, `parent_comment_id`) and `comment_likes`
- **Service Logic** — Builds nested tree structure with O(n) complexity, manages like counts atomically

---

## 🤝 Peer Connections

- **Send Requests** — Users can request peer connections with other users
- **Request Management** — Accept, reject, or cancel connection requests
- **Peer List** — View all established connections on profile
- **Identity Linking** — Peers collection manages mutual relationships with indexed lookups

---

## 🛡️ Security

- **Never commit** `.env`, `.env.local`, or `serviceAccountKey.json` — all covered by `.gitignore`
- GitHub OAuth tokens are **AES-encrypted** (Fernet) before storage in MongoDB
- User search results exclude sensitive fields (tokens, providers)
- Comment and post operations require authentication (Bearer token)
- Only owners can delete their comments/posts
- The `.env.example` files are safe templates for other developers

---

---

## 🔌 API Endpoints Reference

### Authentication
- `POST /auth/google` — Google OAuth login
- `POST /auth/github` — GitHub OAuth login
- `POST /auth/signup` — Email/password signup
- `POST /auth/login` — Email/password login
- `POST /auth/session` — Sync and verify session

### Users
- `GET /users/search?q={query}` — Search users (debounced)
- `GET /users/{userId}` — Get user profile
- `PUT /users/profile` — Update profile (authenticated)
- `POST /users/avatar` — Upload avatar (Cloudinary)

### Posts
- `POST /posts` — Create post (authenticated)
- `GET /posts?category={category}&limit={limit}` — Fetch posts with filtering
- `GET /posts/{postId}` — Get post details
- `PUT /posts/{postId}` — Update post (owner only)
- `DELETE /posts/{postId}` — Delete post (owner only, cascade deletes comments)
- `POST /posts/{postId}/like` — Toggle post like
- `GET /posts/{postId}/comments` — Fetch comment tree for post

### Comments & Replies
- `POST /posts/{postId}/comments` — Create top-level comment
- `POST /comments/{commentId}/reply` — Reply to comment
- `DELETE /comments/{commentId}` — Delete comment & replies (owner only)
- `POST /comments/{commentId}/like` — Toggle comment like

### Peer Connections
- `POST /peers/request` — Send connection request
- `POST /peers/request/{requestId}/accept` — Accept request
- `POST /peers/request/{requestId}/reject` — Reject request
- `GET /peers/connections` — List user's peers
- `GET /peers/requests` — List pending requests

### Real-Time Chat (Socket.IO)
- `emit("send_message", { conversationId, text })` — Send a direct message
- `emit("typing", { conversationId, isTyping })` — Broadcast typing indicator
- `emit("mark_as_read", { conversationId })` — Mark messages as read
- `on("new_message")` — Receive incoming messages in real-time
- `on("user_typing")` — Receive typing status updates

### Health
- `GET /health` — API health check with DB ping

---

## 📦 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React 19, Tailwind CSS v4, Framer Motion, Lucide Icons, date-fns, Socket.IO Client |
| Backend | FastAPI, Motor (async MongoDB), Firebase Admin SDK, Pydantic, python-socketio, google-genai |
| Database | MongoDB Atlas (collections: users, posts, post_likes, comments, comment_likes, peers, peer_requests, conversations, messages) |
| Auth | Firebase Authentication (Google, GitHub, Email/Password) |
| Storage | Cloudinary (media and avatars) |
| Encryption | Fernet (OAuth token encryption) |
| Deployment Ready | CORS configured, environment-based configuration, proper error handling |
