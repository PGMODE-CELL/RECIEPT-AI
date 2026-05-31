from sqlalchemy import Column, Integer, String, ForeignKey, Numeric
from sqlalchemy.orm import relationship

from app.database import Base


class Contact(Base):
    __tablename__ = "contacts"

    id = Column(Integer, primary_key=True)
    org_id = Column(Integer, ForeignKey("organizations.id"))
    name = Column(String(255))
    email = Column(String(255))
    phone = Column(String(50))
    type = Column(String(20))  # customer, supplier
    balance = Column(Numeric(15, 2), default=0)

    org = relationship("Organization", back_populates="contacts")
    invoices = relationship("Invoice", back_populates="contact")
    bills = relationship("Bill", back_populates="contact")
