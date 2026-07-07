from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

# --- Sync engine (used by RQ workers and Alembic) ---

connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Sync DB dependency — kept for RQ workers and backward compatibility."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# --- Async engine (used by FastAPI endpoints) ---

def _to_async_url(url: str) -> str:
    """Convert sync DB URL to async dialect (postgresql+asyncpg)."""
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+asyncpg://", 1)
    return url


_is_postgres = settings.DATABASE_URL.startswith(("postgresql://", "postgres://"))

if _is_postgres:
    async_engine = create_async_engine(
        _to_async_url(settings.DATABASE_URL),
        pool_size=settings.DB_POOL_SIZE,
        max_overflow=settings.DB_MAX_OVERFLOW,
    )
    AsyncSessionLocal = async_sessionmaker(
        async_engine, class_=AsyncSession, expire_on_commit=False
    )
else:
    async_engine = None
    AsyncSessionLocal = None


async def async_get_db():
    """Async DB dependency for FastAPI endpoints."""
    if AsyncSessionLocal is None:
        raise RuntimeError("Async DB not available — requires PostgreSQL + asyncpg.")
    async with AsyncSessionLocal() as session:
        yield session
