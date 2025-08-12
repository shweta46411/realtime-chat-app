# app/routers/presence.py
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from pydantic import BaseModel
from typing import Set, List
from app.db import get_db_pool
import json
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/presence", tags=["presence"])

# Users go stale after 1min of no activity
PRESENCE_TTL = 60

class UserData(BaseModel):
    user_id: str
    name: str

# Keep track of live ws connections
ws_clients: Set[WebSocket] = set()



async def get_active_users() -> list[dict]:
    db = await get_db_pool()
    rows = await db.fetch(
        """
        SELECT user_id, display_name
        FROM users_online
        WHERE last_seen > NOW() - make_interval(secs => $1::int)
        ORDER BY display_name
        """,
        PRESENCE_TTL,  # int is OK now
    )
    return [{"user_id": str(r["user_id"]), "name": r["display_name"]} for r in rows]


async def broadcast_presence():
    if not ws_clients:
        return
        
    users = await get_active_users()
    payload = {"type": "presence", "users": users}
    
    # Clean up dead connections while broadcasting
    dead_sockets = []
    for client in ws_clients:
        try:
            await client.send_json(payload)
        except:
            dead_sockets.append(client)
    
    # Remove dead connections
    for dead in dead_sockets:
        ws_clients.discard(dead)

@router.post("/register")
async def mark_user_online(user: UserData):
    db = await get_db_pool()
    
    await db.execute("""
        INSERT INTO users_online (user_id, display_name, last_seen) 
        VALUES ($1, $2, NOW())
        ON CONFLICT (user_id) DO UPDATE SET 
            display_name = EXCLUDED.display_name,
            last_seen = NOW()
    """, user.user_id, user.name)
    
    await broadcast_presence()
    return {"success": True}

@router.post("/logout") 
async def mark_user_offline(user: UserData):
    db = await get_db_pool()
    await db.execute("DELETE FROM users_online WHERE user_id = $1", user.user_id)
    await broadcast_presence()
    return {"success": True}

@router.websocket("/ws")
async def presence_websocket(ws: WebSocket, user_id: str = Query(None)):
    await ws.accept()
    ws_clients.add(ws)
    
    # Send current presence state immediately
    await broadcast_presence()
    
    db = await get_db_pool()
    
    try:
        while True:
            data = await ws.receive_text()
            
            # Handle ping messages to update last_seen
            if user_id:
                try:
                    parsed = json.loads(data)
                    if parsed.get("type") == "ping":
                        await db.execute(
                            "UPDATE users_online SET last_seen = NOW() WHERE user_id = $1",
                            user_id
                        )
                except (json.JSONDecodeError, KeyError):
                    # Ignore malformed messages
                    continue
                    
    except WebSocketDisconnect:
        logger.debug(f"WebSocket disconnected for user {user_id}")
    except Exception as e:
        logger.error(f"WebSocket error for user {user_id}: {e}")
    finally:
        ws_clients.discard(ws)
        # Update presence for remaining clients
        if ws_clients:
            await broadcast_presence()