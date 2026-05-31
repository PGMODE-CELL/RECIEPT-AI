"""
Context variables for passing request-scoped identity to SQLAlchemy event listeners.
"""
import contextvars

current_user_id: contextvars.ContextVar[int | None] = contextvars.ContextVar("current_user_id", default=None)
current_org_id: contextvars.ContextVar[int | None] = contextvars.ContextVar("current_org_id", default=None)
current_ip: contextvars.ContextVar[str | None] = contextvars.ContextVar("current_ip", default=None)
