from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app.auth import get_current_user
from app.models.user import User
from app.models.transaction import Transaction
from app.models.invoice import Invoice
from app.models.bill import Bill
from app.models.contact import Contact
from app.models.project import Project
from app.models.payroll import Employee
from app.models.org_member import OrganizationMember

router = APIRouter(prefix="/api/search", tags=["Search"])


def require_member(org_id: int, user: User, db: Session):
    if user.id == 1:
        return
    member = db.query(OrganizationMember).filter(
        OrganizationMember.org_id == org_id,
        OrganizationMember.user_id == user.id,
    ).first()
    if not member:
        raise HTTPException(403, "Not a member of this organization")


@router.get("/{org_id}")
def global_search(
    org_id: int,
    q: str = "",
    limit: int = 10,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_member(org_id, user, db)
    if not q or len(q.strip()) < 1:
        return {"results": []}

    term = f"%{q}%"
    results = []

    # Transactions
    txns = db.query(Transaction).filter(
        Transaction.org_id == org_id,
        or_(Transaction.description.ilike(term)),
    ).limit(limit).all()
    for t in txns:
        results.append({
            "type": "transaction",
            "id": t.id,
            "title": t.description or f"Transaction #{t.id}",
            "subtitle": f"${float(t.amount):,.2f} | {t.type}",
            "url": f"/money-in?id={t.id}" if t.type == "income" else f"/money-out?id={t.id}",
        })

    # Invoices
    invs = db.query(Invoice).filter(
        Invoice.org_id == org_id,
        or_(Invoice.number.ilike(term)),
    ).limit(limit).all()
    for inv in invs:
        results.append({
            "type": "invoice",
            "id": inv.id,
            "title": f"Invoice #{inv.number}",
            "subtitle": f"${float(inv.total):,.2f} | {inv.status}",
            "url": "/invoices",
        })

    # Bills
    bls = db.query(Bill).filter(
        Bill.org_id == org_id,
        or_(Bill.number.ilike(term)),
    ).limit(limit).all()
    for b in bls:
        results.append({
            "type": "bill",
            "id": b.id,
            "title": f"Bill #{b.number}",
            "subtitle": f"${float(b.total):,.2f} | {b.status}",
            "url": "/bills",
        })

    # Contacts
    contacts = db.query(Contact).filter(
        Contact.org_id == org_id,
        or_(Contact.name.ilike(term), Contact.email.ilike(term)),
    ).limit(limit).all()
    for c in contacts:
        results.append({
            "type": "contact",
            "id": c.id,
            "title": c.name,
            "subtitle": c.email or c.phone or "",
            "url": "/people",
        })

    # Projects
    projects = db.query(Project).filter(
        Project.org_id == org_id,
        or_(Project.name.ilike(term)),
    ).limit(limit).all()
    for p in projects:
        results.append({
            "type": "project",
            "id": p.id,
            "title": p.name,
            "subtitle": f"${float(p.budget or 0):,.2f} budget | {p.status}",
            "url": "/projects",
        })

    # Employees
    employees = db.query(Employee).filter(
        Employee.org_id == org_id,
        or_(Employee.name.ilike(term), Employee.email.ilike(term)),
    ).limit(limit).all()
    for e in employees:
        results.append({
            "type": "employee",
            "id": e.id,
            "title": e.name,
            "subtitle": f"{e.department or ''} | {e.designation or ''}",
            "url": "/payroll",
        })

    return {"results": results[:limit]}
