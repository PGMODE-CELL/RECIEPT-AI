from pydantic import BaseModel
from typing import Optional


class SimpleTransactionRequest(BaseModel):
    org_id: int
    description: str
    amount: float
    type: str  # "money_in" or "money_out"
    category: str
    date: Optional[str] = None
    currency: Optional[str] = None
    exchange_rate: Optional[float] = None
    original_amount: Optional[float] = None
