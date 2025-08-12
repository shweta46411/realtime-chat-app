from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()

@router.websocket("/ws/test")
async def websocket_test(websocket: WebSocket):
   await websocket.accept()
   print(f"Client connected: {websocket.client}")  # to see connection
   
   try:
       while True:
           data = await websocket.receive_text()
           # TODO: add timestamp later
           response = f"server: {data}"
           await websocket.send_text(response)
   except WebSocketDisconnect:
       print("Client disconnected")  # to know when disconnected