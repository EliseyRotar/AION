from datetime import timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.config import settings
from app.database import get_db
from app.models import User, UserRole, RefreshToken
from app.utils import utcnow
import secrets
import hashlib

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)
security = HTTPBearer()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    if "sub" in to_encode and isinstance(to_encode["sub"], int):
        to_encode["sub"] = str(to_encode["sub"])
    expire = utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Token non valido")
        user_id = int(user_id)
    except JWTError:
        raise HTTPException(status_code=401, detail="Token non valido")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise HTTPException(status_code=401, detail="Utente non trovato")

    return user

async def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Accesso riservato agli admin")
    return current_user

async def create_refresh_token(user_id: int, db: AsyncSession) -> str:
    token = secrets.token_hex(32)
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    expires_at = utcnow() + timedelta(days=30)

    refresh_token = RefreshToken(
        token_hash=token_hash,
        user_id=user_id,
        expires_at=expires_at,
        revoked=False
    )
    db.add(refresh_token)
    await db.commit()
    return token

async def verify_refresh_token(token: str, db: AsyncSession) -> User:
    token_hash = hashlib.sha256(token.encode()).hexdigest()

    result = await db.execute(
        select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    )
    refresh_token = result.scalar_one_or_none()

    if refresh_token is None or refresh_token.revoked:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sessione scaduta, effettua il login"
        )

    if refresh_token.expires_at < utcnow():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sessione scaduta, effettua il login"
        )

    result = await db.execute(
        select(User).where(User.id == refresh_token.user_id)
    )
    user = result.scalar_one_or_none()

    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Utente non trovato"
        )

    return user
