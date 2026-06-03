from fastapi import APIRouter, HTTPException, Depends, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database_async import get_async_db as get_db
from app.models.user import User
from app.models.contact import Contact
from app.auth import get_current_user
from app.encryption import encrypt_dict, decrypt_dict

router = APIRouter(prefix="/api/contacts", tags=["Contacts"])


@router.post("/{org_id}")
async def add_contact(
    org_id: int,
    name: str = Form(...),
    email: str = Form(None),
    phone: str = Form(None),
    type: str = Form("customer"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
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
    await db.commit()
    await db.refresh(contact)
    return decrypt_dict({"id": contact.id, "org_id": contact.org_id, "name": contact.name, "email": contact.email, "phone": contact.phone, "type": contact.type}, ["email", "phone"])


@router.get("/{org_id}")
async def list_contacts(
    org_id: int,
    page: int = 1,
    per_page: int = 25,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * per_page
    total = (await db.execute(select(func.count()).select_from(Contact).filter(Contact.org_id == org_id))).scalar()
    result = await db.execute(
        select(Contact)
        .filter(Contact.org_id == org_id)
        .order_by(Contact.name)
        .offset(offset)
        .limit(per_page)
    )
    contacts = result.scalars().all()
    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "items": [decrypt_dict({
            "id": c.id, "org_id": c.org_id, "name": c.name,
            "email": c.email, "phone": c.phone, "type": c.type,
        }, ["email", "phone"]) for c in contacts],
    }


@router.get("/{org_id}/{contact_id}")
async def get_contact(
    org_id: int,
    contact_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    contact = (
        await db.execute(
            select(Contact).filter(Contact.id == contact_id, Contact.org_id == org_id)
        )
    ).scalar_one_or_none()
    if not contact:
        raise HTTPException(404, "Contact not found")
    return decrypt_dict({
        "id": contact.id, "org_id": contact.org_id, "name": contact.name,
        "email": contact.email, "phone": contact.phone, "type": contact.type,
    }, ["email", "phone"])


@router.put("/{org_id}/{contact_id}")
async def update_contact(
    org_id: int,
    contact_id: int,
    name: str = Form(None),
    email: str = Form(None),
    phone: str = Form(None),
    type: str = Form(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    contact = (
        await db.execute(
            select(Contact).filter(Contact.id == contact_id, Contact.org_id == org_id)
        )
    ).scalar_one_or_none()
    if not contact:
        raise HTTPException(404, "Contact not found")
    encrypted = encrypt_dict({"email": email, "phone": phone}, ["email", "phone"])
    if name is not None: contact.name = name
    if email is not None: contact.email = encrypted["email"]
    if phone is not None: contact.phone = encrypted["phone"]
    if type is not None: contact.type = type
    await db.commit()
    return decrypt_dict({"id": contact.id, "org_id": contact.org_id, "name": contact.name, "email": contact.email, "phone": contact.phone, "type": contact.type}, ["email", "phone"])


@router.delete("/{org_id}/{contact_id}")
async def delete_contact(
    org_id: int,
    contact_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    contact = (
        await db.execute(
            select(Contact).filter(Contact.id == contact_id, Contact.org_id == org_id)
        )
    ).scalar_one_or_none()
    if not contact:
        raise HTTPException(404, "Contact not found")
    await db.delete(contact)
    await db.commit()
    return {"message": "Contact deleted"}
