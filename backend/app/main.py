from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app.database import init_db, async_session_maker
from app.routes import api_router
from app.models import User, UserRole
from app.auth import get_password_hash
from app.config import settings
from sqlalchemy import select

limiter = Limiter(key_func=get_remote_address)

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 Starting AION...")
    await init_db()
    async with async_session_maker() as db:
        result = await db.execute(select(User).where(User.email == settings.DEFAULT_ADMIN_EMAIL))
        if not result.scalar_one_or_none():
            admin = User(
                email=settings.DEFAULT_ADMIN_EMAIL,
                username="admin",
                full_name="Administrator",
                hashed_password=get_password_hash(settings.DEFAULT_ADMIN_PASSWORD),
                role=UserRole.ADMIN,
                avatar_color="#6366f1",
            )
            db.add(admin)
            await db.commit()
            print(f"✅ Admin created: {settings.DEFAULT_ADMIN_EMAIL}")
    print("✅ Server ready!")
    yield
    print("👋 Server stopped")

app = FastAPI(title="AION", version="2.0.0", lifespan=lifespan)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

cors_origins = [o.strip() for o in settings.CORS_ORIGINS.split(',') if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")

@app.get("/")
async def root():
    return {"name": "AION", "status": "running", "version": "2.0.0"}
