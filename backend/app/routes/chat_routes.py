import json
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel, Field
from typing import Optional, AsyncIterator
from datetime import datetime
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.database import get_db
from app.models import User, Agent, Conversation, Message
from app.auth import get_current_user
from app.rag_engine import rag_engine, groq_client, RelevanceLevel
from app.config import settings

router = APIRouter(prefix="/chat", tags=["Chat"])
limiter = Limiter(key_func=get_remote_address)


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    conversation_id: Optional[int] = None


# ── Prompt builders ────────────────────────────────────────────────────────────

def _build_prompt(strategy: str, context: str, query: str, agent_name: str) -> str:
    if strategy == "direct_answer":
        return (
            f"Basandoti ESCLUSIVAMENTE sui seguenti documenti, rispondi in modo diretto e preciso.\n\n"
            f"DOCUMENTI:\n{context}\n\nDOMANDA: {query}\n\n"
            "Rispondi direttamente senza dire 'secondo i documenti'."
        )
    if strategy in ("document_based", "hybrid"):
        return (
            f"Usa i seguenti documenti come base principale per rispondere.\n\n"
            f"DOCUMENTI:\n{context}\n\nDOMANDA: {query}\n\n"
            "Integra con conoscenze generali se necessario. Sii chiaro e diretto."
        )
    if strategy == "cautious_hybrid":
        return (
            f"Il seguente documento potrebbe essere correlato alla domanda.\n\n"
            f"DOCUMENTO:\n{context}\n\nDOMANDA: {query}\n\n"
            "Rispondi principalmente con conoscenze generali, menzionando il documento solo se utile."
        )
    if strategy == "no_fallback":
        return (
            f"Sei l'assistente \"{agent_name}\". Non hai documenti rilevanti per questa domanda.\n\n"
            f"DOMANDA: {query}\n\n"
            "Spiega educatamente che non hai informazioni su questo argomento e suggerisci di contattare il supporto."
        )
    # fallback / conversational
    return (
        f"Sei un assistente amichevole e competente.\n\nDOMANDA: {query}\n\n"
        "Rispondi in modo naturale e utile. Non menzionare documenti aziendali."
    )


# ── Helpers ────────────────────────────────────────────────────────────────────

async def _get_or_create_conversation(
    db: AsyncSession, request: ChatRequest, agent_id: int, user_id: int
) -> Conversation:
    if request.conversation_id:
        result = await db.execute(
            select(Conversation).where(
                Conversation.id == request.conversation_id,
                Conversation.user_id == user_id,
            )
        )
        conv = result.scalar_one_or_none()
        if not conv:
            raise HTTPException(status_code=404, detail="Conversazione non trovata")
        return conv

    title = request.message[:50] + ("..." if len(request.message) > 50 else "")
    conv = Conversation(user_id=user_id, agent_id=agent_id, title=title)
    db.add(conv)
    await db.commit()
    await db.refresh(conv)
    return conv


async def _load_history(db: AsyncSession, conv_id: int) -> list:
    """Load recent messages for conversation memory."""
    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conv_id)
        .order_by(Message.created_at.desc())
        .limit(settings.CHAT_HISTORY_TURNS * 2)
    )
    msgs = result.scalars().all()
    # Return in chronological order, only role+content
    return [{"role": m.role, "content": m.content} for m in reversed(msgs)]


async def _build_generation_inputs(
    agent: Agent, message: str, agent_id: int
) -> tuple:
    """Run RAG search and return (prompt, sources_json, from_documents, confidence, strategy)."""
    search = None
    try:
        search = await rag_engine.search_documents(agent_id=agent_id, query=message, k=6)
    except Exception as e:
        print(f"❌ RAG error: {e}")

    sources_json = None
    from_documents = False
    confidence = 0.0

    if search and search.recommended_strategy == "skip_simple_query":
        strategy = "conversational"
        prompt = _build_prompt("conversational", "", message, agent.name)

    elif search and search.has_relevant:
        from_documents = True
        confidence = search.confidence
        strategy = search.recommended_strategy

        top = [
            r for r in search.results
            if r.relevance in (RelevanceLevel.VERY_HIGH, RelevanceLevel.HIGH, RelevanceLevel.MEDIUM)
        ][:3]

        context = "\n".join(
            f"--- Documento {i+1}: {r.source} ---\n{r.content}\n"
            for i, r in enumerate(top)
        )
        sources_json = [
            {"source": r.source, "score": float(r.score),
             "confidence": float(r.confidence), "relevance": r.relevance.value}
            for r in top
        ]
        prompt = _build_prompt(strategy, context, message, agent.name)

    elif agent.fallback_to_general:
        strategy = "general_fallback"
        prompt = _build_prompt("general_fallback", "", message, agent.name)

    else:
        strategy = "no_fallback"
        prompt = _build_prompt("no_fallback", "", message, agent.name)

    return prompt, sources_json, from_documents, confidence, strategy


# ── Conversation endpoints ─────────────────────────────────────────────────────

@router.get("/conversations")
async def list_conversations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Conversation)
        .where(Conversation.user_id == current_user.id)
        .order_by(Conversation.updated_at.desc())
    )
    return [
        {"id": c.id, "title": c.title, "agent_id": c.agent_id,
         "updated_at": c.updated_at.isoformat(), "created_at": c.created_at.isoformat()}
        for c in result.scalars().all()
    ]


@router.get("/conversations/{conversation_id}")
async def get_conversation(
    conversation_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Conversation)
        .options(selectinload(Conversation.messages), selectinload(Conversation.agent))
        .where(Conversation.id == conversation_id, Conversation.user_id == current_user.id)
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversazione non trovata")

    return {
        "id": conv.id, "title": conv.title,
        "agent": {
            "id": conv.agent.id, "name": conv.agent.name,
            "avatar_emoji": conv.agent.avatar_emoji,
            "primary_color": conv.agent.primary_color,
            "welcome_message": conv.agent.welcome_message,
        },
        "messages": [
            {"id": m.id, "role": m.role, "content": m.content,
             "sources": m.sources, "from_documents": m.from_documents,
             "created_at": m.created_at.isoformat()}
            for m in conv.messages
        ],
    }


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == current_user.id,
        )
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversazione non trovata")
    await db.delete(conv)
    await db.commit()
    return {"message": "Conversazione eliminata"}


# ── Streaming chat endpoint ────────────────────────────────────────────────────

@router.post("/{agent_id}/stream")
@limiter.limit("30/minute")
async def send_message_stream(
    request: Request,
    agent_id: int,
    chat_request: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Streaming chat endpoint — returns SSE stream of text chunks.
    Saves the full response to DB once complete.
    """
    # Validate agent
    result = await db.execute(
        select(Agent).where(Agent.id == agent_id, Agent.is_active == True)
    )
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agente non trovato")

    print(f"Chat stream | user={current_user.username} agent={agent.name} msg='{chat_request.message[:60]}'")

    # Conversation
    conv = await _get_or_create_conversation(db, chat_request, agent_id, current_user.id)

    # Save user message
    user_msg = Message(conversation_id=conv.id, role="user", content=chat_request.message)
    db.add(user_msg)
    await db.commit()

    # Load history (excluding the message we just saved)
    history = await _load_history(db, conv.id)
    # Remove the last user message from history since it's already in the prompt
    if history and history[-1]["role"] == "user":
        history = history[:-1]

    # RAG
    prompt, sources_json, from_documents, confidence, strategy = await _build_generation_inputs(
        agent, chat_request.message, agent_id
    )

    async def event_generator() -> AsyncIterator[str]:
        full_text = ""

        # First event: metadata (conversation_id, sources, etc.)
        meta = {
            "type": "meta",
            "conversation_id": conv.id,
            "sources": sources_json,
            "from_documents": from_documents,
            "confidence": round(confidence, 1) if confidence else None,
            "strategy": strategy,
        }
        yield f"data: {json.dumps(meta)}\n\n"

        try:
            async for chunk in groq_client.stream(
                prompt=prompt,
                model=agent.base_model,
                system=agent.system_prompt,
                temperature=float(agent.temperature),
                max_tokens=int(agent.max_tokens) if agent.max_tokens else 2048,
                history=history,
            ):
                full_text += chunk
                yield f"data: {json.dumps({'type': 'chunk', 'text': chunk})}\n\n"

        except Exception as e:
            print(f"❌ Stream error: {e}")
            error_msg = "Si è verificato un errore. Riprova tra qualche istante."
            full_text = error_msg
            yield f"data: {json.dumps({'type': 'chunk', 'text': error_msg})}\n\n"

        # Save assistant message to DB
        from app.database import async_session_maker
        async with async_session_maker() as save_db:
            assistant_msg = Message(
                conversation_id=conv.id,
                role="assistant",
                content=full_text,
                sources=sources_json,
                from_documents=from_documents,
            )
            save_db.add(assistant_msg)
            # Update conversation timestamp
            result2 = await save_db.execute(
                select(Conversation).where(Conversation.id == conv.id)
            )
            c = result2.scalar_one_or_none()
            if c:
                c.updated_at = datetime.utcnow()
            await save_db.commit()
            await save_db.refresh(assistant_msg)

            yield f"data: {json.dumps({'type': 'done', 'message_id': assistant_msg.id})}\n\n"

        print(f"✅ Stream done | strategy={strategy} | len={len(full_text)}")

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# ── Non-streaming fallback (kept for compatibility) ────────────────────────────

@router.post("/{agent_id}")
@limiter.limit("30/minute")
async def send_message(
    request: Request,
    agent_id: int,
    chat_request: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Agent).where(Agent.id == agent_id, Agent.is_active == True)
    )
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agente non trovato")

    print(f"Chat | user={current_user.username} agent={agent.name} msg='{chat_request.message[:60]}'")

    conv = await _get_or_create_conversation(db, chat_request, agent_id, current_user.id)

    user_msg = Message(conversation_id=conv.id, role="user", content=chat_request.message)
    db.add(user_msg)
    await db.commit()

    history = await _load_history(db, conv.id)
    if history and history[-1]["role"] == "user":
        history = history[:-1]

    prompt, sources_json, from_documents, confidence, strategy = await _build_generation_inputs(
        agent, chat_request.message, agent_id
    )

    response_text = ""
    try:
        response_text = await groq_client.generate(
            prompt=prompt,
            model=agent.base_model,
            system=agent.system_prompt,
            temperature=float(agent.temperature),
            max_tokens=int(agent.max_tokens) if agent.max_tokens else 2048,
            history=history,
        )
    except Exception as e:
        print(f"❌ Generation error: {e}")
        response_text = "Si è verificato un errore tecnico. Riprova tra qualche istante."
        strategy = "generation_error"

    assistant_msg = Message(
        conversation_id=conv.id, role="assistant",
        content=response_text, sources=sources_json, from_documents=from_documents,
    )
    db.add(assistant_msg)
    conv.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(assistant_msg)

    print(f"✅ Response | strategy={strategy} | confidence={confidence:.1f}% | len={len(response_text)}")

    return {
        "conversation_id": conv.id,
        "message": {
            "id": assistant_msg.id, "role": "assistant",
            "content": response_text, "sources": sources_json,
            "from_documents": from_documents,
            "confidence": round(confidence, 1) if confidence else None,
            "strategy": strategy,
            "created_at": assistant_msg.created_at.isoformat(),
        },
    }
