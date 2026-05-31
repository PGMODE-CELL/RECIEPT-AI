"""Quick verification of production hardening modules"""
import sys, os

# Note: env vars must be set BEFORE importing app.config
# If pytest already imported app.config, use the loaded settings instead
os.environ.setdefault("ENVIRONMENT", "production")
os.environ.setdefault("SECRET_KEY", "test-secret-key-that-is-long-enough-for-hs256")
os.environ.setdefault("CORS_ORIGINS", "https://app.example.com")
os.environ.setdefault("ENCRYPTION_KEY", "test-encryption-key-32-bytes-long!!")

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Force reload config
import importlib
import app.config
importlib.reload(app.config)
from app.config import settings

assert settings.SECRET_KEY != ""
assert len(settings.CORS_ORIGINS) > 0
print("[PASS] Config: OK")

# 2. Encryption
from app.encryption import encrypt_field, decrypt_field, encrypt_dict, decrypt_dict

original = "user@example.com"
encrypted = encrypt_field(original)
assert encrypted != original
decrypted = decrypt_field(encrypted)
assert decrypted == original
print("[PASS] Encryption: roundtrip OK")

# Legacy data fallback
assert decrypt_field("plaintext") == "plaintext"
print("[PASS] Encryption legacy fallback: OK")

# encrypt_dict / decrypt_dict
data = {"email": "a@b.com", "name": "John", "phone": "+1234567890"}
enc = encrypt_dict(data, ["email", "phone"])
assert enc["email"] != "a@b.com"
assert enc["name"] == "John"
dec = decrypt_dict(enc, ["email", "phone"])
assert dec == data
print("[PASS] Encryption dict helpers: OK")

# 3. Errors
from app.errors import AppError, ValidationError, NotFoundError, AuthError, ForbiddenError

try:
    raise ValidationError("Invalid input", {"field": "email"})
except AppError as e:
    assert e.status == 422
    assert e.code == "validation_error"
    assert e.details["field"] == "email"
print("[PASS] Structured errors: OK")

# 4. Security middleware
from app.security_middleware import security_headers_middleware, https_redirect_middleware, setup_rate_limiting
print("[PASS] Security middleware imports: OK")

# 5. Backup
from app.backup import backup_database, list_backups, restore_database
print("[PASS] Backup module imports: OK")

# 6. CLI
from app.cli import main
print("[PASS] CLI module imports: OK")

# 7. Error middleware
from app.errors import catch_all_exceptions
print("[PASS] Error middleware: OK")

# 8. Audit events
from app.audit_events import register_all_models, register_audit_events
register_all_models()
print("[PASS] Audit events registration: OK")

print("\nALL PRODUCTION HARDENING MODULES VERIFIED")
