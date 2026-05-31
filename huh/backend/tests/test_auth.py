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
