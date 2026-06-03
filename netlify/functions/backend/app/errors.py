from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
import logging

logger = logging.getLogger("receipt_ai")


class AppError(Exception):
    def __init__(self, message: str, code: str = "internal_error", status: int = 500, details: dict | None = None):
        self.message = message
        self.code = code
        self.status = status
        self.details = details or {}


class ValidationError(AppError):
    def __init__(self, message: str, details: dict | None = None):
        super().__init__(message, code="validation_error", status=422, details=details)


class NotFoundError(AppError):
    def __init__(self, message: str = "Resource not found"):
        super().__init__(message, code="not_found", status=404)


class AuthError(AppError):
    def __init__(self, message: str = "Unauthorized"):
        super().__init__(message, code="auth_error", status=401)


class ForbiddenError(AppError):
    def __init__(self, message: str = "Forbidden"):
        super().__init__(message, code="forbidden", status=403)


ERROR_MESSAGES = {
    400: "Bad request",
    401: "Authentication required",
    403: "You don't have permission",
    404: "The requested resource was not found",
    422: "Validation failed",
    429: "Too many requests. Please slow down.",
    500: "An unexpected error occurred",
}


def _make_error(status: int, code: str, message: str, details: dict | None = None) -> JSONResponse:
    return JSONResponse(
        status_code=status,
        content={
            "error": code,
            "message": message,
            "details": details or {},
        },
    )


async def catch_all_exceptions(request: Request, call_next):
    """ASGI middleware that catches all exceptions and returns safe JSON."""
    try:
        return await call_next(request)
    except AppError as e:
        logger.warning("AppError %s %s: %s", e.status, e.code, e.message)
        return _make_error(e.status, e.code, e.message, e.details)
    except HTTPException as e:
        msg = ERROR_MESSAGES.get(e.status_code, str(e.detail))
        return _make_error(e.status_code, "http_error", msg if isinstance(msg, str) else str(msg))
    except Exception as e:
        if tracer:
            with tracer.start_as_current_span("catch_all_exceptions") as span:
                span.set_attribute("error.type", type(e).__name__)
                span.set_attribute("error.message", str(e))
                span.record_exception(e)
        logger.exception("Unhandled error: %s", e)
        return _make_error(500, "internal_error", ERROR_MESSAGES[500])


try:
    from opentelemetry import trace
    tracer = trace.get_tracer(__name__)
except ImportError:
    tracer = None
