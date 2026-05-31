from sqlalchemy import Column, Integer, String, ForeignKey, Numeric, Date, JSON
from sqlalchemy.orm import relationship
from datetime import date

from app.database import Base


class Bill(Base):
    __tablename__ = "bills"

    id = Column(Integer, primary_key=True)
    org_id = Column(Integer, ForeignKey("organizations.id"))
    contact_id = Column(Integer, ForeignKey("contacts.id"))
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    number = Column(String(50))
    date = Column(Date, default=date.today)
    due_date = Column(Date)
    total = Column(Numeric(15, 2), default=0)
    paid = Column(Numeric(15, 2), default=0)
    status = Column(String(20), default="draft")
    items = Column(JSON, default=list)

    org = relationship("Organization", back_populates="bills")
    contact = relationship("Contact", back_populates="bills")
