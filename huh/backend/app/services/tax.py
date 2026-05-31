from decimal import Decimal, ROUND_HALF_UP
from typing import List, Optional
from sqlalchemy.orm import Session

from app.models.tax import TaxRate
from app.models.invoice import Invoice
from app.models.bill import Bill
from app.models.transaction import Transaction, TransactionLine


def get_tax_rate(db: Session, org_id: int, rate_id: int) -> Optional[TaxRate]:
    return db.query(TaxRate).filter(TaxRate.id == rate_id, TaxRate.org_id == org_id).first()


def compute_item_tax(price: Decimal, quantity: int, tax_rate: Decimal) -> dict:
    taxable = price * quantity
    tax_amount = (taxable * tax_rate / Decimal("100")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    total = taxable + tax_amount
    return {
        "taxable": float(taxable),
        "tax_rate": float(tax_rate),
        "tax_amount": float(tax_amount),
        "total": float(total),
    }


def compute_invoice_tax(db: Session, org_id: int, items: list, tax_rate_ids: List[int] = None) -> dict:
    total_taxable = Decimal("0")
    total_tax = Decimal("0")
    computed_items = []

    for item in items:
        price = Decimal(str(item.get("price", 0)))
        qty = int(item.get("quantity", 1))
        taxable = price * qty
        item_tax = Decimal("0")

        if tax_rate_ids:
            for rid in tax_rate_ids:
                rate = get_tax_rate(db, org_id, rid)
                if rate and rate.is_active:
                    result = compute_item_tax(price, qty, Decimal(str(rate.rate)))
                    item_tax += Decimal(str(result["tax_amount"]))
                    computed_items.append({
                        **item,
                        "tax_rate_id": rid,
                        "tax_rate_name": rate.name,
                        "tax_rate": float(rate.rate),
                        "tax_amount": result["tax_amount"],
                        "taxable": result["taxable"],
                        "total_with_tax": result["total"],
                    })

        total_taxable += taxable
        total_tax += item_tax

    return {
        "items": computed_items if computed_items else items,
        "total_taxable": float(total_taxable),
        "total_tax": float(total_tax),
        "grand_total": float(total_taxable + total_tax),
    }


def get_tax_breakdown(db: Session, org_id: int, start_date, end_date) -> dict:
    invoices = db.query(Invoice).filter(
        Invoice.org_id == org_id,
        Invoice.date >= start_date,
        Invoice.date <= end_date,
    ).all()

    bills = db.query(Bill).filter(
        Bill.org_id == org_id,
        Bill.date >= start_date,
        Bill.date <= end_date,
    ).all()

    sales_by_rate = {}
    purchase_by_rate = {}

    for inv in invoices:
        items = inv.items or []
        for item in items:
            rate = item.get("tax_rate", 0)
            tax = Decimal(str(item.get("tax_amount", 0)))
            taxable = Decimal(str(item.get("price", 0))) * int(item.get("quantity", 1))
            key = f"{rate}%"
            if key not in sales_by_rate:
                sales_by_rate[key] = {"rate": rate, "taxable": Decimal("0"), "tax": Decimal("0")}
            sales_by_rate[key]["taxable"] += taxable
            sales_by_rate[key]["tax"] += tax

    for bill in bills:
        taxable = Decimal(str(bill.total))
        key = "standard"
        if key not in purchase_by_rate:
            purchase_by_rate[key] = {"rate": 0, "taxable": Decimal("0"), "tax": Decimal("0")}
        purchase_by_rate[key]["taxable"] += taxable

    total_output = sum(v["tax"] for v in sales_by_rate.values())
    total_input = sum(v["tax"] for v in purchase_by_rate.values())

    return {
        "period": {"start": start_date.isoformat(), "end": end_date.isoformat()},
        "sales": {k: {"rate": v["rate"], "taxable": float(v["taxable"]), "tax": float(v["tax"])} for k, v in sales_by_rate.items()},
        "purchases": {k: {"rate": v["rate"], "taxable": float(v["taxable"]), "tax": float(v["tax"])} for k, v in purchase_by_rate.items()},
        "total_output_tax": float(total_output),
        "total_input_tax": float(total_input),
        "net_payable": float(max(Decimal("0"), total_output - total_input)),
        "refund": float(max(Decimal("0"), total_input - total_output)),
    }
