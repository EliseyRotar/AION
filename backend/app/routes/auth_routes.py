from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from pydantic import BaseModel, EmailStr, Field
from slowapi import Limiter
from slowapi.util import get_remote_address
from app.database import get_db
from app.models import User, RefreshToken
from app.auth import (
    verify_password, create_access_token, create_refresh_token,
    get_current_user, verify_refresh_token, get_password_hash,
)
import hashlib

router = APIRouter(prefix="/auth", tags=["Auth"])
limiter = Limiter(key_func=get_remote_address)

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
@limiter.limit("10/minute")  # Fix #6: brute-force protection
async def login(request: Request, body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Credenziali non valide")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disattivato")

    access_token = create_access_token(data={"sub": user.id})
    refresh_token = await create_refresh_token(user.id, db)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": 3600,
    }


@router.post("/refresh", response_model=RefreshResponse)
async def refresh_token(request: RefreshRequest, db: AsyncSession = Depends(get_db)):
    user = await verify_refresh_token(request.refresh_token, db)

    old_token_hash = hashlib.sha256(request.refresh_token.encode()).hexdigest()
    await db.execute(
        update(RefreshToken)
        .where(RefreshToken.token_hash == old_token_hash)
        .values(revoked=True)
    )
    await db.commit()

    new_access_token = create_access_token(data={"sub": user.id})
    new_refresh_token = await create_refresh_token(user.id, db)

    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer",
    }


# Fix #7: logout endpoint that revokes the refresh token
@router.post("/logout")
async def logout(
    request: RefreshRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    token_hash = hashlib.sha256(request.refresh_token.encode()).hexdigest()
    await db.execute(
        update(RefreshToken)
        .where(RefreshToken.token_hash == token_hash, RefreshToken.user_id == current_user.id)
        .values(revoked=True)
    )
    await db.commit()
    return {"message": "Logout effettuato"}


@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "username": current_user.username,
        "full_name": current_user.full_name,
        "role": current_user.role.value,
        "avatar_color": current_user.avatar_color,
    }


@router.put("/me/password")
async def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(request.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Password attuale non corretta")

    await db.execute(
        update(User).where(User.id == current_user.id)
        .values(hashed_password=get_password_hash(request.new_password))
    )
    # Fix #8: revoke all refresh tokens so other sessions are invalidated
    await db.execute(
        update(RefreshToken)
        .where(RefreshToken.user_id == current_user.id, RefreshToken.revoked == False)
        .values(revoked=True)
    )
    await db.commit()

    return {
        "message": "Password aggiornata con successo",
        "detail": "Tutti i dispositivi sono stati disconnessi per sicurezza",
    }
