from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from typing import Dict
import asyncio, json
from datetime import datetime, timezone
from app.db import get_db_pool

router = APIRouter(tags=["chat"])

# Active chat connections
connections: Dict[str, WebSocket] = {}
conn_lock = asyncio.Lock()

async def add_connection(user_id: str, ws: WebSocket):
    await ws.accept()
    async with conn_lock:
        # Close any existing connection for this user
        if user_id in connections:
            try:
                await connections[user_id].close()
            except:
                pass
        connections[user_id] = ws

async def remove_connection(user_id: str):
    async with conn_lock:
        connections.pop(user_id, None)

async def send_message(user_id: str, data: dict) -> bool:
    async with conn_lock:
        ws = connections.get(user_id)
    
    if not ws:
        return False
        
    try:
        await ws.send_json(data)
        return True
    except:
        # Clean up dead connection
        async with conn_lock:
            if connections.get(user_id) is ws:
                connections.pop(user_id, None)
        return False

async def user_is_online(user_id: str) -> bool:
    db = await get_db_pool()
    try:
        result = await db.fetchrow("""
            SELECT 1 FROM users_online 
            WHERE user_id = $1 AND last_seen > NOW() - INTERVAL '60 seconds'
        """, user_id)
        return result is not None
    except:
        # Fallback to connection check
        return user_id in connections

@router.websocket("/ws/chat")
async def chat_websocket(ws: WebSocket, me: str = Query(...)):
    await add_connection(me, ws)
    
    try:
        while True:
            data = await ws.receive_text()
            
            try:
                msg = json.loads(data)
            except:
                await ws.send_json({"error": "bad_json"})
                continue
                
            msg_type = msg.get("type")
            
            if msg_type == "dm":
                recipient = msg.get("to")
                text = msg.get("text", "").strip()
                
                if not recipient or not text:
                    await ws.send_json({"error": "missing_fields"})
                    continue
                
                # Create message payload
                message = {
                    "type": "dm",
                    "from": me,
                    "to": recipient, 
                    "text": text,
                    "timestamp": int(datetime.now(timezone.utc).timestamp() * 1000)
                }
                
                # Echo back to sender
                await ws.send_json(message)
                
                # Try to deliver to recipient
                if await user_is_online(recipient):
                    delivered = await send_message(recipient, message)
                    if not delivered:
                        await ws.send_json({"info": "delivery_failed"})
                else:
                    await ws.send_json({"info": "user_offline"})
                    
            elif msg_type == "ping":
                await ws.send_json({"type": "pong"})
            else:
                await ws.send_json({"error": "unknown_message_type"})
                
    except WebSocketDisconnect:
        pass
    finally:
        await remove_connection(me)