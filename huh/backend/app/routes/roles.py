from fastapi import APIRouter, Depends, HTTPException, Form
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.org_member import OrganizationMember
from app.auth import get_current_user

router = APIRouter(prefix="/api/roles", tags=["Roles"])


@router.get("/{org_id}/members")
def list_members(org_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    members = db.query(OrganizationMember).filter(OrganizationMember.org_id == org_id).all()
    return [{
        "id": m.id, "user_id": m.user_id, "email": m.user.email,
        "name": m.user.full_name, "role": m.role,
    } for m in members]


@router.post("/{org_id}/members")
def add_member(
    org_id: int,
    email: str = Form(...),
    role: str = Form("viewer"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    target = db.query(User).filter(User.email == email).first()
    if not target:
        raise HTTPException(404, "User not found. They must register first.")
    existing = db.query(OrganizationMember).filter(
        OrganizationMember.org_id == org_id, OrganizationMember.user_id == target.id
    ).first()
    if existing:
        raise HTTPException(400, "Already a member")
    member = OrganizationMember(user_id=target.id, org_id=org_id, role=role)
    db.add(member)
    db.commit()
    return {"message": f"Added {email} as {role}"}


@router.put("/{org_id}/members/{member_id}")
def update_role(
    org_id: int, member_id: int,
    role: str = Form(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    member = db.query(OrganizationMember).filter(OrganizationMember.id == member_id, OrganizationMember.org_id == org_id).first()
    if not member:
        raise HTTPException(404, "Member not found")
    if role not in ("owner", "admin", "accountant", "viewer"):
        raise HTTPException(400, "Invalid role")
    member.role = role
    db.commit()
    return {"message": f"Role updated to {role}"}


@router.delete("/{org_id}/members/{member_id}")
def remove_member(
    org_id: int, member_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    member = db.query(OrganizationMember).filter(OrganizationMember.id == member_id, OrganizationMember.org_id == org_id).first()
    if not member:
        raise HTTPException(404, "Member not found")
    db.delete(member)
    db.commit()
    return {"message": "Member removed"}
