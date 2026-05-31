def test_get_countries(client):
    res = client.get("/api/setup/countries")
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 5
    codes = [c["code"] for c in data]
    assert "US" in codes
    assert "IN" in codes


def test_setup_org(client, auth_headers):
    res = client.post(
        "/api/setup/create",
        headers=auth_headers,
        json={"name": "My Company", "country": "IN"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["name"] == "My Company"
    assert "org_id" in data
    assert data["org_id"] > 0
    assert "ready" in data["message"].lower()


def test_list_orgs(client, auth_headers):
    client.post(
        "/api/setup/create",
        headers=auth_headers,
        json={"name": "Org 1", "country": "US"},
    )
    res = client.get("/api/orgs", headers=auth_headers)
    assert res.status_code == 200
    assert len(res.json()) == 1
