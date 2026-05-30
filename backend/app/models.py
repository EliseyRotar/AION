from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Float, ForeignKey, Table, JSON, Enum as SQLEnum, Date, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base
from app.utils import utcnow
import enum

user_groups = Table('user_groups', Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id', ondelete='CASCADE')),
    Column('group_id', Integer, ForeignKey('groups.id', ondelete='CASCADE'))
)

group_agents = Table('group_agents', Base.metadata,
    Column('group_id', Integer, ForeignKey('groups.id', ondelete='CASCADE')),
    Column('agent_id', Integer, ForeignKey('agents.id', ondelete='CASCADE'))
)

user_agents = Table('user_agents', Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id', ondelete='CASCADE')),
    Column('agent_id', Integer, ForeignKey('agents.id', ondelete='CASCADE'))
)

class UserRole(enum.Enum):
    ADMIN = "admin"
    USER = "user"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255))
    role = Column(SQLEnum(UserRole), default=UserRole.USER)
    is_active = Column(Boolean, default=True)
    avatar_color = Column(String(7), default="#6366f1")
    created_at = Column(DateTime, default=utcnow)

    groups = relationship("Group", secondary=user_groups, back_populates="users")
    agents = relationship("Agent", secondary=user_agents, back_populates="users")
    conversations = relationship("Conversation", back_populates="user", cascade="all, delete-orphan")

class Group(Base):
    __tablename__ = "groups"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text)
    color = Column(String(7), default="#10b981")
    created_at = Column(DateTime, default=utcnow)

    users = relationship("User", secondary=user_groups, back_populates="groups")
    agents = relationship("Agent", secondary=group_agents, back_populates="groups")

class Agent(Base):
    __tablename__ = "agents"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    system_prompt = Column(Text, nullable=False)
    welcome_message = Column(Text, default="Ciao! Come posso aiutarti?")
    base_model = Column(String(100), default="llama-3.3-70b-versatile")
    temperature = Column(Float, default=0.7)  # was String(10) — fix #4
    max_tokens = Column(Integer, default=2048)
    avatar_emoji = Column(String(10), default="🤖")
    primary_color = Column(String(7), default="#6366f1")
    fallback_to_general = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)
    created_by = Column(Integer, ForeignKey('users.id'))
    created_at = Column(DateTime, default=utcnow)

    groups = relationship("Group", secondary=group_agents, back_populates="agents")
    users = relationship("User", secondary=user_agents, back_populates="agents")
    documents = relationship("Document", back_populates="agent", cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="agent", cascade="all, delete-orphan")

class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True, index=True)
    agent_id = Column(Integer, ForeignKey('agents.id', ondelete='CASCADE'))
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_type = Column(String(50))
    file_size = Column(Integer)
    chunk_count = Column(Integer, default=0)
    status = Column(String(50), default="processing")
    uploaded_at = Column(DateTime, default=utcnow)

    agent = relationship("Agent", back_populates="documents")

class Conversation(Base):
    __tablename__ = "conversations"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'))
    agent_id = Column(Integer, ForeignKey('agents.id', ondelete='CASCADE'))
    title = Column(String(255), default="Nuova conversazione")
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    user = relationship("User", back_populates="conversations")
    agent = relationship("Agent", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")

class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey('conversations.id', ondelete='CASCADE'))
    role = Column(String(20), nullable=False)
    content = Column(Text, nullable=False)
    sources = Column(JSON)
    from_documents = Column(Boolean, default=False)
    feedback = Column(String(4))  # 'up', 'down', NULL
    feedback_user_id = Column(Integer, ForeignKey('users.id'))
    token_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=utcnow)

    conversation = relationship("Conversation", back_populates="messages")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    actor_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'))
    action = Column(String(50), nullable=False)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(Integer)
    detail = Column(JSON)
    created_at = Column(DateTime, default=utcnow, index=True)

    actor = relationship("User", foreign_keys=[actor_id])

class UsageStat(Base):
    __tablename__ = "usage_stats"
    id = Column(Integer, primary_key=True, index=True)
    agent_id = Column(Integer, ForeignKey('agents.id', ondelete='CASCADE'), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    date = Column(Date, nullable=False, index=True)
    message_count = Column(Integer, default=0)
    token_count = Column(Integer, default=0)

    __table_args__ = (UniqueConstraint('agent_id', 'user_id', 'date', name='uq_usage_stats_agent_user_date'),)

class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    id = Column(Integer, primary_key=True, index=True)
    token_hash = Column(String(64), unique=True, nullable=False)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    revoked = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utcnow)

    user = relationship("User")
