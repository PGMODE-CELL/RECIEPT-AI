import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()


class Settings:
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DEBUG: bool = os.getenv("DEBUG", "true").lower() == "true"

    # Secrets — all MUST be set via environment variables in production
    SECRET_KEY: str = os.getenv("SECRET_KEY", "")
    if not SECRET_KEY:
        if ENVIRONMENT == "production":
            raise RuntimeError("SECRET_KEY must be set in production")
        import warnings

        warnings.warn("SECRET_KEY not set — using insecure dev fallback")
        SECRET_KEY = "dev-secret-key-do-not-use-in-production"

    ENCRYPTION_KEY: str = os.getenv("ENCRYPTION_KEY", "")
    if not ENCRYPTION_KEY:
        if ENVIRONMENT == "production":
            raise RuntimeError("ENCRYPTION_KEY must be set in production")
        import warnings

        warnings.warn("ENCRYPTION_KEY not set — using insecure dev fallback")
        ENCRYPTION_KEY = "dev-encryption-key-do-not-use-in-production"

    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_DAYS: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_DAYS", "30"))

    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "sqlite:///./receipt_ai.db",
    )

    # CORS
    CORS_ORIGINS: list[str] = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:3000,http://localhost:8000,http://localhost:4200,http://localhost:5000,http://localhost:5173",
    ).split(",")
    if ENVIRONMENT == "production":
        CORS_ORIGINS = os.getenv("CORS_ORIGINS", "").split(",")
        if not CORS_ORIGINS or CORS_ORIGINS == [""]:
            raise RuntimeError("CORS_ORIGINS must be set in production")

    # Rate limiting
    RATE_LIMIT_ENABLED: bool = os.getenv("RATE_LIMIT_ENABLED", "true").lower() == "true"
    RATE_LIMIT_AUTH: str = os.getenv("RATE_LIMIT_AUTH", "10/minute")
    RATE_LIMIT_DEFAULT: str = os.getenv("RATE_LIMIT_DEFAULT", "100/minute")

    # HTTPS
    HTTPS_REDIRECT: bool = os.getenv("HTTPS_REDIRECT", "false").lower() == "true"

    # Backup
    BACKUP_DIR: str = os.getenv("BACKUP_DIR", "./backups")
    BACKUP_RETENTION_DAYS: int = int(os.getenv("BACKUP_RETENTION_DAYS", "30"))

    # Security headers
    CSP_DEFAULT_SRC: str = os.getenv("CSP_DEFAULT_SRC", "'self'")
    HSTS_MAX_AGE: int = int(os.getenv("HSTS_MAX_AGE", "31536000"))

    # --- SCALING INFRASTRUCTURE ---
    # Redis
    REDIS_URL: str = os.getenv("REDIS_URL", "")
    REDIS_CACHE_TTL: int = int(os.getenv("REDIS_CACHE_TTL", "300"))

    # S3 / Object Storage
    S3_ENDPOINT: str = os.getenv("S3_ENDPOINT", "")
    S3_ACCESS_KEY: str = os.getenv("S3_ACCESS_KEY", "")
    S3_SECRET_KEY: str = os.getenv("S3_SECRET_KEY", "")
    S3_BUCKET: str = os.getenv("S3_BUCKET", "")
    S3_REGION: str = os.getenv("S3_REGION", "")
    S3_PUBLIC_URL: str = os.getenv("S3_PUBLIC_URL", "")
    LOCAL_STORAGE_DIR: str = os.getenv("LOCAL_STORAGE_DIR", "")

    # Async DB
    DATABASE_READ_URL: str = os.getenv("DATABASE_READ_URL", "")

    # Background tasks
    CELERY_BROKER_URL: str = os.getenv("CELERY_BROKER_URL", "")
    CELERY_RESULT_BACKEND: str = os.getenv("CELERY_RESULT_BACKEND", "")

    # Horizontal scaling
    INSTANCE_ID: str = os.getenv("INSTANCE_ID", "default")
    MAX_WORKERS: int = int(os.getenv("MAX_WORKERS", "4"))

    # Distributed tracing
    OTEL_SERVICE_NAME: str = os.getenv("OTEL_SERVICE_NAME", "receipt-ai")
    OTEL_EXPORTER_OTLP_ENDPOINT: str = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "")


settings = Settings()

# Ensure backup dir exists
if settings.BACKUP_DIR:
    Path(settings.BACKUP_DIR).mkdir(parents=True, exist_ok=True)
