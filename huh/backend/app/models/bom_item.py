from sqlalchemy import Column, Integer, ForeignKey, Numeric

from app.database import Base


class BomItem(Base):
    __tablename__ = "bom_items"

    id = Column(Integer, primary_key=True)
    org_id = Column(Integer, ForeignKey("organizations.id"))
    bom_id = Column(Integer, ForeignKey("boms.id"))
    product_id = Column(Integer, ForeignKey("inventory_items.id"))
    quantity = Column(Numeric(15, 2), default=0)
    unit_cost = Column(Numeric(15, 2), default=0)
