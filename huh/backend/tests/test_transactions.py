def test_money_in(client, auth_headers, org_id):
    res = client.post(
        "/api/transactions/simple",
        headers=auth_headers,
        json={
            "org_id": org_id,
            "description": "Client payment",
            "amount": 1000.00,
            "type": "money_in",
            "category": "Sales",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["message"] == "Recorded!"
    assert "$1000.00" in data["plain_english"]


def test_money_out(client, auth_headers, org_id):
    res = client.post(
        "/api/transactions/simple",
        headers=auth_headers,
        json={
            "org_id": org_id,
            "description": "Office rent",
            "amount": 500.00,
            "type": "money_out",
            "category": "Rent",
        },
    )
    assert res.status_code == 200


def test_balance_updates(client, auth_headers, org_id):
    client.post(
        "/api/transactions/simple",
        headers=auth_headers,
        json={
            "org_id": org_id,
            "description": "Sale",
            "amount": 1000.00,
            "type": "money_in",
            "category": "Sales",
        },
    )
    res = client.get(f"/api/reports/{org_id}/dashboard", headers=auth_headers)
    data = res.json()
    assert data["numbers"]["total_income"] == 1000.00


def test_list_transactions(client, auth_headers, org_id):
    client.post(
        "/api/transactions/simple",
        headers=auth_headers,
        json={
            "org_id": org_id,
            "description": "Test",
            "amount": 100.00,
            "type": "money_in",
            "category": "Sales",
        },
    )
    res = client.get(f"/api/transactions/{org_id}", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 1
    assert len(data["items"]) == 1
