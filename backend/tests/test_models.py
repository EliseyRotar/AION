"""
Unit tests for new database models in v2.0

Tests verify that the new models (AuditLog, UsageStat, RefreshToken)
and the updated Message model can be created and saved correctly.

Feature: ai-hub-v2
Requirements: 1.1, 2.1, 5.5, 6.5, 9.5
"""

import pytest
from datetime import datetime, date, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models import (
    User, UserRole, Agent, Conversation, Message,
    AuditLog, UsageStat, RefreshToken
)


@pytest.mark.asyncio
async def test_audit_log_creation(db_session: AsyncSession, admin_user: User):
    """Test that AuditLog records can be created and saved correctly."""
    # Create an audit log entry
    audit_log = AuditLog(
        actor_id=admin_user.id,
        action="create",
        entity_type="user",
        entity_id=123,
        detail={"username": "test_user", "email": "test@example.com"}
    )
    
    db_session.add(audit_log)
    await db_session.commit()
    await db_session.refresh(audit_log)
    
    # Verify the audit log was created
    assert audit_log.id is not None
    assert audit_log.actor_id == admin_user.id
    assert audit_log.action == "create"
    assert audit_log.entity_type == "user"
    assert audit_log.entity_id == 123
    assert audit_log.detail["username"] == "test_user"
    assert audit_log.created_at is not None
    assert isinstance(audit_log.created_at, datetime)


@pytest.mark.asyncio
async def test_audit_log_with_null_actor(db_session: AsyncSession):
    """Test that AuditLog can be created with null actor_id (for deleted users)."""
    audit_log = AuditLog(
        actor_id=None,
        action="delete",
        entity_type="agent",
        entity_id=456,
        detail={"name": "Deleted Agent"}
    )
    
    db_session.add(audit_log)
    await db_session.commit()
    await db_session.refresh(audit_log)
    
    assert audit_log.id is not None
    assert audit_log.actor_id is None
    assert audit_log.action == "delete"


@pytest.mark.asyncio
async def test_usage_stat_creation(db_session: AsyncSession, admin_user: User):
    """Test that UsageStat records can be created and saved correctly."""
    # Create an agent first
    agent = Agent(
        name="Test Agent",
        system_prompt="You are a test agent",
        created_by=admin_user.id
    )
    db_session.add(agent)
    await db_session.commit()
    await db_session.refresh(agent)
    
    # Create a usage stat
    today = date.today()
    usage_stat = UsageStat(
        agent_id=agent.id,
        user_id=admin_user.id,
        date=today,
        message_count=10,
        token_count=5000
    )
    
    db_session.add(usage_stat)
    await db_session.commit()
    await db_session.refresh(usage_stat)
    
    # Verify the usage stat was created
    assert usage_stat.id is not None
    assert usage_stat.agent_id == agent.id
    assert usage_stat.user_id == admin_user.id
    assert usage_stat.date == today
    assert usage_stat.message_count == 10
    assert usage_stat.token_count == 5000


@pytest.mark.asyncio
async def test_usage_stat_unique_constraint(db_session: AsyncSession, admin_user: User):
    """Test that UsageStat enforces unique constraint on (agent_id, user_id, date)."""
    # Create an agent
    agent = Agent(
        name="Test Agent",
        system_prompt="You are a test agent",
        created_by=admin_user.id
    )
    db_session.add(agent)
    await db_session.commit()
    await db_session.refresh(agent)
    
    # Create first usage stat
    today = date.today()
    usage_stat1 = UsageStat(
        agent_id=agent.id,
        user_id=admin_user.id,
        date=today,
        message_count=5,
        token_count=2000
    )
    db_session.add(usage_stat1)
    await db_session.commit()
    
    # Try to create duplicate usage stat (should fail)
    usage_stat2 = UsageStat(
        agent_id=agent.id,
        user_id=admin_user.id,
        date=today,
        message_count=10,
        token_count=3000
    )
    db_session.add(usage_stat2)
    
    with pytest.raises(Exception):  # SQLAlchemy will raise IntegrityError
        await db_session.commit()


@pytest.mark.asyncio
async def test_refresh_token_creation(db_session: AsyncSession, admin_user: User):
    """Test that RefreshToken records can be created and saved correctly."""
    # Create a refresh token
    token_hash = "a" * 64  # SHA-256 produces 64 hex characters
    expires_at = datetime.utcnow() + timedelta(days=30)
    
    refresh_token = RefreshToken(
        token_hash=token_hash,
        user_id=admin_user.id,
        expires_at=expires_at,
        revoked=False
    )
    
    db_session.add(refresh_token)
    await db_session.commit()
    await db_session.refresh(refresh_token)
    
    # Verify the refresh token was created
    assert refresh_token.id is not None
    assert refresh_token.token_hash == token_hash
    assert refresh_token.user_id == admin_user.id
    assert refresh_token.expires_at == expires_at
    assert refresh_token.revoked is False
    assert refresh_token.created_at is not None


@pytest.mark.asyncio
async def test_refresh_token_unique_hash(db_session: AsyncSession, admin_user: User):
    """Test that RefreshToken enforces unique constraint on token_hash."""
    token_hash = "b" * 64
    expires_at = datetime.utcnow() + timedelta(days=30)
    
    # Create first refresh token
    refresh_token1 = RefreshToken(
        token_hash=token_hash,
        user_id=admin_user.id,
        expires_at=expires_at
    )
    db_session.add(refresh_token1)
    await db_session.commit()
    
    # Try to create duplicate token hash (should fail)
    refresh_token2 = RefreshToken(
        token_hash=token_hash,
        user_id=admin_user.id,
        expires_at=expires_at
    )
    db_session.add(refresh_token2)
    
    with pytest.raises(Exception):  # SQLAlchemy will raise IntegrityError
        await db_session.commit()


@pytest.mark.asyncio
async def test_refresh_token_revocation(db_session: AsyncSession, admin_user: User):
    """Test that RefreshToken can be revoked."""
    token_hash = "c" * 64
    expires_at = datetime.utcnow() + timedelta(days=30)
    
    refresh_token = RefreshToken(
        token_hash=token_hash,
        user_id=admin_user.id,
        expires_at=expires_at,
        revoked=False
    )
    db_session.add(refresh_token)
    await db_session.commit()
    await db_session.refresh(refresh_token)
    
    # Revoke the token
    refresh_token.revoked = True
    await db_session.commit()
    await db_session.refresh(refresh_token)
    
    assert refresh_token.revoked is True


@pytest.mark.asyncio
async def test_message_with_feedback(db_session: AsyncSession, admin_user: User, regular_user: User):
    """Test that Message model supports feedback fields."""
    # Create agent and conversation
    agent = Agent(
        name="Test Agent",
        system_prompt="You are a test agent",
        created_by=admin_user.id
    )
    db_session.add(agent)
    await db_session.commit()
    await db_session.refresh(agent)
    
    conversation = Conversation(
        user_id=regular_user.id,
        agent_id=agent.id,
        title="Test Conversation"
    )
    db_session.add(conversation)
    await db_session.commit()
    await db_session.refresh(conversation)
    
    # Create a message with feedback
    message = Message(
        conversation_id=conversation.id,
        role="assistant",
        content="This is a test response",
        feedback="up",
        feedback_user_id=regular_user.id,
        token_count=150
    )
    db_session.add(message)
    await db_session.commit()
    await db_session.refresh(message)
    
    # Verify the message was created with feedback
    assert message.id is not None
    assert message.feedback == "up"
    assert message.feedback_user_id == regular_user.id
    assert message.token_count == 150


@pytest.mark.asyncio
async def test_message_without_feedback(db_session: AsyncSession, admin_user: User, regular_user: User):
    """Test that Message model allows null feedback fields."""
    # Create agent and conversation
    agent = Agent(
        name="Test Agent",
        system_prompt="You are a test agent",
        created_by=admin_user.id
    )
    db_session.add(agent)
    await db_session.commit()
    await db_session.refresh(agent)
    
    conversation = Conversation(
        user_id=regular_user.id,
        agent_id=agent.id,
        title="Test Conversation"
    )
    db_session.add(conversation)
    await db_session.commit()
    await db_session.refresh(conversation)
    
    # Create a message without feedback
    message = Message(
        conversation_id=conversation.id,
        role="user",
        content="This is a test question",
        token_count=50
    )
    db_session.add(message)
    await db_session.commit()
    await db_session.refresh(message)
    
    # Verify the message was created without feedback
    assert message.id is not None
    assert message.feedback is None
    assert message.feedback_user_id is None
    assert message.token_count == 50


@pytest.mark.asyncio
async def test_message_feedback_update(db_session: AsyncSession, admin_user: User, regular_user: User):
    """Test that Message feedback can be updated (upsert behavior)."""
    # Create agent and conversation
    agent = Agent(
        name="Test Agent",
        system_prompt="You are a test agent",
        created_by=admin_user.id
    )
    db_session.add(agent)
    await db_session.commit()
    await db_session.refresh(agent)
    
    conversation = Conversation(
        user_id=regular_user.id,
        agent_id=agent.id,
        title="Test Conversation"
    )
    db_session.add(conversation)
    await db_session.commit()
    await db_session.refresh(conversation)
    
    # Create a message
    message = Message(
        conversation_id=conversation.id,
        role="assistant",
        content="This is a test response",
        token_count=100
    )
    db_session.add(message)
    await db_session.commit()
    await db_session.refresh(message)
    
    # Add feedback
    message.feedback = "up"
    message.feedback_user_id = regular_user.id
    await db_session.commit()
    await db_session.refresh(message)
    
    assert message.feedback == "up"
    
    # Update feedback
    message.feedback = "down"
    await db_session.commit()
    await db_session.refresh(message)
    
    assert message.feedback == "down"
    assert message.feedback_user_id == regular_user.id


@pytest.mark.asyncio
async def test_audit_log_relationship_with_user(db_session: AsyncSession, admin_user: User):
    """Test that AuditLog has proper relationship with User (actor)."""
    audit_log = AuditLog(
        actor_id=admin_user.id,
        action="update",
        entity_type="agent",
        entity_id=789,
        detail={"field": "name", "old": "Old Name", "new": "New Name"}
    )
    db_session.add(audit_log)
    await db_session.commit()
    await db_session.refresh(audit_log)
    
    # Access the actor relationship
    await db_session.refresh(audit_log, ["actor"])
    assert audit_log.actor is not None
    assert audit_log.actor.id == admin_user.id
    assert audit_log.actor.username == admin_user.username


@pytest.mark.asyncio
async def test_refresh_token_relationship_with_user(db_session: AsyncSession, admin_user: User):
    """Test that RefreshToken has proper relationship with User."""
    token_hash = "d" * 64
    expires_at = datetime.utcnow() + timedelta(days=30)
    
    refresh_token = RefreshToken(
        token_hash=token_hash,
        user_id=admin_user.id,
        expires_at=expires_at
    )
    db_session.add(refresh_token)
    await db_session.commit()
    await db_session.refresh(refresh_token)
    
    # Access the user relationship
    await db_session.refresh(refresh_token, ["user"])
    assert refresh_token.user is not None
    assert refresh_token.user.id == admin_user.id
    assert refresh_token.user.username == admin_user.username
