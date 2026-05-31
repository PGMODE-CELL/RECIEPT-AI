from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.organization import Organization
from app.auth import get_current_user

router = APIRouter(prefix="/api/orgs", tags=["Organizations"])


@router.get("")
def list_orgs(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(Organization)
        .filter(Organization.owner_id == user.id)
        .all()
    )
