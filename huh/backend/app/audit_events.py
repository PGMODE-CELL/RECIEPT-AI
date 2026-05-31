"""
SQLAlchemy event listeners for automatic audit logging on all model mutations.

Covers every CREATE, UPDATE, DELETE on all models.  Identity (user, org, IP)
is read from request-scoped context vars set by AuditContextMiddleware.
"""
import logging
from datetime import datetime, timezone
from sqlalchemy import event
from app.models.audit import AuditLog
from app.context import current_user_id, current_org_id, current_ip

logger = logging.getLogger("audit")

# Models we track (all models with __tablename__)
# Populated by _register_all on import
_tracked = set()


def _table_name(model_class) -> str:
    """Get table name from a model class."""
    return getattr(model_class, "__tablename__", model_class.__name__.lower())


def _get_changes(mapper, connection, target) -> dict:
    """Extract changed column values from a model instance."""
    changes = {}
    for attr in mapper.attrs:
        key = attr.key
        try:
            val = getattr(target, key)
            if val is not None:
                changes[key] = _safe_val(val)
        except Exception:
            pass
    return changes


def _safe_val(val):
    """Convert non-serializable values for JSON storage."""
    if isinstance(val, (datetime,)):
        return val.isoformat()
    return val


def _log_audit(
    connection,
    action: str,
    table_name: str,
    record_id: int | None,
    old_values: dict | None = None,
    new_values: dict | None = None,
):
    """Write an audit record using the event's connection to avoid SQLite locking."""
    try:
        connection.execute(
            AuditLog.__table__.insert().values(
                user_id=current_user_id.get(),
                org_id=current_org_id.get(),
                action=action,
                table_name=table_name,
                record_id=record_id,
                old_values=old_values,
                new_values=new_values,
                ip_address=current_ip.get(),
                created_at=datetime.now(timezone.utc),
            )
        )
    except Exception as e:
        logger.warning("Audit write failed: %s", e)


# ---------------------------------------------------------------------------
# Event listeners
# ---------------------------------------------------------------------------

def _after_insert(mapper, connection, target):
    if _table_name(mapper.class_) == "audit_logs":
        return
    _log_audit(
        connection,
        "create",
        _table_name(mapper.class_),
        getattr(target, "id", None),
        None,
        _get_changes(mapper, connection, target),
    )


def _after_update(mapper, connection, target):
    if _table_name(mapper.class_) == "audit_logs":
        return
    _log_audit(
        connection,
        "update",
        _table_name(mapper.class_),
        getattr(target, "id", None),
        None,
        _get_changes(mapper, connection, target),
    )


def _after_delete(mapper, connection, target):
    if _table_name(mapper.class_) == "audit_logs":
        return
    _log_audit(
        connection,
        "delete",
        _table_name(mapper.class_),
        getattr(target, "id", None),
        _get_changes(mapper, connection, target),
        None,
    )


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

def register_audit_events(model_class):
    """Attach audit listeners to a model class."""
    name = _table_name(model_class)
    if name in _tracked:
        return
    _tracked.add(name)
    event.listen(model_class, "after_insert", _after_insert)
    event.listen(model_class, "after_update", _after_update)
    event.listen(model_class, "after_delete", _after_delete)


def register_all_models():
    """Scan all SQLAlchemy models and register audit events."""
    from app.database import Base
    for mapper in Base.registry.mappers:
        cls = mapper.class_
        if hasattr(cls, "__tablename__"):
            register_audit_events(cls)
