import os
import json
from fastapi import APIRouter, HTTPException, Depends, Form, Request
from sqlalchemy.orm import Session
from datetime import datetime

from app.database import get_db
from app.models.user import User
from app.models.invoice import Invoice
from app.models.payment import Payment
from app.auth import get_current_user

router = APIRouter(prefix="/api/payments", tags=["Payments"])

STRIPE_API_KEY = os.getenv("STRIPE_API_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")


def get_stripe():
    if STRIPE_API_KEY:
        import stripe as _stripe
        _stripe.api_key = STRIPE_API_KEY
        return _stripe
    return None


@router.post("/{org_id}/stripe/create-payment-intent")
def create_payment_intent(
    org_id: int,
    invoice_id: int = Form(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    inv = db.query(Invoice).filter(Invoice.id == invoice_id, Invoice.org_id == org_id).first()
    if not inv:
        raise HTTPException(404, "Invoice not found")
    stripe = get_stripe()
    if not stripe:
        raise HTTPException(400, "Stripe not configured (set STRIPE_API_KEY)")
    try:
        intent = stripe.PaymentIntent.create(
            amount=int(float(inv.total - inv.paid) * 100),
            currency=(inv.currency or "usd").lower(),
            metadata={"org_id": str(org_id), "invoice_id": str(invoice_id)},
        )
        pay = Payment(
            org_id=org_id, invoice_id=invoice_id,
            amount=float(inv.total - inv.paid),
            currency=inv.currency or "USD",
            gateway="stripe",
            gateway_payment_id=intent["id"],
            gateway_status=intent["status"],
            status="pending",
        )
        db.add(pay)
        db.commit()
        return {"client_secret": intent["client_secret"], "payment_id": pay.id, "amount": float(inv.total - inv.paid)}
    except Exception as e:
        raise HTTPException(400, str(e))


@router.post("/{org_id}/stripe/webhook")
async def stripe_webhook(org_id: int, request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    data = json.loads(payload)
    sig_header = request.headers.get("stripe-signature")
    stripe = get_stripe()
    if stripe and STRIPE_WEBHOOK_SECRET:
        try:
            event = stripe.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)
        except Exception:
            raise HTTPException(400, "Invalid signature")
    else:
        event = data
    event_type = event.get("type", event.get("event", ""))
    pi = event.get("data", {}).get("object", event)
    pi_id = pi.get("id", pi.get("payment_intent", ""))
    if event_type == "payment_intent.succeeded" or event_type == "payment.success":
        pay = db.query(Payment).filter(Payment.gateway_payment_id == pi_id).first()
        if pay:
            pay.status = "completed"
            pay.gateway_status = "succeeded"
            pay.paid_at = datetime.utcnow()
            inv = db.query(Invoice).filter(Invoice.id == pay.invoice_id).first()
            if inv:
                inv.paid = float(inv.paid) + float(pay.amount)
                if float(inv.paid) >= float(inv.total):
                    inv.status = "paid"
            db.commit()
    elif event_type == "payment_intent.payment_failed":
        pay = db.query(Payment).filter(Payment.gateway_payment_id == pi_id).first()
        if pay:
            pay.status = "failed"
            pay.gateway_status = "failed"
            db.commit()
    return {"status": "ok"}


@router.get("/{org_id}/history")
def payment_history(org_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    pays = db.query(Payment).filter(Payment.org_id == org_id).order_by(Payment.created_at.desc()).all()
    return [{
        "id": p.id, "invoice_id": p.invoice_id, "amount": float(p.amount),
        "currency": p.currency, "gateway": p.gateway, "status": p.status,
        "gateway_status": p.gateway_status, "payer_email": p.payer_email,
        "payer_name": p.payer_name, "paid_at": p.paid_at.isoformat() if p.paid_at else None,
    } for p in pays]


@router.post("/{org_id}/manual")
def record_manual_payment(
    org_id: int, invoice_id: int = Form(...), amount: float = Form(...),
    method: str = Form("cash"), reference: str = Form(""),
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    inv = db.query(Invoice).filter(Invoice.id == invoice_id, Invoice.org_id == org_id).first()
    if not inv:
        raise HTTPException(404, "Invoice not found")
    pay = Payment(
        org_id=org_id, invoice_id=invoice_id, amount=amount,
        currency=inv.currency or "USD", gateway="manual",
        gateway_payment_id=reference, gateway_status="completed",
        payment_method=method, payer_name=reference,
        status="completed", paid_at=datetime.utcnow(),
    )
    db.add(pay)
    inv.paid = float(inv.paid) + amount
    if float(inv.paid) >= float(inv.total):
        inv.status = "paid"
    db.commit()
    return {"message": "Payment recorded", "payment_id": pay.id}
