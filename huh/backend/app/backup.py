import os, shutil, glob, json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from app.config import settings


def backup_database() -> str:
    backup_dir = Path(settings.BACKUP_DIR)
    backup_dir.mkdir(parents=True, exist_ok=True)

    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    is_sqlite = "sqlite" in settings.DATABASE_URL

    if is_sqlite:
        db_path = settings.DATABASE_URL.replace("sqlite:///", "")
        if not os.path.isabs(db_path):
            db_path = os.path.join(os.getcwd(), db_path)
        if not os.path.exists(db_path):
            raise FileNotFoundError(f"Database file not found: {db_path}")
        backup_path = backup_dir / f"receipt_ai_{ts}.db"
        shutil.copy2(db_path, backup_path)
        manifest = {
            "timestamp": ts,
            "type": "sqlite",
            "source": db_path,
            "backup": str(backup_path),
        }
    else:
        backup_path = backup_dir / f"receipt_ai_{ts}.sql"
        os.system(f"pg_dump --clean --if-exists --file={backup_path} '{settings.DATABASE_URL}'")
        manifest = {
            "timestamp": ts,
            "type": "postgres",
            "source": settings.DATABASE_URL,
            "backup": str(backup_path),
        }

    manifest_path = backup_dir / f"receipt_ai_{ts}.manifest.json"
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)

    # Cleanup old backups
    cutoff = datetime.now(timezone.utc) - timedelta(days=settings.BACKUP_RETENTION_DAYS)
    for f in glob.glob(str(backup_dir / "receipt_ai_*.db")):
        if datetime.fromtimestamp(os.path.getmtime(f), tz=timezone.utc) < cutoff:
            os.remove(f)
    for f in glob.glob(str(backup_dir / "receipt_ai_*.sql")):
        if datetime.fromtimestamp(os.path.getmtime(f), tz=timezone.utc) < cutoff:
            os.remove(f)
    for f in glob.glob(str(backup_dir / "receipt_ai_*.manifest.json")):
        if datetime.fromtimestamp(os.path.getmtime(f), tz=timezone.utc) < cutoff:
            os.remove(f)

    return str(backup_path)


def list_backups() -> list[dict]:
    backup_dir = Path(settings.BACKUP_DIR)
    if not backup_dir.exists():
        return []
    backups = []
    for mf in sorted(backup_dir.glob("*.manifest.json"), reverse=True):
        try:
            with open(mf) as f:
                backups.append(json.load(f))
        except Exception:
            pass
    return backups


def restore_database(backup_path: str) -> str:
    if not os.path.exists(backup_path):
        raise FileNotFoundError(f"Backup not found: {backup_path}")

    is_sqlite = "sqlite" in settings.DATABASE_URL
    if is_sqlite:
        db_path = settings.DATABASE_URL.replace("sqlite:///", "")
        if not os.path.isabs(db_path):
            db_path = os.path.join(os.getcwd(), db_path)
        shutil.copy2(backup_path, db_path)
        return f"Restored SQLite from {backup_path}"
    else:
        result = os.system(f"psql '{settings.DATABASE_URL}' < '{backup_path}'")
        if result != 0:
            raise RuntimeError("Restore failed. Ensure psql is available and the database exists.")
        return f"Restored PostgreSQL from {backup_path}"


def run_backup_cli():
    try:
        path = backup_database()
        print(f"✅ Backup created: {path}")
    except Exception as e:
        print(f"❌ Backup failed: {e}")
