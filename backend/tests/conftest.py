"""
Test configuration and fixtures for AION v2.0

This module provides:
- Async test client with in-memory SQLite database
- Database session fixtures
- Authentication helpers
- Common test data factories
"""

import pytest
import pytest_asyncio
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.models import User, UserRole
from app.auth import get_password_hash, create_access_token


# ── Test Database Setup ──────────────────────────────────────────────────────

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
    echo=False
)

test_session_maker = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False
)


# ── Pytest Configuration ─────────────────────────────────────────────────────

@pytest_asyncio.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Create a fresh database for each test function.
    All tables are created before the test and dropped after.
    """
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async with test_session_maker() as session:
        yield session
    
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


# ── Test Data Factories ──────────────────────────────────────────────────────

@pytest_asyncio.fixture
async def admin_user(db_session: AsyncSession) -> User:
    """Create an admin user for testing."""
    user = User(
        email="admin@test.com",
        username="admin",
        hashed_password=get_password_hash("Admin123!"),
        full_name="Admin User",
        role=UserRole.ADMIN,
        is_active=True
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def regular_user(db_session: AsyncSession) -> User:
    """Create a regular user for testing."""
    user = User(
        email="user@test.com",
        username="user",
        hashed_password=get_password_hash("User123!"),
        full_name="Regular User",
        role=UserRole.USER,
        is_active=True
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
def admin_token(admin_user: User) -> str:
    """Generate a valid JWT token for the admin user."""
    return create_access_token(data={"sub": admin_user.username})


@pytest.fixture
def user_token(regular_user: User) -> str:
    """Generate a valid JWT token for the regular user."""
    return create_access_token(data={"sub": regular_user.username})


@pytest.fixture
def auth_headers_admin(admin_token: str) -> dict:
    """Generate authorization headers for admin user."""
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture
def auth_headers_user(user_token: str) -> dict:
    """Generate authorization headers for regular user."""
    return {"Authorization": f"Bearer {user_token}"}


# ── Test Client ──────────────────────────────────────────────────────────────

@pytest_asyncio.fixture
async def test_client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """
    Create an async test client with dependency overrides.
    The test client uses the in-memory database session.
    """
    from app.main import app
    from app.database import get_db
    
    # Override the database dependency to use the test session
    async def override_get_db():
        yield db_session
    
    app.dependency_overrides[get_db] = override_get_db
    
    # Create the async client
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as client:
        yield client
    
    # Clean up dependency overrides
    app.dependency_overrides.clear()

