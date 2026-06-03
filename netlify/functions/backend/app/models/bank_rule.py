from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from datetime import datetime, timezone

from app.database import Base


class BankRule(Base):
    __tablename__ = "bank_rules"

    id = Column(Integer, primary_key=True)
    org_id = Column(Integer, ForeignKey("organizations.id"))
    name = Column(String(255))
    match_type = Column(String(20))
    match_text = Column(String(255))
    category = Column(String(100))
    account_id = Column(Integer, ForeignKey("accounts.id"))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
