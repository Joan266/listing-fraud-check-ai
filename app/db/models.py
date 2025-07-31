import uuid
import enum
from sqlalchemy import Column, String, JSON, Enum as SQLAlchemyEnum, func, TIMESTAMP, ForeignKey, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from .session import Base

class JobStatus(enum.Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    
class User(Base):
    __tablename__ = "users"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    
class FraudCheck(Base):
    __tablename__ = "fraud_checks"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    input_hash = Column(String(64), nullable=False, unique=True, index=True)
    status = Column(SQLAlchemyEnum(JobStatus), nullable=False, default=JobStatus.PENDING)
    input_data = Column(JSON, nullable=False)
    analysis_steps = Column(JSON, nullable=True) 
    final_report = Column(JSON, nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    chat = relationship("Chat", back_populates="fraud_check", uselist=False)
    updated_at = Column(TIMESTAMP(timezone=True), 
                     server_default=func.now(), 
                     onupdate=func.now())
    session_id = Column(String(36), index=True, nullable=False)  

class Chat(Base):
    __tablename__ = "chats"
    
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    status = Column(SQLAlchemyEnum(JobStatus), nullable=False, default=JobStatus.PENDING)
    fraud_check_id = Column(PG_UUID(as_uuid=True), ForeignKey("fraud_checks.id"), nullable=True)
    message_count = Column(Integer, default=0)
    extracted_data = Column(JSON, nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    session_id = Column(String(36), index=True, nullable=False)  
    fraud_check = relationship("FraudCheck", back_populates="chat")
    messages = relationship("ChatMessage", back_populates="chat", cascade="all, delete-orphan")

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chat_id = Column(PG_UUID(as_uuid=True), ForeignKey("chats.id"), nullable=False)
    role = Column(String(50), nullable=False)  # Added length limit
    content = Column(String, nullable=False)  # Consider TEXT for large messages
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    
    chat = relationship("Chat", back_populates="messages")