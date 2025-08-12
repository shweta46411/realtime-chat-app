from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from app.routers.health import router as health_router
from app.routers.ws_test import router as ws_router 
app = FastAPI(title="Incedo Chat API")

# CORS setup - only localhost for now
app.add_middleware(
   CORSMiddleware,
   allow_origins=["http://localhost:5173"],  # React dev server
   allow_credentials=True,
   allow_methods=["GET", "POST", "PUT", "DELETE"],
   allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(ws_router)  # websocket routes



