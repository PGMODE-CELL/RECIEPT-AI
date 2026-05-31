from sqlalchemy import Column, Integer, String, ForeignKey, Boolean, DateTime
from datetime import datetime

from app.database import Base


class ApiToken(Base):
    __tablename__ = "api_tokens"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String(100))
    token = Column(String(255), unique=True)
    scopes = Column(String(500), default="read")  # read, write, admin
    last_used_at = Column(DateTime, nullable=True)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
