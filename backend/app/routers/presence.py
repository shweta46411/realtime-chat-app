from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from typing import Dict, Set

router = APIRouter(prefix="/presence", tags=["presence"])

# TODO: move to database later
online_users: Dict[str, dict] = {}
connected_clients: Set[WebSocket] = set()

class UserData(BaseModel):
    user_id: str
    name: str

def get_online_users():
    users = []
    for user_id, user_info in online_users.items():
        if user_info.get("status") == "online":
            users.append({
                "user_id": user_id, 
                "name": user_info["name"], 
                "status": "online"
            })
    return users

async def notify_all_clients():
    if not connected_clients:
        return
    
    message = {"type": "presence", "users": get_online_users()}
    disconnected = []
    
    for client in connected_clients:
        try:
            await client.send_json(message)
        except:
            disconnected.append(client)
    
    # cleanup dead connections
    for client in disconnected:
        connected_clients.discard(client)

@router.post("/register")
async def user_online(data: UserData):
    print(f"User {data.name} coming online")  # debug log
    online_users[data.user_id] = {"name": data.name, "status": "online"}
    await notify_all_clients()  # broadcast immediately
    return {"success": True}

@router.get("/online")
async def get_online():
    return {"users": get_online_users()}

@router.post("/logout") 
async def user_offline(data: UserData):
    print(f"User {data.name} going offline")  # debug
    if data.user_id in online_users:
        online_users[data.user_id]["status"] = "offline"
    await notify_all_clients()
    return {"success": True}

@router.websocket("/ws")
async def presence_websocket(websocket: WebSocket):
    await websocket.accept()
    connected_clients.add(websocket)
    print(f"New presence client connected. Total: {len(connected_clients)}")
    
    try:
        # send current state
        initial_data = {"type": "presence", "users": get_online_users()}
        await websocket.send_json(initial_data)
        
        # keep connection alive
        while True:
            await websocket.receive_text()  # just heartbeat
            
    except WebSocketDisconnect:
        print("Presence client disconnected")
    finally:
        connected_clients.discard(websocket)