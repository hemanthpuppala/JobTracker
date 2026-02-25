from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from .config import DB_PATH
from .models.db_models import Base

engine = create_engine(f"sqlite:///{DB_PATH}", echo=False)

# Enable foreign keys for SQLite
@event.listens_for(engine, "connect")
def _set_sqlite_pragma(dbapi_conn, connection_record):
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_session():
    """FastAPI dependency that yields a SQLAlchemy session."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def init_tables():
    """Create all tables if they don't exist (for initial setup / dev)."""
    Base.metadata.create_all(bind=engine)
