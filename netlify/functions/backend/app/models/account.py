from sqlalchemy import Column, Integer, String, ForeignKey, Numeric
from sqlalchemy.orm import relationship

from app.database import Base


class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True)
    org_id = Column(Integer, ForeignKey("organizations.id"))
    code = Column(String(20))
    name = Column(String(255))
    type = Column(String(20))  # asset, liability, equity, income, expense
    balance = Column(Numeric(15, 2), default=0)

    org = relationship("Organization", back_populates="accounts")
    debits = relationship(
        "TransactionLine",
        foreign_keys="TransactionLine.debit_account_id",
        back_populates="debit_account",
    )
    credits = relationship(
        "TransactionLine",
        foreign_keys="TransactionLine.credit_account_id",
        back_populates="credit_account",
    )
