import logging
import json
import sys
from datetime import datetime, timezone
from app.config import settings

class JSONFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        log = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }
        if record.exc_info and record.exc_info[0]:
            log["exception"] = self.formatException(record.exc_info)
        if hasattr(record, "trace_id"):
            log["trace_id"] = record.trace_id
        if hasattr(record, "span_id"):
            log["span_id"] = record.span_id
        if hasattr(record, "request_id"):
            log["request_id"] = record.request_id
        return json.dumps(log, default=str)

def setup_logging():
    handler = logging.StreamHandler(sys.stdout)
    if settings.ENVIRONMENT == "production":
        handler.setFormatter(JSONFormatter())
    else:
        handler.setFormatter(logging.Formatter(
            "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
        ))
    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(logging.INFO if not settings.DEBUG else logging.DEBUG)

async def request_id_middleware(request: callable, call_next):
    import uuid
    request_id = str(uuid.uuid4())
    import logging
    logger = logging.getLogger("receipt_ai")
    old_factory = logging.getLogRecordFactory()
    def record_factory(*args, **kwargs):
        record = old_factory(*args, **kwargs)
        record.request_id = request_id
        return record
    logging.setLogRecordFactory(record_factory)
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    logging.setLogRecordFactory(old_factory)
    return response
