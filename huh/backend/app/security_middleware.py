from fastapi import FastAPI, Request
from fastapi.responses import Response, RedirectResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app.config import settings

# Module-level limiter so individual routers can apply stricter, per-route limits
# (e.g. auth endpoints) via `@limiter.limit(...)`.
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[settings.RATE_LIMIT_DEFAULT],
    enabled=settings.RATE_LIMIT_ENABLED and settings.ENVIRONMENT != "test",
)


async def security_headers_middleware(request: Request, call_next):
    response: Response = await call_next(request)
    if settings.ENVIRONMENT == "production":
        response.headers["Strict-Transport-Security"] = (
            f"max-age={settings.HSTS_MAX_AGE}; includeSubDomains"
        )
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    csp = (
        f"default-src {settings.CSP_DEFAULT_SRC}; "
        f"script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
        f"style-src 'self' 'unsafe-inline'; "
        f"img-src 'self' data: blob:; "
        f"font-src 'self' data:; "
        f"connect-src 'self' ws: wss:; "
        f"frame-ancestors 'none'"
    )
    response.headers["Content-Security-Policy"] = csp
    for h in ("Server", "X-Powered-By", "X-AspNet-Version"):
        try:
            del response.headers[h]
        except KeyError:
            pass
    return response


async def https_redirect_middleware(request: Request, call_next):
    if settings.HTTPS_REDIRECT and request.url.scheme != "https":
        url = request.url.replace(scheme="https")
        return RedirectResponse(str(url), status_code=301)
    return await call_next(request)


def setup_rate_limiting(app: FastAPI):
    """Wire the shared limiter into the app so limits are actually enforced.

    Adding ``SlowAPIMiddleware`` is what makes ``default_limits`` (and any
    per-route ``@limiter.limit`` decorators) take effect — without it the
    limiter is inert.
    """
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)
    return limiter
