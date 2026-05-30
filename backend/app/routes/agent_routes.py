from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, or_
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import List, Optional
import os
import uuid
import aiofiles
from app.database import get_db
from app.models import User, Group, Agent, Document, UserRole
from app.auth import get_current_user, get_current_admin
from app.config import settings
from app.rag_engine import rag_engine, groq_client
from app.audit import create_audit_log

router = APIRouter(prefix="/agents", tags=["Agents"])

class AgentCreate(BaseModel):
    name: str
    description: Optional[str] = None
    system_prompt: str
    welcome_message: str = "Ciao! Come posso aiutarti?"
    base_model: str = "llama-3.3-70b-versatile"
    temperature: float = 0.7
    avatar_emoji: str = "🤖"
    primary_color: str = "#6366f1"
    fallback_to_general: bool = True
    group_ids: List[int] = []
    user_ids: List[int] = []

class AgentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    system_prompt: Optional[str] = None
    welcome_message: Optional[str] = None
    base_model: Optional[str] = None
    temperature: Optional[float] = None
    avatar_emoji: Optional[str] = None
    primary_color: Optional[str] = None
    fallback_to_general: Optional[bool] = None
    group_ids: Optional[List[int]] = None
    user_ids: Optional[List[int]] = None

@router.get("/models")
async def list_models(current_user: User = Depends(get_current_user)):
    all_models = await groq_client.list_models()
    chat_models = [m for m in all_models if 'embed' not in m.lower()]
    return {"models": chat_models}

@router.get("")
async def list_my_agents(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role == UserRole.ADMIN:
        result = await db.execute(select(Agent).where(Agent.is_active == True))
        agents = result.scalars().all()
    else:
        # Fix #9: single SQL query with JOINs instead of Python filtering
        user_result = await db.execute(
            select(User).options(selectinload(User.groups)).where(User.id == current_user.id)
        )
        user = user_result.scalar_one()
        group_ids = [g.id for g in user.groups]

        stmt = (
            select(Agent)
            .where(Agent.is_active == True)
            .where(
                or_(
                    Agent.users.any(User.id == current_user.id),
                    Agent.groups.any(Group.id.in_(group_ids)) if group_ids else False,
                )
            )
            .distinct()
        )
        result = await db.execute(stmt)
        agents = result.scalars().all()

    return [
        {
            "id": a.id, "name": a.name, "description": a.description,
            "avatar_emoji": a.avatar_emoji, "primary_color": a.primary_color,
            "welcome_message": a.welcome_message, "base_model": a.base_model,
        }
        for a in agents
    ]

@router.get("/all")
async def list_all_agents(db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin)):
    result = await db.execute(
        select(Agent).options(
            selectinload(Agent.documents),
            selectinload(Agent.groups),
            selectinload(Agent.users)
        )
    )
    agents = result.scalars().all()
    return [{
        "id": a.id, "name": a.name, "description": a.description, "system_prompt": a.system_prompt,
        "welcome_message": a.welcome_message, "base_model": a.base_model, "temperature": a.temperature,
        "avatar_emoji": a.avatar_emoji, "primary_color": a.primary_color, "is_active": a.is_active,
        "fallback_to_general": a.fallback_to_general,
        "documents": [{"id": d.id, "original_filename": d.original_filename, "status": d.status, "chunk_count": d.chunk_count} for d in a.documents],
        "groups": [{"id": g.id, "name": g.name, "color": g.color} for g in a.groups],
        "user_ids": [u.id for u in a.users]
    } for a in agents]

@router.post("")
async def create_agent(data: AgentCreate, db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin)):
    agent = Agent(
        name=data.name, description=data.description, system_prompt=data.system_prompt,
        welcome_message=data.welcome_message, base_model=data.base_model,
        temperature=data.temperature, avatar_emoji=data.avatar_emoji,
        primary_color=data.primary_color, fallback_to_general=data.fallback_to_general,
        created_by=admin.id
    )

    if data.group_ids:
        result = await db.execute(select(Group).where(Group.id.in_(data.group_ids)))
        agent.groups = list(result.scalars().all())
    if data.user_ids:
        result = await db.execute(select(User).where(User.id.in_(data.user_ids)))
        agent.users = list(result.scalars().all())

    db.add(agent)
    await db.flush()

    await create_audit_log(
        db=db, actor_id=admin.id, action="create", entity_type="agent",
        entity_id=agent.id, detail={"name": agent.name, "base_model": agent.base_model}
    )

    await db.commit()
    return {"message": "Agente creato", "id": agent.id}

@router.put("/{agent_id}")
async def update_agent(agent_id: int, data: AgentUpdate, db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin)):
    result = await db.execute(
        select(Agent).options(selectinload(Agent.groups), selectinload(Agent.users)).where(Agent.id == agent_id)
    )
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agente non trovato")

    changes = {}
    for field_name in ("name", "description", "welcome_message", "base_model",
                       "temperature", "avatar_emoji", "primary_color", "fallback_to_general"):
        new_val = getattr(data, field_name)
        if new_val is not None and new_val != getattr(agent, field_name):
            if field_name == "system_prompt":
                changes[field_name] = "updated"
            else:
                changes[field_name] = {"old": getattr(agent, field_name), "new": new_val}
            setattr(agent, field_name, new_val)
    if data.system_prompt is not None and data.system_prompt != agent.system_prompt:
        changes["system_prompt"] = "updated"
        agent.system_prompt = data.system_prompt

    if data.group_ids is not None:
        result = await db.execute(select(Group).where(Group.id.in_(data.group_ids)))
        agent.groups = list(result.scalars().all())
        changes["groups"] = "updated"

    if data.user_ids is not None:
        result = await db.execute(select(User).where(User.id.in_(data.user_ids)))
        agent.users = list(result.scalars().all())
        changes["users"] = "updated"

    await create_audit_log(
        db=db, actor_id=admin.id, action="update", entity_type="agent",
        entity_id=agent.id, detail={"changes": changes}
    )

    await db.commit()
    return {"message": "Agente aggiornato"}

@router.delete("/{agent_id}")
async def delete_agent(agent_id: int, db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin)):
    result = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agente non trovato")

    agent_info = {"name": agent.name, "base_model": agent.base_model}
    await db.delete(agent)

    await create_audit_log(
        db=db, actor_id=admin.id, action="delete", entity_type="agent",
        entity_id=agent_id, detail=agent_info
    )

    await db.commit()
    return {"message": "Agente eliminato"}


async def process_doc_bg(doc_id: int, file_path: str, agent_id: int, filename: str):
    from app.database import async_session_maker
    async with async_session_maker() as db:
        try:
            result_data = await rag_engine.process_document(file_path, agent_id, filename)

            chunk_count = result_data.get('chunks', 0) if isinstance(result_data, dict) else result_data

            await db.execute(
                update(Document).where(Document.id == doc_id).values(status="ready", chunk_count=chunk_count)
            )
            await db.commit()

            print(f"✅ Documento aggiornato: {filename}")
            if isinstance(result_data, dict):
                print(f"   📄 Chunks: {chunk_count}")
                print(f"   📊 Caratteri totali: {result_data.get('total_characters', 'N/A'):,}")
        except Exception as e:
            print(f"❌ Errore elaborazione documento {filename}: {e}")
            await db.execute(update(Document).where(Document.id == doc_id).values(status="error"))
            await db.commit()


@router.post("/{agent_id}/documents")
async def upload_document(
    agent_id: int,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    result = await db.execute(select(Agent).where(Agent.id == agent_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Agente non trovato")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ['.pdf', '.docx', '.doc', '.txt']:
        raise HTTPException(status_code=400, detail="Formato non supportato")

    # Fix #3: read in chunks so we never buffer a huge file before checking size
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    chunks = []
    total_size = 0
    chunk_size = 64 * 1024  # 64 KB
    while True:
        chunk = await file.read(chunk_size)
        if not chunk:
            break
        total_size += len(chunk)
        if total_size > max_bytes:
            raise HTTPException(
                status_code=413,
                detail=f"File troppo grande (max {settings.MAX_UPLOAD_SIZE_MB}MB)"
            )
        chunks.append(chunk)
    content = b"".join(chunks)

    unique_name = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, unique_name)
    async with aiofiles.open(file_path, 'wb') as f:
        await f.write(content)

    doc = Document(
        agent_id=agent_id, filename=unique_name, original_filename=file.filename,
        file_type=ext, file_size=len(content), status="processing"
    )
    db.add(doc)
    await db.flush()

    await create_audit_log(
        db=db, actor_id=admin.id, action="upload", entity_type="document", entity_id=doc.id,
        detail={"agent_id": agent_id, "filename": file.filename, "file_type": ext, "file_size": len(content)}
    )

    await db.commit()
    await db.refresh(doc)

    background_tasks.add_task(process_doc_bg, doc.id, file_path, agent_id, file.filename)
    return {"message": "Documento in elaborazione", "id": doc.id}
