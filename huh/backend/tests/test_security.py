"""Regression tests for the security fixes: tenant isolation and 2FA enforcement."""

import pyotp


def _register(client, email):
    res = client.post(
        "/api/auth/register",
        json={"email": email, "password": "pass123", "full_name": email},
    )
    return {"Authorization": f"Bearer {res.json()['token']}"}


def _make_org(client, headers, name="Org"):
    res = client.post(
        "/api/setup/create",
        headers=headers,
        json={"name": name, "country": "US"},
    )
    return res.json()["org_id"]


def test_cross_org_access_is_forbidden(client):
    owner = _register(client, "owner@test.com")
    org_id = _make_org(client, owner, "Owner Org")

    # Owner can read their own org's invoices.
    assert client.get(f"/api/invoices/{org_id}", headers=owner).status_code == 200

    # A different, authenticated user is not a member -> 403.
    outsider = _register(client, "outsider@test.com")
    res = client.get(f"/api/invoices/{org_id}", headers=outsider)
    assert res.status_code == 403


def test_org_routes_require_authentication(client):
    owner = _register(client, "owner2@test.com")
    org_id = _make_org(client, owner, "Owner Org 2")
    res = client.get(f"/api/invoices/{org_id}")
    assert res.status_code in (401, 403)


def test_login_enforces_2fa_when_enabled(client):
    headers = _register(client, "twofa@test.com")
    secret = client.post(
        "/api/auth/2fa/setup", headers=headers, data={"password": "pass123"}
    ).json()["secret"]
    code = pyotp.TOTP(secret).now()
    assert (
        client.post(
            "/api/auth/2fa/verify", headers=headers, data={"token": code}
        ).status_code
        == 200
    )

    # Login without a code must now be rejected.
    res = client.post(
        "/api/auth/login", json={"email": "twofa@test.com", "password": "pass123"}
    )
    assert res.status_code == 401

    # Login with a valid code succeeds.
    res = client.post(
        "/api/auth/login",
        json={
            "email": "twofa@test.com",
            "password": "pass123",
            "totp_code": pyotp.TOTP(secret).now(),
        },
    )
    assert res.status_code == 200
    assert "token" in res.json()


def test_forgot_password_never_returns_token(client):
    _register(client, "noleak@test.com")
    res = client.post("/api/auth/forgot-password", json={"email": "noleak@test.com"})
    assert res.status_code == 200
    assert "reset_token" not in res.json()
