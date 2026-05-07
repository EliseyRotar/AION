from pydantic_settings import BaseSettings
from typing import Optional
import os

# Resolve .env path relative to this file so it works from any CWD
_ENV_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '.env')


class Settings(BaseSettings):
    # ── Database ──────────────────────────────────────────────
    DATABASE_URL: str = "sqlite+aiosqlite:///./ai_hub.db"

    # ── Security ──────────────────────────────────────────────
    SECRET_KEY: str = "your-super-secret-key-change-in-production-2024"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    # ── Groq ──────────────────────────────────────────────────
    GROQ_API_KEY: str = ""
    GROQ_BASE_URL: str = "https://api.groq.com/openai/v1"
    GROQ_TIMEOUT: float = 60.0
    GROQ_MAX_RETRIES: int = 2
    DEFAULT_MODEL: str = "llama-3.3-70b-versatile"

    # ── Storage ───────────────────────────────────────────────
    UPLOAD_DIR: str = "uploads"
    VECTOR_STORE_DIR: str = "vector_stores"

    # ── RAG ───────────────────────────────────────────────────
    RAG_CHUNK_SIZE: int = 1500
    RAG_CHUNK_OVERLAP: int = 300
    RAG_THRESHOLD_VERY_HIGH: float = 9.0
    RAG_THRESHOLD_HIGH: float = 14.0
    RAG_THRESHOLD_MEDIUM: float = 18.0
    RAG_THRESHOLD_LOW: float = 21.0
    RAG_SEARCH_K: int = 6
    RAG_MIN_CONFIDENCE: float = 50.0
    RAG_ENABLE_HYBRID_MODE: bool = True
    RAG_ENABLE_CAUTIOUS_MODE: bool = True

    # ── Admin defaults ────────────────────────────────────────
    DEFAULT_ADMIN_EMAIL: str = "admin@aihub.com"
    DEFAULT_ADMIN_PASSWORD: str = "Admin123!"

    # ── Feature flags ─────────────────────────────────────────
    FEATURE_ADVANCED_LOGGING: bool = True
    FEATURE_CONFIDENCE_SCORES: bool = True
    FEATURE_SOURCE_PREVIEW: bool = True
    FEATURE_STRATEGY_INDICATOR: bool = False

    # ── Limits ────────────────────────────────────────────────
    MAX_UPLOAD_SIZE_MB: int = 50
    MAX_MESSAGE_LENGTH: int = 2000
    MAX_CONVERSATIONS_PER_USER: int = 100
    CHAT_HISTORY_TURNS: int = 10  # pairs of user/assistant messages to include

    class Config:
        env_file = _ENV_FILE
        env_file_encoding = "utf-8"
        case_sensitive = False


settings = Settings()

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.VECTOR_STORE_DIR, exist_ok=True)

if settings.FEATURE_ADVANCED_LOGGING:
    print(f"\n{'═'*60}")
    print(f"⚙️  AI HUB CONFIG")
    print(f"{'═'*60}")
    print(f"🗄️  Database: {settings.DATABASE_URL}")
    print(f"🤖 Groq model: {settings.DEFAULT_MODEL}")
    print(f"🔑 API key: {'✅ set' if settings.GROQ_API_KEY else '❌ MISSING - set GROQ_API_KEY in .env'}")
    print(f"📏 Chunk: {settings.RAG_CHUNK_SIZE} / overlap: {settings.RAG_CHUNK_OVERLAP}")
    print(f"{'═'*60}\n")


def validate_config():
    errors = []
    if not settings.GROQ_API_KEY:
        errors.append("❌ GROQ_API_KEY is not set — create backend/.env with GROQ_API_KEY=gsk_...")
    if not (0 < settings.RAG_THRESHOLD_VERY_HIGH < settings.RAG_THRESHOLD_HIGH <
            settings.RAG_THRESHOLD_MEDIUM < settings.RAG_THRESHOLD_LOW):
        errors.append("❌ RAG thresholds must be in ascending order")
    if settings.RAG_CHUNK_OVERLAP >= settings.RAG_CHUNK_SIZE:
        errors.append("❌ RAG_CHUNK_OVERLAP must be < RAG_CHUNK_SIZE")
    if errors:
        for e in errors:
            print(e)
        raise ValueError("Invalid configuration — fix the errors above and restart")
    if settings.FEATURE_ADVANCED_LOGGING:
        print("✅ Config validated\n")


validate_config()
