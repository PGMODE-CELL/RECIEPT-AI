from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.auth import get_current_user
from app.models.user import User
from app.models.notification import Notification
from app.models.org_member import OrganizationMember
from app.services.notifications import generate_all_notifications

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


def require_member(org_id: int, user: User, db: Session):
    if user.id == 1:
        return
    member = db.query(OrganizationMember).filter(
        OrganizationMember.org_id == org_id,
        OrganizationMember.user_id == user.id,
    ).first()
    if not member:
        raise HTTPException(403, "Not a member of this organization")


def _serialize(n: Notification):
    return {
        "id": n.id,
        "org_id": n.org_id,
        "type": n.type,
        "title": n.title,
        "message": n.message,
        "reference_type": n.reference_type,
        "reference_id": n.reference_id,
        "data": n.data,
        "read": n.read,
        "created_at": n.created_at.isoformat(),
    }


@router.get("/{org_id}")
def list_notifications(
    org_id: int,
    limit: int = 50,
    unread_only: bool = False,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_member(org_id, user, db)
    q = db.query(Notification).filter(Notification.org_id == org_id)
    if unread_only:
        q = q.filter(~Notification.read)
    notifications = q.order_by(desc(Notification.created_at)).limit(limit).all()
    unread_count = db.query(Notification).filter(
        Notification.org_id == org_id, ~Notification.read
    ).count()
    return {"notifications": [_serialize(n) for n in notifications], "unread_count": unread_count}


@router.post("/{org_id}/generate")
def generate_notifications(
    org_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_member(org_id, user, db)
    result = generate_all_notifications(db, org_id)
    db.commit()
    return result


@router.put("/{org_id}/read/{notification_id}")
def mark_read(
    org_id: int,
    notification_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_member(org_id, user, db)
    n = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.org_id == org_id,
    ).first()
    if not n:
        raise HTTPException(404, "Notification not found")
    n.read = True
    db.commit()
    return _serialize(n)


@router.put("/{org_id}/read-all")
def mark_all_read(
    org_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_member(org_id, user, db)
    db.query(Notification).filter(
        Notification.org_id == org_id, ~Notification.read
    ).update({"read": True})
    db.commit()
    return {"ok": True}
