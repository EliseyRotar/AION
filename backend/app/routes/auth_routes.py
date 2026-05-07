from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from pydantic import BaseModel, EmailStr, Field
from app.database import get_db
from app.models import User, RefreshToken
from app.auth import verify_password, create_access_token, create_refresh_token, get_current_user, verify_refresh_token, get_password_hash
import hashlib

router = APIRouter(prefix="/auth", tags=["Auth"])

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = 3600

class RefreshRequest(BaseModel):
    refresh_token: str

class RefreshResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)

@router.post("/login", response_model=Token)
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == request.email))
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Credenziali non valide")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disattivato")
    
    # Create access token (60 min expiration)
    access_token = create_access_token(data={"sub": user.id})
    
    # Create refresh token (30 days expiration)
    refresh_token = await create_refresh_token(user.id, db)
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": 3600
    }

@router.post("/refresh", response_model=RefreshResponse)
async def refresh_token(request: RefreshRequest, db: AsyncSession = Depends(get_db)):
    """
    Refresh token rotation endpoint.
    
    Validates the provided refresh token, issues new access and refresh tokens,
    and revokes the old refresh token (single-use pattern).
    
    Validates: Requirements 9.3, 9.6
    
    Args:
        request: RefreshRequest containing the refresh_token
        db: Database session
    
    Returns:
        RefreshResponse with new access_token and refresh_token
    
    Raises:
        HTTPException 401: If token is invalid, expired, or revoked
    """
    # Verify the refresh token and get the associated user
    user = await verify_refresh_token(request.refresh_token, db)
    
    # Calculate hash of the old token to revoke it
    old_token_hash = hashlib.sha256(request.refresh_token.encode()).hexdigest()
    
    # Revoke the old refresh token (single-use rotation)
    await db.execute(
        update(RefreshToken)
        .where(RefreshToken.token_hash == old_token_hash)
        .values(revoked=True)
    )
    await db.commit()
    
    # Create new access token
    new_access_token = create_access_token(data={"sub": user.id})
    
    # Create new refresh token
    new_refresh_token = await create_refresh_token(user.id, db)
    
    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer"
    }

@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "username": current_user.username,
        "full_name": current_user.full_name,
        "role": current_user.role.value,
        "avatar_color": current_user.avatar_color
    }

@router.put("/me/password")
async def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Change password for the authenticated user.
    
    Validates: Requirements 5.1, 5.2, 5.3, 5.4
    
    Steps:
    1. Verify current password matches stored hash
    2. Validate new password (min 8 chars - enforced by Pydantic)
    3. Update password hash
    4. Revoke all refresh tokens for security
    
    Args:
        request: ChangePasswordRequest with current_password and new_password
        current_user: Authenticated user from JWT token
        db: Database session
    
    Returns:
        Success message
    
    Raises:
        HTTPException 400: If current password is incorrect
        HTTPException 422: If new password is too short (handled by Pydantic)
    """
    # Verify current password
    if not verify_password(request.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=400,
            detail="Password attuale non corretta"
        )
    
    # Update password hash
    new_password_hash = get_password_hash(request.new_password)
    await db.execute(
        update(User)
        .where(User.id == current_user.id)
        .values(hashed_password=new_password_hash)
    )
    
    # Revoke all refresh tokens for this user (security measure)
    await db.execute(
        update(RefreshToken)
        .where(RefreshToken.user_id == current_user.id)
        .where(RefreshToken.revoked == False)
        .values(revoked=True)
    )
    
    await db.commit()
    
    return {
        "message": "Password aggiornata con successo",
        "detail": "Tutti i dispositivi sono stati disconnessi per sicurezza"
    }