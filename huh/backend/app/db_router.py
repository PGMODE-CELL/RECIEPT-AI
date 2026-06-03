from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.config import settings

_READ_URL = settings.DATABASE_READ_URL or settings.DATABASE_URL

_read_engine = create_engine(
    _READ_URL,
    connect_args={"check_same_thread": False} if "sqlite" in _READ_URL else {},
    pool_size=50,
    max_overflow=100,
    pool_pre_ping=True,
)

ReadSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_read_engine)

def get_read_db():
    db = ReadSessionLocal()
    try:
        yield db
    finally:
        db.close()
