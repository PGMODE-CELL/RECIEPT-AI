from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database_async import get_async_db as get_db
from app.models.organization import Organization
from app.models.account import Account
from app.models.contact import Contact
from app.models.transaction import Transaction
from app.models.invoice import Invoice
from app.models.bill import Bill
from app.models.receipt import Receipt
from app.models.budget import Budget
from app.models.project import Project
from app.models.asset import Asset
from app.models.purchase_order import PurchaseOrder
from app.models.inventory import InventoryItem
from app.models.estimate import Estimate
from app.auth import get_current_user
import json
import zipfile
import io

router = APIRouter(prefix="/api/data-export", tags=["Data Export"])


@router.get("/{org_id}")
async def export_all(org_id: int, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    org = (await db.execute(select(Organization).filter(Organization.id == org_id))).scalar_one_or_none()
    if not org:
        return {"success": False, "error": "Organization not found"}

    accounts = (await db.execute(select(Account).filter(Account.org_id == org_id))).scalars().all()
    contacts = (await db.execute(select(Contact).filter(Contact.org_id == org_id))).scalars().all()
    transactions = (await db.execute(select(Transaction).filter(Transaction.org_id == org_id))).scalars().all()
    invoices = (await db.execute(select(Invoice).filter(Invoice.org_id == org_id))).scalars().all()
    bills = (await db.execute(select(Bill).filter(Bill.org_id == org_id))).scalars().all()
    receipts = (await db.execute(select(Receipt).filter(Receipt.org_id == org_id))).scalars().all()
    budgets = (await db.execute(select(Budget).filter(Budget.org_id == org_id))).scalars().all()
    projects = (await db.execute(select(Project).filter(Project.org_id == org_id))).scalars().all()
    assets = (await db.execute(select(Asset).filter(Asset.org_id == org_id))).scalars().all()
    purchase_orders = (await db.execute(select(PurchaseOrder).filter(PurchaseOrder.org_id == org_id))).scalars().all()
    inventory = (await db.execute(select(InventoryItem).filter(InventoryItem.org_id == org_id))).scalars().all()
    estimates = (await db.execute(select(Estimate).filter(Estimate.org_id == org_id))).scalars().all()

    data = {
        "organization": {"name": org.name, "country": org.country, "currency": org.currency, "tax_id": org.tax_id},
        "accounts": [{"id": a.id, "code": a.code, "name": a.name, "type": a.type, "balance": a.balance} for a in accounts],
        "contacts": [{"id": c.id, "name": c.name, "email": c.email, "type": c.type, "balance": c.balance} for c in contacts],
        "transactions": [{"id": t.id, "date": str(t.date), "description": t.description, "amount": t.amount, "type": t.type} for t in transactions],
        "invoices": [{"id": i.id, "number": i.number, "date": str(i.date), "total": i.total, "status": i.status} for i in invoices],
        "bills": [{"id": b.id, "number": b.number, "date": str(b.date), "total": b.total, "status": b.status} for b in bills],
        "receipts": [{"id": r.id, "vendor": r.vendor, "date": str(r.date), "total": r.total} for r in receipts],
        "budgets": [{"id": b.id, "category": b.category, "amount": b.amount, "spent": b.spent} for b in budgets],
        "projects": [{"id": p.id, "name": p.name, "status": p.status} for p in projects],
        "assets": [{"id": a.id, "name": a.name, "purchase_cost": a.purchase_cost, "current_book_value": a.current_book_value} for a in assets],
        "purchase_orders": [{"id": po.id, "number": po.number, "total": po.total, "status": po.status} for po in purchase_orders],
        "inventory": [{"id": i.id, "name": i.name, "sku": i.sku, "quantity": i.quantity} for i in inventory],
        "estimates": [{"id": e.id, "number": e.number, "total": e.total, "status": e.status} for e in estimates],
    }

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("export.json", json.dumps(data, indent=2, default=str))
    buf.seek(0)

    from fastapi.responses import StreamingResponse
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename=org_{org_id}_export.zip"}
    )
