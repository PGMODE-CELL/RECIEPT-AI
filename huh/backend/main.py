import logging
import signal
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base
from app.database_async import async_engine
from app.routes import (
    auth, setup, orgs, transactions, contacts, invoices, bills, receipts,
    reports, invoice_pdf, health, ai, budgets, recurring, imports, financials,
    tax, forex, depreciation, payroll, audit, roles, tds, email_route, aging,
    export_data, projects, attachments, consolidation, notifications, search,
    payments, client_portal, estimates, twofa, api_tokens, purchase_orders,
    inventory, credit_notes, loans, timesheets, expense_reports,
    accounting_periods, payment_reminders, late_fees, approvals, email_templates,
    activity_notes, vendor_portal, recurring_billing, warehouses, dunning, data_export,
    crm, manufacturing, leases, bank_rules, revenue_recognition,
    cash_flow_forecast, job_costing, document_versions, inventory_lots,
    inventory_valuation, webhooks, exports, wellknown, analytics,
)
from app.errors import catch_all_exceptions
from app.security_middleware import (
    security_headers_middleware,
    https_redirect_middleware,
    setup_rate_limiting,
)
from app.audit_context import audit_context_middleware
from app.logging_config import setup_logging, request_id_middleware

# Structured logging
setup_logging()
logger = logging.getLogger("receipt_ai")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown — async for horizontal scale."""
    # Startup: create tables with async engine
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    from app.audit_events import register_all_models
    register_all_models()
    logger.info("Audit event listeners registered for all models")
    try:
        from app.services.scheduler import start_scheduler
        start_scheduler()
    except Exception:
        pass
    try:
        from app.background import start_worker
        await start_worker()
        logger.info("Background task worker started")
    except Exception:
        pass
    yield
    # Shutdown
    logger.info("Shutting down...")
    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        BackgroundScheduler().shutdown(wait=False)
    except Exception:
        pass
    try:
        from app.background import stop_worker
        stop_worker()
    except Exception:
        pass
    await async_engine.dispose()
    logger.info("Shutdown complete")


app = FastAPI(title="Receipt AI", version="1.2.0", lifespan=lifespan)

# Middleware — outermost runs first on request, last on response
app.middleware("http")(request_id_middleware)
app.middleware("http")(catch_all_exceptions)
app.middleware("http")(https_redirect_middleware)
app.middleware("http")(security_headers_middleware)
app.middleware("http")(audit_context_middleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiting
limiter = setup_rate_limiting(app)

# Routers
routers = [
    auth, setup, orgs, transactions, contacts, invoices, bills, receipts,
    reports, invoice_pdf, health, ai, budgets, recurring, imports, financials,
    tax, forex, depreciation, payroll, audit, roles, tds, email_route, aging,
    export_data, projects, attachments, consolidation, notifications, search,
    payments, client_portal, estimates, twofa, api_tokens, purchase_orders,
    inventory, credit_notes, loans, timesheets, expense_reports,
    accounting_periods, payment_reminders, late_fees, approvals, email_templates,
    activity_notes, vendor_portal, recurring_billing, warehouses, dunning, data_export,
    crm, manufacturing, leases, bank_rules, revenue_recognition,
    cash_flow_forecast, job_costing, document_versions, inventory_lots,
    inventory_valuation, webhooks, exports, wellknown, analytics,
]
for r in routers:
    app.include_router(r.router)


@app.get("/")
async def root():
    return {
        "message": "Receipt AI",
        "docs": "/docs",
        "environment": settings.ENVIRONMENT,
    }
