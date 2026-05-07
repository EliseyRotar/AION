"""
Basic setup tests to verify the test infrastructure is working correctly.
"""

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import User, UserRole


@pytest.mark.asyncio
async def test_database_session(db_session: AsyncSession):
    """Test that the database session fixture works correctly."""
    # Create a test user
    user = User(
        email="test@example.com",
        username="testuser",
        hashed_password="hashed",
        role=UserRole.USER
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    
    # Verify the user was created
    assert user.id is not None
    assert user.email == "test@example.com"
    assert user.username == "testuser"


@pytest.mark.asyncio
async def test_admin_user_fixture(admin_user: User):
    """Test that the admin user fixture creates a valid admin."""
    assert admin_user.id is not None
    assert admin_user.role == UserRole.ADMIN
    assert admin_user.is_active is True
    assert admin_user.email == "admin@test.com"


@pytest.mark.asyncio
async def test_regular_user_fixture(regular_user: User):
    """Test that the regular user fixture creates a valid user."""
    assert regular_user.id is not None
    assert regular_user.role == UserRole.USER
    assert regular_user.is_active is True
    assert regular_user.email == "user@test.com"


@pytest.mark.asyncio
async def test_auth_headers(auth_headers_admin: dict, auth_headers_user: dict):
    """Test that authentication header fixtures are properly formatted."""
    assert "Authorization" in auth_headers_admin
    assert auth_headers_admin["Authorization"].startswith("Bearer ")
    
    assert "Authorization" in auth_headers_user
    assert auth_headers_user["Authorization"].startswith("Bearer ")
