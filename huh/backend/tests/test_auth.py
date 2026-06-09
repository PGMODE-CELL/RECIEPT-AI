import sqlite3


def _reset_token_for(email: str) -> str | None:
    """Reset tokens are no longer returned by the API (security); read it
    straight from the test database instead."""
    con = sqlite3.connect("test_receipt_ai.db")
    try:
        row = con.execute(
            "SELECT reset_token FROM users WHERE email = ?", (email,)
        ).fetchone()
    finally:
        con.close()
    return row[0] if row else None


def test_register(client):
    res = client.post(
        "/api/auth/register",
        json={"email": "new@test.com", "password": "pass123", "full_name": "New User"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "token" in data
    assert data["user"]["email"] == "new@test.com"


def test_register_duplicate(client):
    client.post(
        "/api/auth/register",
        json={"email": "dup@test.com", "password": "pass123", "full_name": "Dup"},
    )
    res = client.post(
        "/api/auth/register",
        json={"email": "dup@test.com", "password": "pass123", "full_name": "Dup"},
    )
    assert res.status_code == 400


def test_login(client):
    client.post(
        "/api/auth/register",
        json={
            "email": "login@test.com",
            "password": "pass123",
            "full_name": "Login User",
        },
    )
    res = client.post(
        "/api/auth/login",
        json={"email": "login@test.com", "password": "pass123"},
    )
    assert res.status_code == 200
    assert "token" in res.json()


def test_login_wrong_password(client):
    client.post(
        "/api/auth/register",
        json={
            "email": "badpw@test.com",
            "password": "pass123",
            "full_name": "Bad PW",
        },
    )
    res = client.post(
        "/api/auth/login",
        json={"email": "badpw@test.com", "password": "wrongpass"},
    )
    assert res.status_code == 401


def test_me(client, auth_headers):
    res = client.get("/api/auth/me", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["email"] == "test@example.com"


def test_me_no_token(client):
    res = client.get("/api/auth/me")
    assert res.status_code == 401 or res.status_code == 403


def test_forgot_password_unknown_email(client):
    res = client.post(
        "/api/auth/forgot-password",
        json={"email": "nonexistent@test.com"},
    )
    assert res.status_code == 200
    assert "message" in res.json()


def test_forgot_password_known_email(client, auth_headers):
    res = client.post(
        "/api/auth/forgot-password",
        json={"email": "test@example.com"},
    )
    assert res.status_code == 200
    data = res.json()
    # The token must NOT be exposed in the response; it is delivered out-of-band.
    assert "reset_token" not in data
    assert _reset_token_for("test@example.com")


def test_reset_password_success(client, auth_headers):
    client.post(
        "/api/auth/forgot-password",
        json={"email": "test@example.com"},
    )
    token = _reset_token_for("test@example.com")
    res = client.post(
        "/api/auth/reset-password",
        json={"token": token, "password": "newpass123"},
    )
    assert res.status_code == 200
    assert res.json()["message"] == "Password reset successfully"


def test_reset_password_bad_token(client):
    res = client.post(
        "/api/auth/reset-password",
        json={"token": "invalid-token", "password": "newpass123"},
    )
    assert res.status_code == 400


def test_reset_password_short_password(client, auth_headers):
    client.post(
        "/api/auth/forgot-password",
        json={"email": "test@example.com"},
    )
    token = _reset_token_for("test@example.com")
    res = client.post(
        "/api/auth/reset-password",
        json={"token": token, "password": "ab"},
    )
    assert res.status_code == 422
