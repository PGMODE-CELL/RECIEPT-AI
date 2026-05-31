from pydantic import BaseModel
from typing import Optional


class SetupOrgRequest(BaseModel):
    name: str
    country: str
    tax_id: Optional[str] = None
