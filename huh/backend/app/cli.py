"""
ReceiptAI CLI — administrative tasks for self-hosted instances.

Usage:
    receiptai key generate
    receiptai db init|migrate|upgrade|reset
    receiptai backup create|list|restore <path>
    receiptai user create|list|promote|disable
    receiptai health
    receiptai config validate
    receiptai --help
"""
import argparse
import os
import secrets
import sys
import subprocess


def cmd_key_generate(args):
    """Generate SECRET_KEY and ENCRYPTION_KEY for production."""
    secret_key = secrets.token_hex(32)
    try:
        from cryptography.fernet import Fernet
        encryption_key = Fernet.generate_key().decode()
    except ImportError:
        encryption_key = "(install cryptography to generate)"
    print(f"SECRET_KEY={secret_key}")
    print(f"ENCRYPTION_KEY={encryption_key}")
    print("\nAdd these to your .env file or environment.")


def cmd_db_init(args):
    """Initialize database schema."""
    from app.database import engine
    from app.models import Base
    Base.metadata.create_all(bind=engine)
    print(" Database schema created.")


def cmd_db_migrate(args):
    """Create a new Alembic migration."""
    msg = " ".join(args.message) if args.message else "auto"
    subprocess.run([sys.executable, "-m", "alembic", "revision", "--autogenerate", "-m", msg], check=True)


def cmd_db_upgrade(args):
    """Apply all pending migrations."""
    subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"], check=True)
    print(" Migrations applied.")


def cmd_db_reset(args):
    """Drop and recreate all tables (dev only)."""
    from app.database import engine
    from app.models import Base
    if input("This will DELETE ALL DATA. Are you sure? (yes/N): ").lower() != "yes":
        print("Aborted.")
        return
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    print(" Database reset complete.")


def cmd_backup_create(args):
    """Create a database backup."""
    from app.backup import backup_database
    path = backup_database()
    print(f" Backup saved: {path}")


def cmd_backup_list(args):
    """List all backups."""
    from app.backup import list_backups
    backups = list_backups()
    if not backups:
        print("No backups found.")
        return
    print(f"{'Timestamp':<25} {'Type':<10} {'File'}")
    print("-" * 70)
    for b in backups:
        print(f"{b['timestamp']:<25} {b['type']:<10} {b['backup']}")


def cmd_backup_restore(args):
    """Restore database from a backup file."""
    from app.backup import restore_database
    msg = restore_database(args.path)
    print(f" {msg}")


def cmd_user_create(args):
    """Create a new user."""
    from app.database import SessionLocal
    from app.models.user import User
    from app.auth import get_password_hash
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == args.email).first()
        if existing:
            print(f" User {args.email} already exists.")
            return
        password = args.password or secrets.token_urlsafe(12)
        user = User(
            email=args.email,
            full_name=args.name or args.email.split("@")[0],
            hashed_password=get_password_hash(password),
        )
        db.add(user)
        db.commit()
        print(f" User {user.email} created (ID: {user.id}).")
        if not args.password:
            print(f" Temporary password: {password}")
    finally:
        db.close()


def cmd_user_list(args):
    """List all users."""
    from app.database import SessionLocal
    from app.models.user import User
    db = SessionLocal()
    try:
        users = db.query(User).order_by(User.id).all()
        if not users:
            print("No users found.")
            return
        print(f"{'ID':<5} {'Email':<35} {'Name':<20} {'2FA':<5} {'Active':<7}")
        print("-" * 75)
        for u in users:
            print(f"{u.id:<5} {u.email:<35} {(u.full_name or ''):<20} {'Yes' if u.totp_enabled else 'No':<5} {'Yes' if u.is_active else 'No':<7}")
    finally:
        db.close()


def cmd_user_promote(args):
    """Promote a user (no-op — role management via API)."""
    print(" Use the API or database to assign roles. This is a placeholder.")


def cmd_user_disable(args):
    """Disable a user account."""
    from app.database import SessionLocal
    from app.models.user import User
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == args.email).first()
        if not user:
            print(f" User {args.email} not found.")
            return
        user.is_active = False
        db.commit()
        print(f" User {user.email} has been disabled.")
    finally:
        db.close()


def cmd_health(args):
    """Run health checks."""
    import urllib.request
    failures = 0

    # 1. Database
    try:
        from app.database import SessionLocal
        from sqlalchemy import text
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        print(" [OK] Database connection")
    except Exception as e:
        print(f" [FAIL] Database: {e}")
        failures += 1

    # 2. API server
    host = os.getenv("HOST", "127.0.0.1")
    port = os.getenv("PORT", "5000")
    try:
        resp = urllib.request.urlopen(f"http://{host}:{port}/health", timeout=5)
        print(f" [OK] API server ({resp.status})")
    except Exception as e:
        print(f" [FAIL] API server: {e}")
        failures += 1

    # 3. Encryption key
    from app.config import settings
    if settings.ENCRYPTION_KEY:
        print(" [OK] Encryption key configured")
    else:
        print(" [FAIL] Encryption key not set")
        failures += 1

    # 4. Secret key
    if settings.SECRET_KEY and "dev-" not in settings.SECRET_KEY:
        print(" [OK] Secret key configured")
    else:
        print(" [WARN] Secret key is using dev default")
        failures += 1

    # 5. Backup directory
    from app.backup import BACKUP_DIR
    if os.path.isdir(BACKUP_DIR):
        print(" [OK] Backup directory exists")
    else:
        print(" [WARN] Backup directory missing")
        failures += 1

    if failures:
        print(f"\n {failures} check(s) failed.")
        sys.exit(1)
    print("\n All checks passed.")


def cmd_config_validate(args):
    """Validate configuration."""
    from app.config import settings
    checks = []
    ok = True

    if not settings.SECRET_KEY or settings.SECRET_KEY == "dev-secret-key-do-not-use-in-production":
        checks.append(("FAIL", "SECRET_KEY is using dev default — set for production"))
        ok = False
    else:
        checks.append(("OK", f"SECRET_KEY configured ({len(settings.SECRET_KEY)} chars)"))

    if settings.ENCRYPTION_KEY and "dev-" not in settings.ENCRYPTION_KEY:
        checks.append(("OK", "ENCRYPTION_KEY configured"))
    elif settings.ENCRYPTION_KEY:
        checks.append(("FAIL", "ENCRYPTION_KEY using dev default"))
        ok = False
    else:
        checks.append(("FAIL", "ENCRYPTION_KEY not set"))
        ok = False

    if settings.DATABASE_URL.startswith("postgresql"):
        checks.append(("OK", "Using PostgreSQL"))
    elif "sqlite" in settings.DATABASE_URL:
        checks.append(("WARN", "Using SQLite — not recommended for production"))
    else:
        checks.append(("INFO", f"Database: {settings.DATABASE_URL.split('://')[0]}"))

    if settings.CORS_ORIGINS and settings.CORS_ORIGINS != [""]:
        checks.append(("OK", f"CORS origins: {', '.join(settings.CORS_ORIGINS)}"))
    else:
        checks.append(("FAIL", "CORS_ORIGINS not set"))
        ok = False

    checks.append(("INFO", f"Environment: {settings.ENVIRONMENT}"))
    checks.append(("INFO", f"Debug: {settings.DEBUG}"))

    print(f"{'Status':<8} Check")
    print("-" * 50)
    for status, msg in checks:
        print(f"[{status:<6}] {msg}")

    if ok:
        print("\n Configuration valid.")
    else:
        print("\n Configuration has issues — fix before production.")
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(
        prog="receiptai",
        description="ReceiptAI administration CLI",
    )
    sub = parser.add_subparsers(dest="command")

    # key
    key_p = sub.add_parser("key", help="Key management")
    key_sub = key_p.add_subparsers(dest="subcommand")
    key_gen = key_sub.add_parser("generate", help="Generate SECRET_KEY and ENCRYPTION_KEY")
    key_gen.set_defaults(func=cmd_key_generate)

    # db
    db_p = sub.add_parser("db", help="Database management")
    db_sub = db_p.add_subparsers(dest="subcommand")
    db_sub.add_parser("init", help="Initialize database schema").set_defaults(func=cmd_db_init)
    db_mig = db_sub.add_parser("migrate", help="Create new migration")
    db_mig.add_argument("message", nargs="+", help="Migration message")
    db_mig.set_defaults(func=cmd_db_migrate)
    db_sub.add_parser("upgrade", help="Apply all migrations").set_defaults(func=cmd_db_upgrade)
    db_sub.add_parser("reset", help="Drop and recreate all tables (dev only)").set_defaults(func=cmd_db_reset)

    # backup
    bak_p = sub.add_parser("backup", help="Backup management")
    bak_sub = bak_p.add_subparsers(dest="subcommand")
    bak_sub.add_parser("create", help="Create a backup").set_defaults(func=cmd_backup_create)
    bak_sub.add_parser("list", help="List backups").set_defaults(func=cmd_backup_list)
    bak_rest = bak_sub.add_parser("restore", help="Restore from backup")
    bak_rest.add_argument("path", help="Backup file path")
    bak_rest.set_defaults(func=cmd_backup_restore)

    # user
    user_p = sub.add_parser("user", help="User management")
    user_sub = user_p.add_subparsers(dest="subcommand")
    user_create = user_sub.add_parser("create", help="Create a user")
    user_create.add_argument("email", help="User email")
    user_create.add_argument("--name", help="Display name")
    user_create.add_argument("--password", help="Password (auto-generated if omitted)")
    user_create.set_defaults(func=cmd_user_create)
    user_sub.add_parser("list", help="List users").set_defaults(func=cmd_user_list)
    user_prom = user_sub.add_parser("promote", help="Promote user to admin")
    user_prom.add_argument("email", help="User email")
    user_prom.set_defaults(func=cmd_user_promote)
    user_dis = user_sub.add_parser("disable", help="Disable user")
    user_dis.add_argument("email", help="User email")
    user_dis.set_defaults(func=cmd_user_disable)

    # health
    sub.add_parser("health", help="Run health checks").set_defaults(func=cmd_health)

    # config
    conf_p = sub.add_parser("config", help="Configuration management")
    conf_sub = conf_p.add_subparsers(dest="subcommand")
    conf_sub.add_parser("validate", help="Validate configuration").set_defaults(func=cmd_config_validate)

    args = parser.parse_args()
    if not hasattr(args, "func"):
        parser.print_help()
        sys.exit(1)
    args.func(args)


if __name__ == "__main__":
    main()
