from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from app.database_async import get_async_db as get_db
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


async def require_member(org_id: int, user: User, db: AsyncSession):
    member = (
        await db.execute(
            select(OrganizationMember).filter(
                OrganizationMember.org_id == org_id,
                OrganizationMember.user_id == user.id,
            )
        )
    ).scalar_one_or_none()
    if not member:
        raise HTTPException(403, "Not a member of this organization")


@router.get("/{org_id}")
async def global_search(
    org_id: int,
    q: str = "",
    limit: int = 10,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_member(org_id, user, db)
    if not q or len(q.strip()) < 1:
        return {"results": []}

    term = f"%{q}%"
    results = []

    # Transactions
    result_txns = await db.execute(
        select(Transaction)
        .filter(
            Transaction.org_id == org_id,
            or_(Transaction.description.ilike(term)),
        )
        .limit(limit)
    )
    txns = result_txns.scalars().all()
    for t in txns:
        results.append(
            {
                "type": "transaction",
                "id": t.id,
                "title": t.description or f"Transaction #{t.id}",
                "subtitle": f"${float(t.amount):,.2f} | {t.type}",
                "url": f"/money-in?id={t.id}"
                if t.type == "income"
                else f"/money-out?id={t.id}",
            }
        )

    # Invoices
    result_invs = await db.execute(
        select(Invoice)
        .filter(
            Invoice.org_id == org_id,
            or_(Invoice.number.ilike(term)),
        )
        .limit(limit)
    )
    invs = result_invs.scalars().all()
    for inv in invs:
        results.append(
            {
                "type": "invoice",
                "id": inv.id,
                "title": f"Invoice #{inv.number}",
                "subtitle": f"${float(inv.total):,.2f} | {inv.status}",
                "url": "/invoices",
            }
        )

    # Bills
    result_bls = await db.execute(
        select(Bill)
        .filter(
            Bill.org_id == org_id,
            or_(Bill.number.ilike(term)),
        )
        .limit(limit)
    )
    bls = result_bls.scalars().all()
    for b in bls:
        results.append(
            {
                "type": "bill",
                "id": b.id,
                "title": f"Bill #{b.number}",
                "subtitle": f"${float(b.total):,.2f} | {b.status}",
                "url": "/bills",
            }
        )

    # Contacts
    result_contacts = await db.execute(
        select(Contact)
        .filter(
            Contact.org_id == org_id,
            or_(Contact.name.ilike(term), Contact.email.ilike(term)),
        )
        .limit(limit)
    )
    contacts = result_contacts.scalars().all()
    for c in contacts:
        results.append(
            {
                "type": "contact",
                "id": c.id,
                "title": c.name,
                "subtitle": c.email or c.phone or "",
                "url": "/people",
            }
        )

    # Projects
    result_projects = await db.execute(
        select(Project)
        .filter(
            Project.org_id == org_id,
            or_(Project.name.ilike(term)),
        )
        .limit(limit)
    )
    projects = result_projects.scalars().all()
    for p in projects:
        results.append(
            {
                "type": "project",
                "id": p.id,
                "title": p.name,
                "subtitle": f"${float(p.budget or 0):,.2f} budget | {p.status}",
                "url": "/projects",
            }
        )

    # Employees
    result_employees = await db.execute(
        select(Employee)
        .filter(
            Employee.org_id == org_id,
            or_(Employee.name.ilike(term), Employee.email.ilike(term)),
        )
        .limit(limit)
    )
    employees = result_employees.scalars().all()
    for e in employees:
        results.append(
            {
                "type": "employee",
                "id": e.id,
                "title": e.name,
                "subtitle": f"{e.department or ''} | {e.designation or ''}",
                "url": "/payroll",
            }
        )

    return {"results": results[:limit]}
