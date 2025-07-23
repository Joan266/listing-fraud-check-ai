from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

# This block handles a specific setting needed for SQLite, which is useful for local testing.
connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}

# The database engine is the entry point to your database.
engine = create_engine(settings.DATABASE_URL, connect_args=connect_args)

# SessionLocal is a factory for creating new database sessions.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base is a class that your SQLAlchemy models will inherit from.
Base = declarative_base()

def get_db():
    """
    A dependency function that provides a database session to your API endpoints
    and ensures the session is always closed after the request is finished.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()