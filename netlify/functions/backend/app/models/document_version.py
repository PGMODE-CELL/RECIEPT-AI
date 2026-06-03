from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from datetime import datetime, timezone

from app.database import Base


class DocumentVersion(Base):
    __tablename__ = "document_versions"

    id = Column(Integer, primary_key=True)
    org_id = Column(Integer, ForeignKey("organizations.id"))
    document_name = Column(String(255))
    version_number = Column(Integer, default=1)
    file_url = Column(String(500))
    file_type = Column(String(50))
    file_size = Column(Integer)
    created_by = Column(String(255))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
