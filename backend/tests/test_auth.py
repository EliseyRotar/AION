"""
Unit tests for authentication functions in backend/app/auth.py

Tests cover:
- create_refresh_token: token generation, hashing, and database storage
- verify_refresh_token: token verification, expiration, and revocation checks
"""

import pytest
import pytest_asyncio
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException

from app.auth import create_refresh_token, verify_refresh_token
from app.models import User, RefreshToken
from tests.conftest import admin_user, regular_user, db_session, test_client


# ── Tests for create_refresh_token ───────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_refresh_token_generates_valid_token(
    db_session: AsyncSession,
    admin_user: User
):
    """Test that create_refresh_token generates a 64-character hex token."""
    token = await create_refresh_token(admin_user.id, db_session)
    
    # Token should be 64 characters (32 bytes hex-encoded)
    assert len(token) == 64
    # Token should be valid hex
    assert all(c in '0123456789abcdef' for c in token)


@pytest.mark.asyncio
async def test_create_refresh_token_stores_hash_in_db(
    db_session: AsyncSession,
    admin_user: User
):
    """Test that create_refresh_token stores SHA-256 hash in database."""
    import hashlib
    
    token = await create_refresh_token(admin_user.id, db_session)
    
    # Calculate expected hash
    expected_hash = hashlib.sha256(token.encode()).hexdigest()
    
    # Verify hash is stored in database
    result = await db_session.execute(
        select(RefreshToken).where(RefreshToken.token_hash == expected_hash)
    )
    stored_token = result.scalar_one_or_none()
    
    assert stored_token is not None
    assert stored_token.token_hash == expected_hash
    assert stored_token.user_id == admin_user.id


@pytest.mark.asyncio
async def test_create_refresh_token_sets_30_day_expiration(
    db_session: AsyncSession,
    admin_user: User
):
    """Test that refresh token expires in 30 days."""
    before_creation = datetime.utcnow()
    token = await create_refresh_token(admin_user.id, db_session)
    after_creation = datetime.utcnow()
    
    import hashlib
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    
    result = await db_session.execute(
        select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    )
    stored_token = result.scalar_one()
    
    # Expiration should be approximately 30 days from now
    expected_min = before_creation + timedelta(days=30)
    expected_max = after_creation + timedelta(days=30)
    
    assert expected_min <= stored_token.expires_at <= expected_max


@pytest.mark.asyncio
async def test_create_refresh_token_not_revoked_by_default(
    db_session: AsyncSession,
    admin_user: User
):
    """Test that newly created refresh tokens are not revoked."""
    import hashlib
    
    token = await create_refresh_token(admin_user.id, db_session)
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    
    result = await db_session.execute(
        select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    )
    stored_token = result.scalar_one()
    
    assert stored_token.revoked is False


# ── Tests for verify_refresh_token ───────────────────────────────────────────

@pytest.mark.asyncio
async def test_verify_refresh_token_returns_user_for_valid_token(
    db_session: AsyncSession,
    admin_user: User
):
    """Test that verify_refresh_token returns the correct user for a valid token."""
    token = await create_refresh_token(admin_user.id, db_session)
    
    user = await verify_refresh_token(token, db_session)
    
    assert user.id == admin_user.id
    assert user.username == admin_user.username
    assert user.email == admin_user.email


@pytest.mark.asyncio
async def test_verify_refresh_token_rejects_invalid_token(
    db_session: AsyncSession,
    admin_user: User
):
    """Test that verify_refresh_token raises 401 for non-existent token."""
    fake_token = "a" * 64  # Valid format but not in database
    
    with pytest.raises(HTTPException) as exc_info:
        await verify_refresh_token(fake_token, db_session)
    
    assert exc_info.value.status_code == 401
    assert "Sessione scaduta" in exc_info.value.detail


@pytest.mark.asyncio
async def test_verify_refresh_token_rejects_revoked_token(
    db_session: AsyncSession,
    admin_user: User
):
    """Test that verify_refresh_token raises 401 for revoked token."""
    import hashlib
    
    token = await create_refresh_token(admin_user.id, db_session)
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    
    # Revoke the token
    result = await db_session.execute(
        select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    )
    stored_token = result.scalar_one()
    stored_token.revoked = True
    await db_session.commit()
    
    # Verify it's rejected
    with pytest.raises(HTTPException) as exc_info:
        await verify_refresh_token(token, db_session)
    
    assert exc_info.value.status_code == 401
    assert "Sessione scaduta" in exc_info.value.detail


@pytest.mark.asyncio
async def test_verify_refresh_token_rejects_expired_token(
    db_session: AsyncSession,
    admin_user: User
):
    """Test that verify_refresh_token raises 401 for expired token."""
    import hashlib
    
    token = await create_refresh_token(admin_user.id, db_session)
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    
    # Manually expire the token
    result = await db_session.execute(
        select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    )
    stored_token = result.scalar_one()
    stored_token.expires_at = datetime.utcnow() - timedelta(days=1)
    await db_session.commit()
    
    # Verify it's rejected
    with pytest.raises(HTTPException) as exc_info:
        await verify_refresh_token(token, db_session)
    
    assert exc_info.value.status_code == 401
    assert "Sessione scaduta" in exc_info.value.detail


@pytest.mark.asyncio
async def test_verify_refresh_token_rejects_inactive_user(
    db_session: AsyncSession,
    admin_user: User
):
    """Test that verify_refresh_token raises 401 if user is inactive."""
    token = await create_refresh_token(admin_user.id, db_session)
    
    # Deactivate the user
    admin_user.is_active = False
    await db_session.commit()
    
    # Verify it's rejected
    with pytest.raises(HTTPException) as exc_info:
        await verify_refresh_token(token, db_session)
    
    assert exc_info.value.status_code == 401
    assert "Utente non trovato" in exc_info.value.detail


@pytest.mark.asyncio
async def test_verify_refresh_token_works_for_regular_user(
    db_session: AsyncSession,
    regular_user: User
):
    """Test that verify_refresh_token works for non-admin users."""
    token = await create_refresh_token(regular_user.id, db_session)
    
    user = await verify_refresh_token(token, db_session)
    
    assert user.id == regular_user.id
    assert user.username == regular_user.username


# ── Edge Cases ───────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_multiple_refresh_tokens_for_same_user(
    db_session: AsyncSession,
    admin_user: User
):
    """Test that multiple refresh tokens can exist for the same user."""
    token1 = await create_refresh_token(admin_user.id, db_session)
    token2 = await create_refresh_token(admin_user.id, db_session)
    
    # Both tokens should be different
    assert token1 != token2
    
    # Both should be valid
    user1 = await verify_refresh_token(token1, db_session)
    user2 = await verify_refresh_token(token2, db_session)
    
    assert user1.id == admin_user.id
    assert user2.id == admin_user.id


@pytest.mark.asyncio
async def test_verify_refresh_token_with_malformed_token(
    db_session: AsyncSession,
    admin_user: User
):
    """Test that verify_refresh_token handles malformed tokens gracefully."""
    # Token too short
    with pytest.raises(HTTPException) as exc_info:
        await verify_refresh_token("short", db_session)
    
    assert exc_info.value.status_code == 401


# ── Tests for POST /auth/login endpoint ──────────────────────────────────────

@pytest.mark.asyncio
async def test_login_returns_refresh_token(
    test_client,
    db_session: AsyncSession,
    admin_user: User
):
    """
    Test that POST /auth/login returns both access_token and refresh_token.
    Validates: Requirements 9.4
    """
    from httpx import AsyncClient
    
    # Login with valid credentials
    response = await test_client.post(
        "/api/auth/login",
        json={
            "email": admin_user.email,
            "password": "Admin123!"
        }
    )
    
    # Verify response status
    assert response.status_code == 200
    
    # Verify response structure
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert "token_type" in data
    assert "expires_in" in data
    
    # Verify token_type
    assert data["token_type"] == "bearer"
    
    # Verify expires_in (should be 3600 seconds = 60 minutes)
    assert data["expires_in"] == 3600
    
    # Verify refresh_token format (64 hex characters)
    refresh_token = data["refresh_token"]
    assert len(refresh_token) == 64
    assert all(c in '0123456789abcdef' for c in refresh_token)
    
    # Verify access_token is a valid JWT
    access_token = data["access_token"]
    assert len(access_token) > 0
    assert access_token.count('.') == 2  # JWT has 3 parts separated by dots


@pytest.mark.asyncio
async def test_login_creates_refresh_token_in_db(
    test_client,
    db_session: AsyncSession,
    admin_user: User
):
    """
    Test that POST /auth/login creates a RefreshToken record in the database.
    Validates: Requirements 9.4
    """
    import hashlib
    
    # Login with valid credentials
    response = await test_client.post(
        "/api/auth/login",
        json={
            "email": admin_user.email,
            "password": "Admin123!"
        }
    )
    
    assert response.status_code == 200
    data = response.json()
    refresh_token = data["refresh_token"]
    
    # Calculate the hash of the refresh token
    token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
    
    # Verify the token exists in the database
    result = await db_session.execute(
        select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    )
    stored_token = result.scalar_one_or_none()
    
    assert stored_token is not None
    assert stored_token.user_id == admin_user.id
    assert stored_token.revoked is False
    
    # Verify expiration is approximately 30 days from now
    expected_expiration = datetime.utcnow() + timedelta(days=30)
    time_diff = abs((stored_token.expires_at - expected_expiration).total_seconds())
    assert time_diff < 5  # Allow 5 seconds tolerance


@pytest.mark.asyncio
async def test_login_with_invalid_credentials_no_refresh_token(
    test_client,
    db_session: AsyncSession,
    admin_user: User
):
    """
    Test that failed login does not create a refresh token.
    """
    # Attempt login with wrong password
    response = await test_client.post(
        "/api/auth/login",
        json={
            "email": admin_user.email,
            "password": "WrongPassword123!"
        }
    )
    
    # Verify response status
    assert response.status_code == 401
    
    # Verify no refresh tokens were created
    result = await db_session.execute(
        select(RefreshToken).where(RefreshToken.user_id == admin_user.id)
    )
    tokens = result.scalars().all()
    assert len(tokens) == 0


@pytest.mark.asyncio
async def test_login_with_inactive_user_no_refresh_token(
    test_client,
    db_session: AsyncSession,
    admin_user: User
):
    """
    Test that login with inactive user does not create a refresh token.
    """
    # Deactivate the user
    admin_user.is_active = False
    await db_session.commit()
    
    # Attempt login
    response = await test_client.post(
        "/api/auth/login",
        json={
            "email": admin_user.email,
            "password": "Admin123!"
        }
    )
    
    # Verify response status
    assert response.status_code == 403
    
    # Verify no refresh tokens were created
    result = await db_session.execute(
        select(RefreshToken).where(RefreshToken.user_id == admin_user.id)
    )
    tokens = result.scalars().all()
    assert len(tokens) == 0


@pytest.mark.asyncio
async def test_multiple_logins_create_multiple_refresh_tokens(
    test_client,
    db_session: AsyncSession,
    admin_user: User
):
    """
    Test that multiple logins create multiple refresh tokens for the same user.
    """
    # First login
    response1 = await test_client.post(
        "/api/auth/login",
        json={
            "email": admin_user.email,
            "password": "Admin123!"
        }
    )
    assert response1.status_code == 200
    token1 = response1.json()["refresh_token"]
    
    # Second login
    response2 = await test_client.post(
        "/api/auth/login",
        json={
            "email": admin_user.email,
            "password": "Admin123!"
        }
    )
    assert response2.status_code == 200
    token2 = response2.json()["refresh_token"]
    
    # Tokens should be different
    assert token1 != token2
    
    # Both tokens should exist in the database
    result = await db_session.execute(
        select(RefreshToken).where(RefreshToken.user_id == admin_user.id)
    )
    tokens = result.scalars().all()
    assert len(tokens) == 2


# ── Tests for POST /auth/refresh endpoint ────────────────────────────────────

@pytest.mark.asyncio
async def test_refresh_token_returns_new_tokens(
    test_client,
    db_session: AsyncSession,
    admin_user: User
):
    """
    Test that POST /auth/refresh returns new access_token and refresh_token.
    Validates: Requirements 9.3, 9.6
    """
    # First, login to get a refresh token
    login_response = await test_client.post(
        "/api/auth/login",
        json={
            "email": admin_user.email,
            "password": "Admin123!"
        }
    )
    assert login_response.status_code == 200
    old_refresh_token = login_response.json()["refresh_token"]
    old_access_token = login_response.json()["access_token"]
    
    # Use the refresh token to get new tokens
    refresh_response = await test_client.post(
        "/api/auth/refresh",
        json={
            "refresh_token": old_refresh_token
        }
    )
    
    # Verify response status
    assert refresh_response.status_code == 200
    
    # Verify response structure
    data = refresh_response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert "token_type" in data
    
    # Verify token_type
    assert data["token_type"] == "bearer"
    
    # Verify new tokens are returned
    new_access_token = data["access_token"]
    new_refresh_token = data["refresh_token"]
    # Note: access tokens may be identical if created in the same second (same exp time)
    # The important thing is that the refresh token is different (single-use rotation)
    assert new_refresh_token != old_refresh_token
    
    # Verify new refresh_token format (64 hex characters)
    assert len(new_refresh_token) == 64
    assert all(c in '0123456789abcdef' for c in new_refresh_token)
    
    # Verify new access_token is a valid JWT
    assert len(new_access_token) > 0
    assert new_access_token.count('.') == 2


@pytest.mark.asyncio
async def test_refresh_token_revokes_old_token(
    test_client,
    db_session: AsyncSession,
    admin_user: User
):
    """
    Test that POST /auth/refresh revokes the old refresh token (single-use).
    Validates: Requirements 9.3, 9.6
    """
    import hashlib
    
    # Login to get a refresh token
    login_response = await test_client.post(
        "/api/auth/login",
        json={
            "email": admin_user.email,
            "password": "Admin123!"
        }
    )
    assert login_response.status_code == 200
    old_refresh_token = login_response.json()["refresh_token"]
    
    # Use the refresh token
    refresh_response = await test_client.post(
        "/api/auth/refresh",
        json={
            "refresh_token": old_refresh_token
        }
    )
    assert refresh_response.status_code == 200
    
    # Verify the old token is now revoked in the database
    old_token_hash = hashlib.sha256(old_refresh_token.encode()).hexdigest()
    result = await db_session.execute(
        select(RefreshToken).where(RefreshToken.token_hash == old_token_hash)
    )
    old_token_record = result.scalar_one()
    assert old_token_record.revoked is True
    
    # Try to use the old token again - should fail
    second_refresh_response = await test_client.post(
        "/api/auth/refresh",
        json={
            "refresh_token": old_refresh_token
        }
    )
    assert second_refresh_response.status_code == 401
    assert "Sessione scaduta" in second_refresh_response.json()["detail"]


@pytest.mark.asyncio
async def test_refresh_token_creates_new_token_in_db(
    test_client,
    db_session: AsyncSession,
    admin_user: User
):
    """
    Test that POST /auth/refresh creates a new RefreshToken record in the database.
    Validates: Requirements 9.3, 9.6
    """
    import hashlib
    
    # Login to get a refresh token
    login_response = await test_client.post(
        "/api/auth/login",
        json={
            "email": admin_user.email,
            "password": "Admin123!"
        }
    )
    assert login_response.status_code == 200
    old_refresh_token = login_response.json()["refresh_token"]
    
    # Use the refresh token
    refresh_response = await test_client.post(
        "/api/auth/refresh",
        json={
            "refresh_token": old_refresh_token
        }
    )
    assert refresh_response.status_code == 200
    new_refresh_token = refresh_response.json()["refresh_token"]
    
    # Verify the new token exists in the database
    new_token_hash = hashlib.sha256(new_refresh_token.encode()).hexdigest()
    result = await db_session.execute(
        select(RefreshToken).where(RefreshToken.token_hash == new_token_hash)
    )
    new_token_record = result.scalar_one_or_none()
    
    assert new_token_record is not None
    assert new_token_record.user_id == admin_user.id
    assert new_token_record.revoked is False
    
    # Verify expiration is approximately 30 days from now
    expected_expiration = datetime.utcnow() + timedelta(days=30)
    time_diff = abs((new_token_record.expires_at - expected_expiration).total_seconds())
    assert time_diff < 5  # Allow 5 seconds tolerance


@pytest.mark.asyncio
async def test_refresh_token_with_invalid_token(
    test_client,
    db_session: AsyncSession,
    admin_user: User
):
    """
    Test that POST /auth/refresh rejects invalid refresh tokens.
    Validates: Requirements 9.3
    """
    fake_token = "a" * 64  # Valid format but not in database
    
    response = await test_client.post(
        "/api/auth/refresh",
        json={
            "refresh_token": fake_token
        }
    )
    
    assert response.status_code == 401
    assert "Sessione scaduta" in response.json()["detail"]


@pytest.mark.asyncio
async def test_refresh_token_with_expired_token(
    test_client,
    db_session: AsyncSession,
    admin_user: User
):
    """
    Test that POST /auth/refresh rejects expired refresh tokens.
    Validates: Requirements 9.3
    """
    import hashlib
    
    # Create a refresh token
    token = await create_refresh_token(admin_user.id, db_session)
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    
    # Manually expire the token
    result = await db_session.execute(
        select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    )
    stored_token = result.scalar_one()
    stored_token.expires_at = datetime.utcnow() - timedelta(days=1)
    await db_session.commit()
    
    # Try to use the expired token
    response = await test_client.post(
        "/api/auth/refresh",
        json={
            "refresh_token": token
        }
    )
    
    assert response.status_code == 401
    assert "Sessione scaduta" in response.json()["detail"]


@pytest.mark.asyncio
async def test_refresh_token_with_inactive_user(
    test_client,
    db_session: AsyncSession,
    admin_user: User
):
    """
    Test that POST /auth/refresh rejects tokens for inactive users.
    Validates: Requirements 9.3
    """
    # Login to get a refresh token
    login_response = await test_client.post(
        "/api/auth/login",
        json={
            "email": admin_user.email,
            "password": "Admin123!"
        }
    )
    assert login_response.status_code == 200
    refresh_token = login_response.json()["refresh_token"]
    
    # Deactivate the user
    admin_user.is_active = False
    await db_session.commit()
    
    # Try to use the refresh token
    response = await test_client.post(
        "/api/auth/refresh",
        json={
            "refresh_token": refresh_token
        }
    )
    
    assert response.status_code == 401
    assert "Utente non trovato" in response.json()["detail"]


@pytest.mark.asyncio
async def test_refresh_token_new_access_token_works(
    test_client,
    db_session: AsyncSession,
    admin_user: User
):
    """
    Test that the new access token from POST /auth/refresh can be used for authenticated requests.
    Validates: Requirements 9.3, 9.6
    """
    # Login to get a refresh token
    login_response = await test_client.post(
        "/api/auth/login",
        json={
            "email": admin_user.email,
            "password": "Admin123!"
        }
    )
    assert login_response.status_code == 200
    old_refresh_token = login_response.json()["refresh_token"]
    
    # Use the refresh token to get new tokens
    refresh_response = await test_client.post(
        "/api/auth/refresh",
        json={
            "refresh_token": old_refresh_token
        }
    )
    assert refresh_response.status_code == 200
    new_access_token = refresh_response.json()["access_token"]
    
    # Use the new access token to make an authenticated request
    me_response = await test_client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {new_access_token}"}
    )
    
    assert me_response.status_code == 200
    data = me_response.json()
    assert data["id"] == admin_user.id
    assert data["email"] == admin_user.email


@pytest.mark.asyncio
async def test_refresh_token_multiple_times(
    test_client,
    db_session: AsyncSession,
    admin_user: User
):
    """
    Test that refresh tokens can be rotated multiple times in succession.
    Validates: Requirements 9.3, 9.6
    """
    # Login to get initial refresh token
    login_response = await test_client.post(
        "/api/auth/login",
        json={
            "email": admin_user.email,
            "password": "Admin123!"
        }
    )
    assert login_response.status_code == 200
    refresh_token_1 = login_response.json()["refresh_token"]
    
    # First refresh
    refresh_response_1 = await test_client.post(
        "/api/auth/refresh",
        json={
            "refresh_token": refresh_token_1
        }
    )
    assert refresh_response_1.status_code == 200
    refresh_token_2 = refresh_response_1.json()["refresh_token"]
    
    # Second refresh
    refresh_response_2 = await test_client.post(
        "/api/auth/refresh",
        json={
            "refresh_token": refresh_token_2
        }
    )
    assert refresh_response_2.status_code == 200
    refresh_token_3 = refresh_response_2.json()["refresh_token"]
    
    # Third refresh
    refresh_response_3 = await test_client.post(
        "/api/auth/refresh",
        json={
            "refresh_token": refresh_token_3
        }
    )
    assert refresh_response_3.status_code == 200
    
    # All tokens should be different
    assert refresh_token_1 != refresh_token_2
    assert refresh_token_2 != refresh_token_3
    assert refresh_token_1 != refresh_token_3
    
    # Old tokens should not work
    old_token_response = await test_client.post(
        "/api/auth/refresh",
        json={
            "refresh_token": refresh_token_1
        }
    )
    assert old_token_response.status_code == 401


# ── Tests for PUT /auth/me/password endpoint ─────────────────────────────────

@pytest.mark.asyncio
async def test_change_password_success(
    test_client,
    db_session: AsyncSession,
    admin_user: User
):
    """
    Test that PUT /auth/me/password successfully changes the password.
    Validates: Requirements 5.1, 5.3
    """
    # Login to get access token
    login_response = await test_client.post(
        "/api/auth/login",
        json={
            "email": admin_user.email,
            "password": "Admin123!"
        }
    )
    assert login_response.status_code == 200
    access_token = login_response.json()["access_token"]
    
    # Change password
    change_response = await test_client.put(
        "/api/auth/me/password",
        headers={"Authorization": f"Bearer {access_token}"},
        json={
            "current_password": "Admin123!",
            "new_password": "NewPassword123!"
        }
    )
    
    # Verify response
    assert change_response.status_code == 200
    data = change_response.json()
    assert "message" in data
    assert "Password aggiornata" in data["message"]
    
    # Verify old password no longer works
    old_login_response = await test_client.post(
        "/api/auth/login",
        json={
            "email": admin_user.email,
            "password": "Admin123!"
        }
    )
    assert old_login_response.status_code == 401
    
    # Verify new password works
    new_login_response = await test_client.post(
        "/api/auth/login",
        json={
            "email": admin_user.email,
            "password": "NewPassword123!"
        }
    )
    assert new_login_response.status_code == 200


@pytest.mark.asyncio
async def test_change_password_wrong_current_password(
    test_client,
    db_session: AsyncSession,
    admin_user: User
):
    """
    Test that PUT /auth/me/password rejects incorrect current password.
    Validates: Requirements 5.2
    """
    # Login to get access token
    login_response = await test_client.post(
        "/api/auth/login",
        json={
            "email": admin_user.email,
            "password": "Admin123!"
        }
    )
    assert login_response.status_code == 200
    access_token = login_response.json()["access_token"]
    
    # Try to change password with wrong current password
    change_response = await test_client.put(
        "/api/auth/me/password",
        headers={"Authorization": f"Bearer {access_token}"},
        json={
            "current_password": "WrongPassword!",
            "new_password": "NewPassword123!"
        }
    )
    
    # Verify response
    assert change_response.status_code == 400
    data = change_response.json()
    assert "Password attuale non corretta" in data["detail"]
    
    # Verify original password still works
    verify_login_response = await test_client.post(
        "/api/auth/login",
        json={
            "email": admin_user.email,
            "password": "Admin123!"
        }
    )
    assert verify_login_response.status_code == 200


@pytest.mark.asyncio
async def test_change_password_too_short(
    test_client,
    db_session: AsyncSession,
    admin_user: User
):
    """
    Test that PUT /auth/me/password rejects passwords shorter than 8 characters.
    Validates: Requirements 5.3
    """
    # Login to get access token
    login_response = await test_client.post(
        "/api/auth/login",
        json={
            "email": admin_user.email,
            "password": "Admin123!"
        }
    )
    assert login_response.status_code == 200
    access_token = login_response.json()["access_token"]
    
    # Try to change password with too short new password
    change_response = await test_client.put(
        "/api/auth/me/password",
        headers={"Authorization": f"Bearer {access_token}"},
        json={
            "current_password": "Admin123!",
            "new_password": "Short1!"
        }
    )
    
    # Verify response (422 for validation error)
    assert change_response.status_code == 422
    
    # Verify original password still works
    verify_login_response = await test_client.post(
        "/api/auth/login",
        json={
            "email": admin_user.email,
            "password": "Admin123!"
        }
    )
    assert verify_login_response.status_code == 200


@pytest.mark.asyncio
async def test_change_password_revokes_all_refresh_tokens(
    test_client,
    db_session: AsyncSession,
    admin_user: User
):
    """
    Test that PUT /auth/me/password revokes all refresh tokens for security.
    Validates: Requirements 5.4
    """
    import hashlib
    
    # Login multiple times to create multiple refresh tokens
    login_response_1 = await test_client.post(
        "/api/auth/login",
        json={
            "email": admin_user.email,
            "password": "Admin123!"
        }
    )
    assert login_response_1.status_code == 200
    access_token = login_response_1.json()["access_token"]
    refresh_token_1 = login_response_1.json()["refresh_token"]
    
    login_response_2 = await test_client.post(
        "/api/auth/login",
        json={
            "email": admin_user.email,
            "password": "Admin123!"
        }
    )
    assert login_response_2.status_code == 200
    refresh_token_2 = login_response_2.json()["refresh_token"]
    
    # Verify both refresh tokens work before password change
    refresh_test_1 = await test_client.post(
        "/api/auth/refresh",
        json={"refresh_token": refresh_token_1}
    )
    assert refresh_test_1.status_code == 200
    
    # Note: refresh_token_1 is now revoked due to single-use rotation
    # So we need to use the new token from refresh_test_1
    new_refresh_token_1 = refresh_test_1.json()["refresh_token"]
    
    # Change password
    change_response = await test_client.put(
        "/api/auth/me/password",
        headers={"Authorization": f"Bearer {access_token}"},
        json={
            "current_password": "Admin123!",
            "new_password": "NewPassword123!"
        }
    )
    assert change_response.status_code == 200
    
    # Verify all refresh tokens are now revoked in the database
    result = await db_session.execute(
        select(RefreshToken).where(RefreshToken.user_id == admin_user.id)
    )
    all_tokens = result.scalars().all()
    
    # All tokens should be revoked
    for token in all_tokens:
        assert token.revoked is True
    
    # Verify refresh tokens no longer work
    refresh_fail_1 = await test_client.post(
        "/api/auth/refresh",
        json={"refresh_token": new_refresh_token_1}
    )
    assert refresh_fail_1.status_code == 401
    
    refresh_fail_2 = await test_client.post(
        "/api/auth/refresh",
        json={"refresh_token": refresh_token_2}
    )
    assert refresh_fail_2.status_code == 401


@pytest.mark.asyncio
async def test_change_password_requires_authentication(
    test_client,
    db_session: AsyncSession,
    admin_user: User
):
    """
    Test that PUT /auth/me/password requires authentication.
    """
    # Try to change password without authentication
    change_response = await test_client.put(
        "/api/auth/me/password",
        json={
            "current_password": "Admin123!",
            "new_password": "NewPassword123!"
        }
    )
    
    # Verify response (403 for missing credentials)
    assert change_response.status_code == 403


@pytest.mark.asyncio
async def test_change_password_with_invalid_token(
    test_client,
    db_session: AsyncSession,
    admin_user: User
):
    """
    Test that PUT /auth/me/password rejects invalid access tokens.
    """
    # Try to change password with invalid token
    change_response = await test_client.put(
        "/api/auth/me/password",
        headers={"Authorization": "Bearer invalid_token_here"},
        json={
            "current_password": "Admin123!",
            "new_password": "NewPassword123!"
        }
    )
    
    # Verify response (401 for invalid token)
    assert change_response.status_code == 401


@pytest.mark.asyncio
async def test_change_password_regular_user(
    test_client,
    db_session: AsyncSession,
    regular_user: User
):
    """
    Test that regular users (non-admin) can change their password.
    Validates: Requirements 5.1
    """
    # Login as regular user
    login_response = await test_client.post(
        "/api/auth/login",
        json={
            "email": regular_user.email,
            "password": "User123!"
        }
    )
    assert login_response.status_code == 200
    access_token = login_response.json()["access_token"]
    
    # Change password
    change_response = await test_client.put(
        "/api/auth/me/password",
        headers={"Authorization": f"Bearer {access_token}"},
        json={
            "current_password": "User123!",
            "new_password": "NewUserPass123!"
        }
    )
    
    # Verify response
    assert change_response.status_code == 200
    
    # Verify new password works
    new_login_response = await test_client.post(
        "/api/auth/login",
        json={
            "email": regular_user.email,
            "password": "NewUserPass123!"
        }
    )
    assert new_login_response.status_code == 200


@pytest.mark.asyncio
async def test_change_password_minimum_length_boundary(
    test_client,
    db_session: AsyncSession,
    admin_user: User
):
    """
    Test password change with exactly 8 characters (minimum valid length).
    Validates: Requirements 5.3
    """
    # Login to get access token
    login_response = await test_client.post(
        "/api/auth/login",
        json={
            "email": admin_user.email,
            "password": "Admin123!"
        }
    )
    assert login_response.status_code == 200
    access_token = login_response.json()["access_token"]
    
    # Change password to exactly 8 characters
    change_response = await test_client.put(
        "/api/auth/me/password",
        headers={"Authorization": f"Bearer {access_token}"},
        json={
            "current_password": "Admin123!",
            "new_password": "Pass123!"
        }
    )
    
    # Verify response (should succeed)
    assert change_response.status_code == 200
    
    # Verify new password works
    new_login_response = await test_client.post(
        "/api/auth/login",
        json={
            "email": admin_user.email,
            "password": "Pass123!"
        }
    )
    assert new_login_response.status_code == 200


@pytest.mark.asyncio
async def test_change_password_access_token_still_works_after_change(
    test_client,
    db_session: AsyncSession,
    admin_user: User
):
    """
    Test that the access token used to change password still works after the change.
    (Only refresh tokens are revoked, not the current access token)
    """
    # Login to get access token
    login_response = await test_client.post(
        "/api/auth/login",
        json={
            "email": admin_user.email,
            "password": "Admin123!"
        }
    )
    assert login_response.status_code == 200
    access_token = login_response.json()["access_token"]
    
    # Change password
    change_response = await test_client.put(
        "/api/auth/me/password",
        headers={"Authorization": f"Bearer {access_token}"},
        json={
            "current_password": "Admin123!",
            "new_password": "NewPassword123!"
        }
    )
    assert change_response.status_code == 200
    
    # Verify the same access token still works for authenticated requests
    me_response = await test_client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    assert me_response.status_code == 200
    data = me_response.json()
    assert data["id"] == admin_user.id


# ── Property-Based Tests ─────────────────────────────────────────────────────

import hashlib
from hypothesis import given, strategies as st, settings, assume


@pytest.mark.asyncio
@pytest.mark.parametrize("num_rotations", [1, 2, 3, 4, 5])
async def test_property_refresh_token_single_use_rotation(
    num_rotations: int,
    test_client,
    db_session: AsyncSession,
    admin_user: User
):
    """
    # Feature: ai-hub-v2, Property 17: Refresh token rotation — single-use
    
    **Validates: Requirements 9.3, 9.4, 9.5, 9.6**
    
    Property: For any valid refresh token RT1, after a successful call to 
    POST /auth/refresh that returns RT2, a second call with RT1 must return 
    HTTP 401 (token revoked), and RT2 must work correctly.
    
    This property test verifies that:
    1. Each refresh token can only be used once (single-use pattern)
    2. After using a refresh token, it is revoked in the database
    3. The new refresh token returned works correctly
    4. This behavior holds for multiple successive rotations
    
    Args:
        num_rotations: Number of successive token rotations to test (1-5)
        test_client: Async HTTP test client
        db_session: Database session
        admin_user: Test user fixture
    """
    # Login to get initial refresh token
    login_response = await test_client.post(
        "/api/auth/login",
        json={
            "email": admin_user.email,
            "password": "Admin123!"
        }
    )
    assert login_response.status_code == 200
    current_refresh_token = login_response.json()["refresh_token"]
    
    # Track all used tokens to verify they're all revoked
    used_tokens = []
    
    # Perform N successive rotations
    for rotation_num in range(num_rotations):
        # Store the current token before rotation
        used_tokens.append(current_refresh_token)
        
        # Use the current refresh token to get new tokens
        refresh_response = await test_client.post(
            "/api/auth/refresh",
            json={"refresh_token": current_refresh_token}
        )
        
        # Verify refresh succeeded
        assert refresh_response.status_code == 200, \
            f"Rotation {rotation_num + 1} failed with status {refresh_response.status_code}"
        
        refresh_data = refresh_response.json()
        assert "access_token" in refresh_data
        assert "refresh_token" in refresh_data
        assert "token_type" in refresh_data
        
        new_refresh_token = refresh_data["refresh_token"]
        new_access_token = refresh_data["access_token"]
        
        # Verify new refresh token is different from old one (rotation occurred)
        assert new_refresh_token != current_refresh_token, \
            f"Rotation {rotation_num + 1}: New token should be different from old token"
        
        # Verify new access token works for authenticated requests
        me_response = await test_client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {new_access_token}"}
        )
        assert me_response.status_code == 200, \
            f"Rotation {rotation_num + 1}: New access token should work"
        assert me_response.json()["id"] == admin_user.id
        
        # CRITICAL: Verify old token is now revoked (single-use property)
        old_token_reuse_response = await test_client.post(
            "/api/auth/refresh",
            json={"refresh_token": current_refresh_token}
        )
        assert old_token_reuse_response.status_code == 401, \
            f"Rotation {rotation_num + 1}: Old token should be revoked (got {old_token_reuse_response.status_code})"
        assert "Sessione scaduta" in old_token_reuse_response.json()["detail"], \
            f"Rotation {rotation_num + 1}: Should return 'Sessione scaduta' message"
        
        # Update current token for next iteration
        current_refresh_token = new_refresh_token
    
    # Final verification: ALL previously used tokens should be revoked
    for idx, old_token in enumerate(used_tokens):
        reuse_response = await test_client.post(
            "/api/auth/refresh",
            json={"refresh_token": old_token}
        )
        assert reuse_response.status_code == 401, \
            f"Token {idx + 1} should remain revoked after all rotations"
    
    # Verify the final token still works (hasn't been used yet)
    final_refresh_response = await test_client.post(
        "/api/auth/refresh",
        json={"refresh_token": current_refresh_token}
    )
    assert final_refresh_response.status_code == 200, \
        "Final token should still work as it hasn't been used yet"
    
    # Verify in database: all used tokens are marked as revoked
    for old_token in used_tokens:
        token_hash = hashlib.sha256(old_token.encode()).hexdigest()
        result = await db_session.execute(
            select(RefreshToken).where(RefreshToken.token_hash == token_hash)
        )
        token_record = result.scalar_one_or_none()
        assert token_record is not None, f"Token should exist in database"
        assert token_record.revoked is True, f"Token should be marked as revoked in database"


# ── Property-Based Tests for Password Change ─────────────────────────────────


# ── Property-Based Tests for Password Change ─────────────────────────────────


@pytest.mark.asyncio
async def test_property_password_change_round_trip(
    test_client,
    db_session: AsyncSession,
    admin_user: User
):
    """
    # Feature: ai-hub-v2, Property 9: Cambio password round trip
    
    **Validates: Requirements 5.1**
    
    Property: For any user and any valid new password (≥ 8 characters), after a 
    successful call to PUT /auth/me/password, login with the new password must 
    return HTTP 200, and login with the old password must return HTTP 401.
    
    This property test verifies that:
    1. Password change succeeds for any valid password
    2. The new password immediately works for authentication
    3. The old password is immediately invalidated
    4. The authentication round-trip is consistent
    
    Args:
        test_client: Async HTTP test client
        db_session: Database session
        admin_user: Test user fixture with known password "Admin123!"
    """
    from hypothesis import given, strategies as st, settings
    
    # Test with multiple generated passwords (all >= 8 characters)
    test_passwords = [
        "Password123!",
        "MySecureP@ss",
        "Test1234",
        "LongPasswordWith123",
        "Short123",  # Fixed: was "Sh0rt!" (6 chars), now 8 chars
        "AnotherP@ssw0rd",
        "ValidPass123",
        "SecureKey999",
        "MyP@ssw0rd",
        "TestPass2024"
    ]
    
    for new_password in test_passwords:
        # Skip if same as old password
        if new_password == "Admin123!":
            continue
            
        # Login to get access token
        login_response = await test_client.post(
            "/api/auth/login",
            json={
                "email": admin_user.email,
                "password": "Admin123!"
            }
        )
        assert login_response.status_code == 200, "Initial login should succeed"
        access_token = login_response.json()["access_token"]
        
        # Change password
        change_response = await test_client.put(
            "/api/auth/me/password",
            headers={"Authorization": f"Bearer {access_token}"},
            json={
                "current_password": "Admin123!",
                "new_password": new_password
            }
        )
        
        # Verify password change succeeded
        assert change_response.status_code == 200, \
            f"Password change should succeed for valid password '{new_password}' (got {change_response.status_code})"
        
        # CRITICAL: Verify old password no longer works (authentication round-trip - part 1)
        old_login_response = await test_client.post(
            "/api/auth/login",
            json={
                "email": admin_user.email,
                "password": "Admin123!"
            }
        )
        assert old_login_response.status_code == 401, \
            f"Login with old password should fail after password change to '{new_password}'"
        
        # CRITICAL: Verify new password works (authentication round-trip - part 2)
        new_login_response = await test_client.post(
            "/api/auth/login",
            json={
                "email": admin_user.email,
                "password": new_password
            }
        )
        assert new_login_response.status_code == 200, \
            f"Login with new password '{new_password}' should succeed (got {new_login_response.status_code})"
        
        # Verify the new login returns valid tokens
        new_login_data = new_login_response.json()
        assert "access_token" in new_login_data, "New login should return access_token"
        assert "refresh_token" in new_login_data, "New login should return refresh_token"
        
        # Verify the new access token works for authenticated requests
        me_response = await test_client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {new_login_data['access_token']}"}
        )
        assert me_response.status_code == 200, "New access token should work"
        assert me_response.json()["id"] == admin_user.id, "Should return correct user"
        
        # Reset password for next test iteration
        reset_response = await test_client.put(
            "/api/auth/me/password",
            headers={"Authorization": f"Bearer {new_login_data['access_token']}"},
            json={
                "current_password": new_password,
                "new_password": "Admin123!"
            }
        )
        assert reset_response.status_code == 200, f"Password reset should succeed after testing '{new_password}'"


@pytest.mark.asyncio
async def test_property_short_password_rejected(
    test_client,
    db_session: AsyncSession,
    admin_user: User
):
    """
    # Feature: ai-hub-v2, Property 10: Password corta rifiutata
    
    **Validates: Requirements 5.3**
    
    Property: For any string of length < 8 characters used as new_password, 
    the call to PUT /auth/me/password must return HTTP 422.
    
    This property test verifies that:
    1. All passwords shorter than 8 characters are rejected
    2. The rejection happens at validation level (HTTP 422)
    3. The original password remains unchanged after rejection
    4. This validation is consistent across all possible short passwords
    
    Args:
        test_client: Async HTTP test client
        db_session: Database session
        admin_user: Test user fixture with known password "Admin123!"
    """
    # Test with multiple short passwords (0-7 characters)
    short_passwords = [
        "",           # 0 chars
        "a",          # 1 char
        "ab",         # 2 chars
        "abc",        # 3 chars
        "abcd",       # 4 chars
        "abcde",      # 5 chars
        "abcdef",     # 6 chars
        "abcdefg",    # 7 chars
        "Pass1!",     # 6 chars with special
        "Test12",     # 6 chars with numbers
    ]
    
    for short_password in short_passwords:
        # Login to get access token
        login_response = await test_client.post(
            "/api/auth/login",
            json={
                "email": admin_user.email,
                "password": "Admin123!"
            }
        )
        assert login_response.status_code == 200, "Initial login should succeed"
        access_token = login_response.json()["access_token"]
        
        # Try to change password with short password
        change_response = await test_client.put(
            "/api/auth/me/password",
            headers={"Authorization": f"Bearer {access_token}"},
            json={
                "current_password": "Admin123!",
                "new_password": short_password
            }
        )
        
        # CRITICAL: Verify short password is rejected with HTTP 422 (validation error)
        assert change_response.status_code == 422, \
            f"Short password (length {len(short_password)}) should be rejected with HTTP 422 (got {change_response.status_code})"
        
        # Verify original password still works (password was not changed)
        verify_login_response = await test_client.post(
            "/api/auth/login",
            json={
                "email": admin_user.email,
                "password": "Admin123!"
            }
        )
        assert verify_login_response.status_code == 200, \
            f"Original password should still work after rejected password change (short password length: {len(short_password)})"


@pytest.mark.asyncio
async def test_property_password_change_revokes_all_refresh_tokens(
    test_client,
    db_session: AsyncSession,
    admin_user: User
):
    """
    # Feature: ai-hub-v2, Property 11: Cambio password revoca refresh token
    
    **Validates: Requirements 5.4**
    
    Property: For any user with one or more refresh tokens active, after a 
    successful call to PUT /auth/me/password, all refresh tokens must have 
    revoked = TRUE in the database.
    
    This property test verifies that:
    1. Password change revokes ALL refresh tokens, regardless of count
    2. The revocation is persisted in the database
    3. Revoked tokens cannot be used for authentication
    4. This security measure is consistent across different token counts
    
    Args:
        test_client: Async HTTP test client
        db_session: Database session
        admin_user: Test user fixture with known password "Admin123!"
    """
    # Test with different numbers of refresh tokens (1-5)
    for num_refresh_tokens in [1, 2, 3, 4, 5]:
        new_password = f"NewPass{num_refresh_tokens}23!"
        
        # Create multiple refresh tokens by logging in multiple times
        refresh_tokens = []
        access_token = None
        
        for i in range(num_refresh_tokens):
            login_response = await test_client.post(
                "/api/auth/login",
                json={
                    "email": admin_user.email,
                    "password": "Admin123!"
                }
            )
            assert login_response.status_code == 200, f"Login {i+1} should succeed"
            login_data = login_response.json()
            refresh_tokens.append(login_data["refresh_token"])
            # Keep the last access token for password change
            access_token = login_data["access_token"]
        
        # Verify all refresh tokens work before password change
        for idx, token in enumerate(refresh_tokens):
            refresh_response = await test_client.post(
                "/api/auth/refresh",
                json={"refresh_token": token}
            )
            assert refresh_response.status_code == 200, \
                f"Refresh token {idx+1} should work before password change"
            # Update the token since it's single-use
            refresh_tokens[idx] = refresh_response.json()["refresh_token"]
        
        # Change password
        change_response = await test_client.put(
            "/api/auth/me/password",
            headers={"Authorization": f"Bearer {access_token}"},
            json={
                "current_password": "Admin123!",
                "new_password": new_password
            }
        )
        
        # Verify password change succeeded
        assert change_response.status_code == 200, \
            f"Password change should succeed (got {change_response.status_code})"
        
        # CRITICAL: Verify all refresh tokens are revoked in the database
        result = await db_session.execute(
            select(RefreshToken).where(RefreshToken.user_id == admin_user.id)
        )
        all_tokens = result.scalars().all()
        
        # All tokens should be revoked
        assert len(all_tokens) > 0, "Should have refresh tokens in database"
        for token in all_tokens:
            assert token.revoked is True, \
                f"All refresh tokens should be revoked after password change (found non-revoked token with {num_refresh_tokens} tokens)"
        
        # CRITICAL: Verify all refresh tokens no longer work
        for idx, token in enumerate(refresh_tokens):
            refresh_fail_response = await test_client.post(
                "/api/auth/refresh",
                json={"refresh_token": token}
            )
            assert refresh_fail_response.status_code == 401, \
                f"Refresh token {idx+1} should not work after password change (got {refresh_fail_response.status_code})"
            assert "Sessione scaduta" in refresh_fail_response.json()["detail"], \
                f"Should return 'Sessione scaduta' message for revoked token"
        
        # Verify new login with new password creates working refresh token
        new_login_response = await test_client.post(
            "/api/auth/login",
            json={
                "email": admin_user.email,
                "password": new_password
            }
        )
        assert new_login_response.status_code == 200, "New login should succeed"
        new_refresh_token = new_login_response.json()["refresh_token"]
        
        # Verify new refresh token works
        new_refresh_response = await test_client.post(
            "/api/auth/refresh",
            json={"refresh_token": new_refresh_token}
        )
        assert new_refresh_response.status_code == 200, \
            "New refresh token should work after password change"
        
        # Reset password for next test iteration
        reset_response = await test_client.put(
            "/api/auth/me/password",
            headers={"Authorization": f"Bearer {new_login_response.json()['access_token']}"},
            json={
                "current_password": new_password,
                "new_password": "Admin123!"
            }
        )
        assert reset_response.status_code == 200, f"Password reset should succeed after testing {num_refresh_tokens} tokens"
