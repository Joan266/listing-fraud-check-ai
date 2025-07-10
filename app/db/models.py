# app/db/models.py
import uuid
from sqlalchemy import Column, String, JSON, Enum as SQLAlchemyEnum
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.types import TypeDecorator, CHAR
from .database import Base
import enum

class UUID(TypeDecorator):
    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            return dialect.type_descriptor(PG_UUID())
        else:
            return dialect.type_descriptor(CHAR(32))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        elif dialect.name == 'postgresql':
            return str(value)
        else:
            if not isinstance(value, uuid.UUID):
                return "%.32x" % uuid.UUID(value).int
            else:
                return "%.32x" % value.int

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        else:
            if not isinstance(value, uuid.UUID):
                value = uuid.UUID(value)
            return value

class JobStatus(str, enum.Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class FraudCheck(Base):
    __tablename__ = "fraud_checks"

    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    status = Column(SQLAlchemyEnum(JobStatus), nullable=False, default=JobStatus.PENDING)
    input_data = Column(JSON, nullable=False)
    result = Column(JSON, nullable=True)