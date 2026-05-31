"""
CLI entry point for administrative tasks.

Usage:
    python -m app.cli backup
    python -m app.cli restore <backup_path>
    python -m app.cli list-backups
    python -m app.cli alembic-create-migration <message>
    python -m app.cli alembic-upgrade
"""
import sys, subprocess
from app.backup import backup_database, list_backups, restore_database


def main():
    args = sys.argv[1:]
    if not args:
        print("Usage: python -m app.cli <command> [args]")
        print("Commands: backup, restore, list-backups, alembic-create-migration, alembic-upgrade")
        return

    cmd = args[0]

    if cmd == "backup":
        path = backup_database()
        print(f"✅ Backup: {path}")

    elif cmd == "restore":
        if len(args) < 2:
            print("❌ Usage: python -m app.cli restore <backup_path>")
            return
        msg = restore_database(args[1])
        print(f"✅ {msg}")

    elif cmd == "list-backups":
        backups = list_backups()
        if not backups:
            print("No backups found.")
            return
        for b in backups:
            print(f"{b['timestamp']}  {b['type']:8s}  {b['backup']}")

    elif cmd == "alembic-create-migration":
        if len(args) < 2:
            print("❌ Usage: python -m app.cli alembic-create-migration <message>")
            return
        msg = " ".join(args[1:])
        subprocess.run([sys.executable, "-m", "alembic", "revision", "--autogenerate", "-m", msg], check=True)

    elif cmd == "alembic-upgrade":
        subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"], check=True)

    else:
        print(f"Unknown command: {cmd}")
        sys.exit(1)


if __name__ == "__main__":
    main()
