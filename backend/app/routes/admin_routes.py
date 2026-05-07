from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from pydantic import BaseModel, EmailStr
from typing import List, Optional
import random
from app.database import get_db
from app.models import User, Group, Agent, Conversation, Document, UserRole, AuditLog
from app.auth import get_current_admin, get_password_hash
from app.audit import create_audit_log

router = APIRouter(prefix="/admin", tags=["Admin"])

AVATAR_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#ef4444", "#f97316", "#22c55e", "#14b8a6", "#3b82f6"]

class UserCreate(BaseModel):
    email: EmailStr
    username: str
    full_name: Optional[str] = None
    password: str
    role: str = "user"
    group_ids: List[int] = []

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    full_name: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None
    group_ids: Optional[List[int]] = None

class GroupCreate(BaseModel):
    name: str
    description: Optional[str] = None
    color: str = "#10b981"
    user_ids: List[int] = []

class GroupUpdate(BaseModel):  # <-- AGGIUNTO
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    user_ids: Optional[List[int]] = None

@router.get("/dashboard")
async def get_dashboard(db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin)):
    return {
        "total_users": await db.scalar(select(func.count(User.id))) or 0,
        "total_groups": await db.scalar(select(func.count(Group.id))) or 0,
        "total_agents": await db.scalar(select(func.count(Agent.id))) or 0,
        "total_conversations": await db.scalar(select(func.count(Conversation.id))) or 0,
        "total_documents": await db.scalar(select(func.count(Document.id))) or 0,
        "recent_conversations": []
    }

@router.get("/users")
async def list_users(db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin)):
    result = await db.execute(select(User).options(selectinload(User.groups)))
    users = result.scalars().all()
    return [{
        "id": u.id, "email": u.email, "username": u.username, "full_name": u.full_name,
        "role": u.role.value, "is_active": u.is_active, "avatar_color": u.avatar_color,
        "groups": [{"id": g.id, "name": g.name, "color": g.color} for g in u.groups]
    } for u in users]

@router.post("/users")
async def create_user(data: UserCreate, db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin)):
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email già in uso")
    
    user = User(
        email=data.email, username=data.username, full_name=data.full_name,
        hashed_password=get_password_hash(data.password),
        role=UserRole.ADMIN if data.role == "admin" else UserRole.USER,
        avatar_color=random.choice(AVATAR_COLORS)
    )
    
    if data.group_ids:
        result = await db.execute(select(Group).where(Group.id.in_(data.group_ids)))
        user.groups = list(result.scalars().all())
    
    db.add(user)
    await db.flush()  # Get the user ID before audit log
    
    # Audit log
    await create_audit_log(
        db=db,
        actor_id=admin.id,
        action="create",
        entity_type="user",
        entity_id=user.id,
        detail={"email": user.email, "username": user.username, "role": user.role.value}
    )
    
    await db.commit()
    return {"message": "Utente creato", "id": user.id}

@router.put("/users/{user_id}")
async def update_user(user_id: int, data: UserUpdate, db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin)):
    result = await db.execute(select(User).options(selectinload(User.groups)).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    
    # Track changes for audit log
    changes = {}
    if data.email and data.email != user.email:
        changes["email"] = {"old": user.email, "new": data.email}
        user.email = data.email
    if data.username and data.username != user.username:
        changes["username"] = {"old": user.username, "new": data.username}
        user.username = data.username
    if data.full_name and data.full_name != user.full_name:
        changes["full_name"] = {"old": user.full_name, "new": data.full_name}
        user.full_name = data.full_name
    if data.password:
        changes["password"] = "changed"
        user.hashed_password = get_password_hash(data.password)
    if data.is_active is not None and data.is_active != user.is_active:
        changes["is_active"] = {"old": user.is_active, "new": data.is_active}
        user.is_active = data.is_active
    if data.group_ids is not None:
        result = await db.execute(select(Group).where(Group.id.in_(data.group_ids)))
        user.groups = list(result.scalars().all())
        changes["groups"] = "updated"
    
    # Audit log
    await create_audit_log(
        db=db,
        actor_id=admin.id,
        action="update",
        entity_type="user",
        entity_id=user.id,
        detail={"changes": changes}
    )
    
    await db.commit()
    return {"message": "Utente aggiornato"}

@router.delete("/users/{user_id}")
async def delete_user(user_id: int, db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin)):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Non puoi eliminare te stesso")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    
    # Capture user info before deletion
    user_info = {"email": user.email, "username": user.username, "role": user.role.value}
    
    await db.delete(user)
    
    # Audit log
    await create_audit_log(
        db=db,
        actor_id=admin.id,
        action="delete",
        entity_type="user",
        entity_id=user_id,
        detail=user_info
    )
    
    await db.commit()
    return {"message": "Utente eliminato"}

@router.get("/groups")
async def list_groups(db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin)):
    result = await db.execute(select(Group).options(selectinload(Group.users)))
    groups = result.scalars().all()
    return [{
        "id": g.id, "name": g.name, "description": g.description, "color": g.color,
        "users": [{"id": u.id, "username": u.username, "avatar_color": u.avatar_color} for u in g.users]
    } for g in groups]

@router.post("/groups")
async def create_group(data: GroupCreate, db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin)):
    group = Group(name=data.name, description=data.description, color=data.color)
    if data.user_ids:
        result = await db.execute(select(User).where(User.id.in_(data.user_ids)))
        group.users = list(result.scalars().all())
    db.add(group)
    await db.flush()  # Get the group ID before audit log
    
    # Audit log
    await create_audit_log(
        db=db,
        actor_id=admin.id,
        action="create",
        entity_type="group",
        entity_id=group.id,
        detail={"name": group.name, "description": group.description, "color": group.color}
    )
    
    await db.commit()
    return {"message": "Gruppo creato", "id": group.id}

# 🔧 AGGIUNTO: Route UPDATE gruppo
@router.put("/groups/{group_id}")
async def update_group(
    group_id: int, 
    data: GroupUpdate, 
    db: AsyncSession = Depends(get_db), 
    admin: User = Depends(get_current_admin)
):
    result = await db.execute(
        select(Group).options(selectinload(Group.users)).where(Group.id == group_id)
    )
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Gruppo non trovato")
    
    # Track changes for audit log
    changes = {}
    if data.name is not None and data.name != group.name:
        changes["name"] = {"old": group.name, "new": data.name}
        group.name = data.name
    if data.description is not None and data.description != group.description:
        changes["description"] = {"old": group.description, "new": data.description}
        group.description = data.description
    if data.color is not None and data.color != group.color:
        changes["color"] = {"old": group.color, "new": data.color}
        group.color = data.color
    
    # Aggiorna utenti
    if data.user_ids is not None:
        result = await db.execute(select(User).where(User.id.in_(data.user_ids)))
        group.users = list(result.scalars().all())
        changes["users"] = "updated"
    
    # Audit log
    await create_audit_log(
        db=db,
        actor_id=admin.id,
        action="update",
        entity_type="group",
        entity_id=group.id,
        detail={"changes": changes}
    )
    
    await db.commit()
    return {"message": "Gruppo aggiornato"}

@router.delete("/groups/{group_id}")
async def delete_group(group_id: int, db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin)):
    result = await db.execute(select(Group).where(Group.id == group_id))
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Gruppo non trovato")
    
    # Capture group info before deletion
    group_info = {"name": group.name, "description": group.description, "color": group.color}
    
    await db.delete(group)
    
    # Audit log
    await create_audit_log(
        db=db,
        actor_id=admin.id,
        action="delete",
        entity_type="group",
        entity_id=group_id,
        detail=group_info
    )
    
    await db.commit()
    return {"message": "Gruppo eliminato"}

@router.get("/audit-logs")
async def get_audit_logs(
    page: int = 1,
    page_size: int = 50,
    actor_id: Optional[int] = None,
    entity_type: Optional[str] = None,
    action: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """
    Get audit logs with pagination and filters.
    
    Parameters:
    - page: Page number (1-indexed)
    - page_size: Number of items per page (default 50, max 100)
    - actor_id: Filter by user who performed the action
    - entity_type: Filter by entity type (user, agent, group, document)
    - action: Filter by action type (create, update, delete, upload, bulk_action)
    
    Returns:
    - items: List of audit log entries
    - total: Total number of matching records
    - page: Current page number
    - page_size: Items per page
    - total_pages: Total number of pages
    
    Requirements: 1.5, 1.6
    """
    # Validate and cap page_size
    if page_size > 100:
        page_size = 100
    if page_size < 1:
        page_size = 1
    if page < 1:
        page = 1
    
    # Build query with filters
    query = select(AuditLog).options(selectinload(AuditLog.actor))
    
    if actor_id is not None:
        query = query.where(AuditLog.actor_id == actor_id)
    if entity_type is not None:
        query = query.where(AuditLog.entity_type == entity_type)
    if action is not None:
        query = query.where(AuditLog.action == action)
    
    # Get total count
    count_query = select(func.count()).select_from(AuditLog)
    if actor_id is not None:
        count_query = count_query.where(AuditLog.actor_id == actor_id)
    if entity_type is not None:
        count_query = count_query.where(AuditLog.entity_type == entity_type)
    if action is not None:
        count_query = count_query.where(AuditLog.action == action)
    
    total = await db.scalar(count_query) or 0
    
    # Calculate pagination
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1
    offset = (page - 1) * page_size
    
    # Get paginated results, ordered by most recent first
    query = query.order_by(AuditLog.timestamp.desc()).offset(offset).limit(page_size)
    result = await db.execute(query)
    logs = result.scalars().all()
    
    # Format response
    items = []
    for log in logs:
        item = {
            "id": log.id,
            "timestamp": log.timestamp.isoformat(),
            "actor_id": log.actor_id,
            "actor_username": log.actor.username if log.actor else None,
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "detail": log.detail
        }
        items.append(item)
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }