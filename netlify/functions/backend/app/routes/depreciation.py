from datetime import date, datetime
from fastapi import APIRouter, HTTPException, Depends, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from decimal import Decimal, ROUND_HALF_UP

from app.database_async import get_async_db as get_db
from app.models.user import User
from app.models.asset import Asset, DepreciationEntry
from app.models.transaction import Transaction, TransactionLine
from app.models.account import Account
from app.services.ledger import update_account_balance
from app.auth import get_current_user

router = APIRouter(prefix="/api/depreciation", tags=["Depreciation"])


def compute_sl(cost: Decimal, salvage: Decimal, life_years: int) -> Decimal:
    return ((cost - salvage) / Decimal(str(life_years))).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def compute_wdv(book_value: Decimal, rate: Decimal) -> Decimal:
    return (book_value * rate / Decimal("100")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


@router.post("/{org_id}/assets")
async def create_asset(
    org_id: int,
    name: str = Form(...),
    purchase_cost: float = Form(...),
    purchase_date: str = Form(""),
    useful_life_years: int = Form(5),
    salvage_value: float = Form(0),
    method: str = Form("straight_line"),
    rate: float = Form(0),
    account_id: int = Form(0),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cost = Decimal(str(purchase_cost))
    salvage = Decimal(str(salvage_value))
    dep_rate = Decimal(str(rate if rate > 0 else (100 / useful_life_years if method == "straight_line" else 20)))
    if method == "straight_line":
        annual_dep = compute_sl(cost, salvage, useful_life_years) if useful_life_years else Decimal("0")
        dep_rate = Decimal("0")
    else:
        annual_dep = Decimal("0")
        dep_rate = dep_rate

    asset = Asset(
        org_id=org_id, name=name,
        purchase_date=datetime.strptime(purchase_date, "%Y-%m-%d").date() if purchase_date else date.today(),
        purchase_cost=cost, useful_life_years=useful_life_years,
        salvage_value=salvage, method=method, rate=dep_rate,
        current_book_value=cost, account_id=account_id if account_id else None,
    )
    db.add(asset)
    await db.commit()
    return {"id": asset.id, "name": asset.name, "annual_depreciation": float(annual_dep), "message": f"Asset '{name}' added"}


@router.get("/{org_id}/assets")
async def list_assets(org_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Asset).filter(Asset.org_id == org_id).order_by(Asset.name))
    assets = result.scalars().all()
    return [{
        "id": a.id, "name": a.name, "purchase_date": a.purchase_date.isoformat(),
        "purchase_cost": float(a.purchase_cost), "current_book_value": float(a.current_book_value),
        "accumulated_dep": float(a.accumulated_dep), "method": a.method,
        "useful_life_years": a.useful_life_years, "salvage_value": float(a.salvage_value),
        "status": a.status,
    } for a in assets]


@router.get("/{org_id}/assets/{asset_id}/schedule")
async def get_schedule(org_id: int, asset_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    asset = (await db.execute(select(Asset).filter(Asset.id == asset_id, Asset.org_id == org_id))).scalar_one_or_none()
    if not asset:
        raise HTTPException(404, "Asset not found")

    cost = asset.purchase_cost
    salvage = asset.salvage_value
    book = cost
    schedule = []
    for year in range(1, asset.useful_life_years + 1):
        if asset.method == "straight_line":
            dep = compute_sl(cost, salvage, asset.useful_life_years)
        else:
            dep = compute_wdv(book, Decimal(str(asset.rate)) if asset.rate else Decimal("20"))
        book -= dep
        if book < 0:
            dep += book
            book = Decimal("0")
        schedule.append({
            "year": year,
            "opening": float(book + dep),
            "depreciation": float(dep),
            "closing": float(book),
        })
        if book <= 0:
            break
    return {"asset": asset.name, "method": asset.method, "schedule": schedule}


@router.post("/{org_id}/assets/{asset_id}/depreciate")
async def post_depreciation(
    org_id: int, asset_id: int,
    period: str = Form(...),  # "2024-01"
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    asset = (await db.execute(select(Asset).filter(Asset.id == asset_id, Asset.org_id == org_id))).scalar_one_or_none()
    if not asset:
        raise HTTPException(404, "Asset not found")

    existing = (await db.execute(
        select(DepreciationEntry).filter(
            DepreciationEntry.asset_id == asset_id, DepreciationEntry.period == period
        )
    )).scalar_one_or_none()
    if existing:
        raise HTTPException(400, "Depreciation already posted for this period")

    if asset.method == "straight_line":
        annual = compute_sl(asset.purchase_cost, asset.salvage_value, asset.useful_life_years)
        monthly = annual / Decimal("12")
    else:
        monthly = compute_wdv(asset.current_book_value, Decimal(str(asset.rate)) if asset.rate else Decimal("20")) / Decimal("12")

    if asset.current_book_value - monthly < asset.salvage_value and asset.current_book_value > asset.salvage_value:
        monthly = asset.current_book_value - asset.salvage_value
    if monthly <= 0:
        raise HTTPException(400, "Asset fully depreciated")

    dep_expense_acct = (await db.execute(
        select(Account).filter(Account.org_id == org_id, Account.name.ilike("%depreciation%"))
    )).scalar_one_or_none()
    accum_dep_acct = (await db.execute(
        select(Account).filter(Account.org_id == org_id, Account.name.ilike("%accumulated depreciation%"))
    )).scalar_one_or_none()
    if not dep_expense_acct or not accum_dep_acct:
        raise HTTPException(400, "Create 'Depreciation Expense' and 'Accumulated Depreciation' accounts first")

    txn = Transaction(
        org_id=org_id, description=f"Depreciation - {asset.name} ({period})",
        amount=monthly, type="journal", date=date.today(),
    )
    db.add(txn)
    await db.flush()

    db.add(TransactionLine(transaction_id=txn.id, debit_account_id=dep_expense_acct.id, credit_account_id=accum_dep_acct.id, amount=monthly))
    update_account_balance(db, dep_expense_acct.id, monthly, is_debit=True)
    update_account_balance(db, accum_dep_acct.id, monthly, is_debit=False)

    entry = DepreciationEntry(asset_id=asset_id, org_id=org_id, date=date.today(), amount=monthly, period=period, transaction_id=txn.id)
    db.add(entry)

    asset.accumulated_dep = (asset.accumulated_dep or Decimal("0")) + monthly
    asset.current_book_value = max(asset.salvage_value, asset.current_book_value - monthly)
    if asset.current_book_value <= asset.salvage_value:
        asset.status = "disposed"

    await db.commit()
    return {"message": f"Depreciation of ${float(monthly):.2f} posted for {period}", "book_value": float(asset.current_book_value)}


@router.get("/{org_id}/assets/{asset_id}")
async def get_asset(
    org_id: int,
    asset_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    asset = (await db.execute(select(Asset).filter(Asset.id == asset_id, Asset.org_id == org_id))).scalar_one_or_none()
    if not asset:
        raise HTTPException(404, "Asset not found")
    return {
        "id": asset.id, "name": asset.name, "purchase_date": asset.purchase_date.isoformat(),
        "purchase_cost": float(asset.purchase_cost), "current_book_value": float(asset.current_book_value),
        "accumulated_dep": float(asset.accumulated_dep), "method": asset.method,
        "useful_life_years": asset.useful_life_years, "salvage_value": float(asset.salvage_value),
        "status": asset.status,
    }


@router.put("/{org_id}/assets/{asset_id}")
async def update_asset(
    org_id: int,
    asset_id: int,
    name: str = Form(None),
    purchase_cost: float = Form(None),
    useful_life_years: int = Form(None),
    salvage_value: float = Form(None),
    method: str = Form(None),
    status: str = Form(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    asset = (await db.execute(select(Asset).filter(Asset.id == asset_id, Asset.org_id == org_id))).scalar_one_or_none()
    if not asset:
        raise HTTPException(404, "Asset not found")
    if name is not None:
        asset.name = name
    if purchase_cost is not None:
        asset.purchase_cost = Decimal(str(purchase_cost))
    if useful_life_years is not None:
        asset.useful_life_years = useful_life_years
    if salvage_value is not None:
        asset.salvage_value = Decimal(str(salvage_value))
    if method is not None:
        asset.method = method
    if status is not None:
        asset.status = status
    await db.commit()
    return {"message": "Asset updated"}


@router.delete("/{org_id}/assets/{asset_id}")
async def delete_asset(
    org_id: int,
    asset_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    asset = (await db.execute(select(Asset).filter(Asset.id == asset_id, Asset.org_id == org_id))).scalar_one_or_none()
    if not asset:
        raise HTTPException(404, "Asset not found")
    await db.delete(asset)
    await db.commit()
    return {"message": "Asset deleted"}
