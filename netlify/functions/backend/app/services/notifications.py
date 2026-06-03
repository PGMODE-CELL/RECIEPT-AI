from datetime import datetime, timezone, date
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification
from app.models.invoice import Invoice
from app.models.bill import Bill
from app.models.budget import Budget


async def create_notification(
    db: AsyncSession,
    org_id: int,
    type: str,
    title: str,
    message: str | None = None,
    reference_type: str | None = None,
    reference_id: int | None = None,
    data: dict | None = None,
):
    n = Notification(
        org_id=org_id,
        type=type,
        title=title,
        message=message,
        reference_type=reference_type,
        reference_id=reference_id,
        data=data,
        read=False,
        created_at=datetime.now(timezone.utc),
    )
    db.add(n)
    await db.flush()
    return n


async def generate_overdue_invoice_notifications(db: AsyncSession, org_id: int):
    today = date.today()
    result = await db.execute(
        select(Invoice).filter(
            Invoice.org_id == org_id,
            Invoice.status.in_(["sent", "overdue"]),
            Invoice.due_date < today,
            Invoice.paid < Invoice.total,
        )
    )
    invoices = result.scalars().all()
    count = 0
    for inv in invoices:
        existing_result = await db.execute(
            select(Notification).filter(
                Notification.org_id == org_id,
                Notification.type == "invoice_overdue",
                Notification.reference_type == "invoice",
                Notification.reference_id == inv.id,
            )
        )
        existing = existing_result.scalars().first()
        if existing:
            continue
        await create_notification(
            db, org_id,
            type="invoice_overdue",
            title=f"Invoice #{inv.number} overdue",
            message=f"Invoice #{inv.number} of ${float(inv.total):,.2f} is overdue since {inv.due_date}.",
            reference_type="invoice",
            reference_id=inv.id,
            data={"number": inv.number, "total": float(inv.total), "due_date": str(inv.due_date)},
        )
        count += 1
    return count


async def generate_due_bill_notifications(db: AsyncSession, org_id: int):
    today = date.today()
    result = await db.execute(
        select(Bill).filter(
            Bill.org_id == org_id,
            Bill.status.in_(["open", "overdue"]),
            Bill.due_date <= today,
            Bill.paid < Bill.total,
        )
    )
    bills = result.scalars().all()
    count = 0
    for b in bills:
        existing_result = await db.execute(
            select(Notification).filter(
                Notification.org_id == org_id,
                Notification.type == "bill_due",
                Notification.reference_type == "bill",
                Notification.reference_id == b.id,
            )
        )
        existing = existing_result.scalars().first()
        if existing:
            continue
        await create_notification(
            db, org_id,
            type="bill_due",
            title=f"Bill #{b.number} due",
            message=f"Bill #{b.number} of ${float(b.total):,.2f} is due today (overdue by {(today - b.due_date).days} days).",
            reference_type="bill",
            reference_id=b.id,
            data={"number": b.number, "total": float(b.total), "due_date": str(b.due_date)},
        )
        count += 1
    return count


async def generate_budget_notifications(db: AsyncSession, org_id: int):
    result = await db.execute(
        select(Budget).filter(Budget.org_id == org_id)
    )
    budgets = result.scalars().all()
    count = 0
    for bg in budgets:
        if bg.spent and bg.amount and bg.spent >= bg.amount:
            existing_result = await db.execute(
                select(Notification).filter(
                    Notification.org_id == org_id,
                    Notification.type == "budget_exceeded",
                    Notification.reference_type == "budget",
                    Notification.reference_id == bg.id,
                )
            )
            existing = existing_result.scalars().first()
            if existing:
                continue
            await create_notification(
                db, org_id,
                type="budget_exceeded",
                title=f"Budget exceeded: {bg.category}",
                message=f"Budget for {bg.category} has exceeded ${float(bg.amount):,.2f} (spent ${float(bg.spent):,.2f}).",
                reference_type="budget",
                reference_id=bg.id,
                data={"category": bg.category, "amount": float(bg.amount), "spent": float(bg.spent)},
            )
            count += 1
    return count


async def generate_all_notifications(db: AsyncSession, org_id: int):
    return {
        "overdue_invoices": await generate_overdue_invoice_notifications(db, org_id),
        "due_bills": await generate_due_bill_notifications(db, org_id),
        "budget_exceeded": await generate_budget_notifications(db, org_id),
    }
