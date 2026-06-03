import logging
from datetime import date, datetime, timedelta, timezone
from apscheduler.schedulers.background import BackgroundScheduler
from app.database import SessionLocal
from app.models.recurring import RecurringTransaction
from app.models.recurring_billing import RecurringBillingPlan
from app.models.payment_reminder import PaymentReminder, ReminderLog
from app.models.invoice import Invoice
from app.models.transaction import Transaction, TransactionLine
from app.models.account import Account

logger = logging.getLogger(__name__)
scheduler = BackgroundScheduler()


def process_recurring_transactions():
    db = SessionLocal()
    try:
        today = date.today()
        recs = db.query(RecurringTransaction).filter(
            RecurringTransaction.active,
            RecurringTransaction.next_date <= today,
        ).all()
        for rec in recs:
            txn = Transaction(
                org_id=rec.org_id, date=today,
                description=rec.description,
                amount=rec.amount, type=rec.transaction_type or "expense",
            )
            db.add(txn)
            db.flush()
            if rec.transaction_type == "money_in" or rec.transaction_type == "income":
                debit_acct = db.query(Account).filter(
                    Account.org_id == rec.org_id, Account.type == "asset",
                    Account.name.like("%Cash%"),
                ).first()
                credit_acct = db.query(Account).filter(
                    Account.org_id == rec.org_id, Account.type == "income",
                ).first()
                if not credit_acct:
                    credit_acct = db.query(Account).filter(
                        Account.org_id == rec.org_id, Account.type == "income",
                    ).first()
            else:
                debit_acct = db.query(Account).filter(
                    Account.org_id == rec.org_id, Account.type == "expense",
                ).first()
                credit_acct = db.query(Account).filter(
                    Account.org_id == rec.org_id, Account.type == "asset",
                    Account.name.like("%Cash%"),
                ).first()
            if debit_acct and credit_acct:
                line = TransactionLine(
                    transaction_id=txn.id,
                    debit_account_id=debit_acct.id if rec.transaction_type == "money_out" else debit_acct.id,
                    credit_account_id=credit_acct.id,
                    amount=rec.amount,
                )
                db.add(line)
            freq = rec.frequency
            if freq == "daily":
                rec.next_date = today + timedelta(days=1)
            elif freq == "weekly":
                rec.next_date = today + timedelta(weeks=1)
            elif freq == "biweekly":
                rec.next_date = today + timedelta(weeks=2)
            elif freq == "monthly":
                import calendar
                next_month = today.month + 1
                year = today.year
                if next_month > 12:
                    next_month = 1
                    year += 1
                last_day = calendar.monthrange(year, next_month)[1]
                day = min(today.day, last_day)
                rec.next_date = date(year, next_month, day)
            elif freq == "quarterly":
                rec.next_date = today + timedelta(days=90)
            elif freq == "yearly":
                rec.next_date = date(today.year + 1, today.month, today.day)
            else:
                rec.next_date = today + timedelta(days=rec.interval_days or 30)
            if rec.end_date and rec.next_date > rec.end_date:
                rec.active = False
            db.commit()
            logger.info(f"Auto-created transaction from recurring #{rec.id}")
    except Exception as e:
        logger.error(f"Recurring scheduler error: {e}")
    finally:
        db.close()


def process_recurring_billing():
    db = SessionLocal()
    try:
        today = date.today()
        plans = db.query(RecurringBillingPlan).filter(
            RecurringBillingPlan.status == "active",
            RecurringBillingPlan.next_billing_date <= today,
        ).all()
        for plan in plans:
            if plan.max_cycles and plan.current_cycle >= plan.max_cycles:
                plan.status = "completed"
                db.commit()
                continue
            inv_count = db.query(Invoice).filter(Invoice.org_id == plan.org_id).count()
            inv = Invoice(
                org_id=plan.org_id, contact_id=plan.contact_id,
                number=f"RBILL-{plan.org_id}-{inv_count+1}",
                date=datetime.now(timezone.utc),
                due_date=datetime.now(timezone.utc) + timedelta(days=30),
                total=plan.total_amount, paid=0, status="draft",
                items=plan.items,
            )
            db.add(inv)
            plan.current_cycle += 1
            next_date = plan.next_billing_date
            if plan.frequency == "daily":
                next_date += timedelta(days=plan.interval_count)
            elif plan.frequency == "weekly":
                next_date += timedelta(weeks=plan.interval_count)
            elif plan.frequency == "monthly":
                next_date += timedelta(days=30 * plan.interval_count)
            elif plan.frequency == "quarterly":
                next_date += timedelta(days=90 * plan.interval_count)
            elif plan.frequency == "yearly":
                next_date += timedelta(days=365 * plan.interval_count)
            if plan.end_date and next_date.date() > plan.end_date.date():
                plan.status = "completed"
                plan.next_billing_date = None
            elif plan.max_cycles and plan.current_cycle >= plan.max_cycles:
                plan.status = "completed"
                plan.next_billing_date = None
            else:
                plan.next_billing_date = next_date
            db.commit()
            logger.info(f"Auto-generated invoice from recurring billing plan #{plan.id}")
    except Exception as e:
        logger.error(f"Recurring billing scheduler error: {e}")
    finally:
        db.close()


def process_payment_reminders():
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        reminders = db.query(PaymentReminder).filter(
            PaymentReminder.active,
            PaymentReminder.next_send_at <= now,
        ).all()
        for r in reminders:
            inv = db.query(Invoice).filter(Invoice.id == r.invoice_id).first()
            if not inv or inv.status in ("paid", "cancelled") or inv.paid >= inv.total:
                r.active = False
                db.commit()
                continue
            log = ReminderLog(reminder_id=r.id, invoice_id=r.invoice_id, contact_id=r.contact_id, status="sent")
            db.add(log)
            r.sent_count += 1
            r.last_sent_at = now
            if r.schedule == "once" or r.sent_count >= r.max_reminders:
                r.active = False
                r.next_send_at = None
            elif r.schedule == "weekly":
                r.next_send_at = now + timedelta(weeks=1)
            elif r.schedule == "daily":
                r.next_send_at = now + timedelta(days=1)
            db.commit()
            logger.info(f"Sent payment reminder for invoice #{r.invoice_id}")
    except Exception as e:
        logger.error(f"Reminder scheduler error: {e}")
    finally:
        db.close()


def backup_database_job():
    try:
        from app.backup import backup_database
        path = backup_database()
        logger.info(f"Auto-backup: {path}")
    except Exception as e:
        logger.error(f"Auto-backup failed: {e}")


def start_scheduler():
    try:
        scheduler.add_job(process_recurring_transactions, "interval", hours=6, id="recurring_txns")
        scheduler.add_job(process_recurring_billing, "interval", hours=6, id="recurring_billing")
        scheduler.add_job(process_payment_reminders, "interval", hours=1, id="payment_reminders")
        scheduler.add_job(backup_database_job, "interval", hours=24, id="daily_backup")
        scheduler.start()
        logger.info("Background scheduler started with daily backup")
    except Exception as e:
        logger.warning(f"Scheduler not started (may be running): {e}")
