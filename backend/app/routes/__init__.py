from fastapi import APIRouter
from app.routes.auth_routes import router as auth_router
from app.routes.admin_routes import router as admin_router
from app.routes.agent_routes import router as agent_router
from app.routes.chat_routes import router as chat_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(admin_router)
api_router.include_router(agent_router)
api_router.include_router(chat_router)