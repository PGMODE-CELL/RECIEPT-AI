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
        import warnings
        warnings.warn("SECRET_KEY not set — using insecure dev fallback")
        SECRET_KEY = "dev-secret-key-do-not-use-in-production"

    ENCRYPTION_KEY: str = os.getenv("ENCRYPTION_KEY", "")
    if not ENCRYPTION_KEY:
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


settings = Settings()

# Ensure backup dir exists
if settings.BACKUP_DIR:
    Path(settings.BACKUP_DIR).mkdir(parents=True, exist_ok=True)
