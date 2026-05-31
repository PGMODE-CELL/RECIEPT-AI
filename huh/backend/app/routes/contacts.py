from fastapi import APIRouter, Depends, Form
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.contact import Contact
from app.auth import get_current_user
from app.encryption import encrypt_dict, decrypt_dict

router = APIRouter(prefix="/api/contacts", tags=["Contacts"])


@router.post("/{org_id}")
def add_contact(
    org_id: int,
    name: str = Form(...),
    email: str = Form(None),
    phone: str = Form(None),
    type: str = Form("customer"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    encrypted = encrypt_dict({"email": email, "phone": phone}, ["email", "phone"])
    contact = Contact(
        org_id=org_id,
        name=name,
        email=encrypted["email"],
        phone=encrypted["phone"],
        type=type,
    )
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return decrypt_dict({"id": contact.id, "org_id": contact.org_id, "name": contact.name, "email": contact.email, "phone": contact.phone, "type": contact.type}, ["email", "phone"])


@router.get("/{org_id}")
def list_contacts(
    org_id: int,
    page: int = 1,
    per_page: int = 25,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    offset = (page - 1) * per_page
    total = db.query(Contact).filter(Contact.org_id == org_id).count()
    contacts = (
        db.query(Contact)
        .filter(Contact.org_id == org_id)
        .order_by(Contact.name)
        .offset(offset)
        .limit(per_page)
        .all()
    )
    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "items": [decrypt_dict({
            "id": c.id, "org_id": c.org_id, "name": c.name,
            "email": c.email, "phone": c.phone, "type": c.type,
        }, ["email", "phone"]) for c in contacts],
    }
