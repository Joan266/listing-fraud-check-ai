import uuid
import enum
from sqlalchemy import Column, String, JSON, Enum as SQLAlchemyEnum, func, text, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from .session import Base

class JobStatus(enum.Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class FraudCheck(Base):
    __tablename__ = "fraud_checks"

    # FIX: Change 'server_default' to 'default' to generate the UUID in Python.
    # This is compatible with both SQLite and PostgreSQL.
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    input_hash = Column(String(64), nullable=False, unique=True, index=True)
    status = Column(SQLAlchemyEnum(JobStatus), nullable=False, default=JobStatus.PENDING)
    input_data = Column(JSON, nullable=False)
    final_report = Column(JSON, nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())