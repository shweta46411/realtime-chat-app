# Incedo Quick Chat — Real-Time 1:1 Chat (FastAPI · PostgreSQL · React)

A beginner-friendly real-time chat app built with FastAPI (backend), React (frontend), and WebSockets for live messaging. Great for learning full-stack WebSocket flows!

## Purpose

This project is designed to help you understand:

- How a React client connects to a WebSocket server
- How FastAPI handles real-time communication via WebSocket
- How data flows between client and server in a 1-to-1 chat
- How to track online presence using PostgreSQL

## Features

- Real-time 1-to-1 messaging (WebSocket)
- Anonymous identity on load (UUID + random name)
- Online users list (auto-updates on join/leave)
- Graceful disconnect handling
- Clean, minimal UI (two-pane layout)
- No message history persisted (session-based only)

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React + Vite (+ Tailwind) |
| Backend | FastAPI (Python) |
| Database | PostgreSQL (presence only) |
| Protocol | WebSocket |

## Folder Structure

```bash
├── backend/                    # FastAPI backend
│   ├── app/
│   │   ├── main.py             # App entry, CORS, router includes
│   │   ├── db.py               # Async DB pool helper
│   │   └── routers/
│   │       ├── presence.py     # Presence REST + WS broadcast
│   │       ├── ws_chat.py      # 1:1 chat WebSocket
│   │       └── health.py       # GET /health
│   └── db/init/presence.sql    # CREATE TABLE users_online ...
│
└── frontend/                   # React frontend
    └── src/
        ├── App.jsx             # Chat UI + chat WebSocket
        └── components/
            └── OnlineList.jsx  # Presence (register + WS)
```

## ▶️ Getting Started

### 1) Start PostgreSQL (once)

Create the presence table:

```sql
-- backend/db/init/presence.sql
CREATE TABLE IF NOT EXISTS users_online (
  user_id UUID PRIMARY KEY,
  display_name TEXT NOT NULL,
  last_seen TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_name ON users_online (display_name);
```

Use a local Postgres instance (app, Docker, or psql) and run the SQL above.

### 2) Start Backend (FastAPI)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt                      # or uv/poetry if you prefer

# Optional backend/.env:
# FRONTEND_ORIGIN=http://localhost:5173
# ALLOWED_ORIGINS=http://localhost:5173

uvicorn app.main:app --reload
# → http://localhost:8000 (Swagger: /docs)
```

### 3) Start Frontend (React)

```bash
cd frontend

# If your API is mounted under a prefix, set VITE_API_PREFIX=/api
printf "VITE_API_BASE=http://localhost:8000\nVITE_WS_BASE=ws://localhost:8000\nVITE_API_PREFIX=\n" > .env.local

npm install
npm run dev
# → http://localhost:5173
```

Open two different browsers/profiles (or an incognito window) so each gets a different UUID—you'll see each other online and can chat.

## How It Works

1. On load, the client creates/stores an anonymous identity (UUID + random name).
2. Client registers presence: `POST /presence/register` and opens `WS /presence/ws`.
3. Server broadcasts the online roster to all presence clients on join/leave.
4. Client opens chat socket `WS /ws/chat?me=<uuid>` for direct messages.
5. To send a DM, client posts over WS:
   ```json
   { "type": "dm", "to": "<peer-uuid>", "text": "hello" }
   ```
6. Server validates, echoes to sender, and delivers to recipient (if online).
7. Errors are explicit: `SELF_CHAT_BLOCKED`, `PEER_OFFLINE`, `INVALID_PAYLOAD`, etc.

## API & WebSocket (Quick Reference)

### Presence (REST)

**POST /presence/register**
```json
{ "user_id": "uuid-string", "name": "User1234" }
```

**POST /presence/logout**
```json
{ "user_id": "uuid-string", "name": "User1234" }
```

### Presence (WebSocket)

**WS /presence/ws?user_id=<uuid>** → broadcasts:
```json
{ "type": "presence", "users": [ { "user_id": "…", "name": "…" } ] }
```

### Chat (WebSocket)

**WS /ws/chat?me=<uuid>**

Send:
```json
{ "type": "dm", "to": "<peer-uuid>", "text": "hello" }
```

Receive (echo + deliver):
```json
{ "type": "dm", "from": "<uuid>", "to": "<uuid>", "text": "hello", "timestamp": 1712345678901 }
```

Errors:
```json
{ "type": "error", "code": "PEER_OFFLINE", "detail": "User is offline" }
```


## Future Enhancements

- Auth (named users), avatars
- Typing indicators, read receipts
- Group chat / rooms
- Persist messages for history
- Docker Compose for one-command spin-up (API + Web)


## Troubleshooting (Quick)

- **WS closes before connect**: If your backend uses a prefix (e.g. /api), set `VITE_API_PREFIX=/api`.
- **Nobody online**: Use two browsers so each gets a unique UUID.
- **CORS errors**: Ensure `FRONTEND_ORIGIN`/`ALLOWED_ORIGINS` match `http://localhost:5173`.
- **Presence not updating**: Confirm `POST /presence/register` is 200 and presence WS is connected.
