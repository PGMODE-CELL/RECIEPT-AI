from sqlalchemy import Column, Integer, String, ForeignKey, Numeric, Date, JSON
from sqlalchemy.orm import relationship
from datetime import date

from app.database import Base


class Receipt(Base):
    __tablename__ = "receipts"

    id = Column(Integer, primary_key=True)
    org_id = Column(Integer, ForeignKey("organizations.id"))
    file_name = Column(String(255))
    vendor = Column(String(255))
    date = Column(Date, default=date.today)
    total = Column(Numeric(15, 2))
    tax = Column(Numeric(15, 2))
    category = Column(String(100))
    status = Column(String(20), default="pending")  # pending, approved, posted
    extracted_data = Column(JSON)

    org = relationship("Organization", back_populates="receipts")
