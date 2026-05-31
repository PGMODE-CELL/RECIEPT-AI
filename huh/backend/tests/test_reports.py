def test_dashboard_health(client, auth_headers, org_id):
    client.post(
        "/api/transactions/simple",
        headers=auth_headers,
        json={
            "org_id": org_id,
            "description": "Income",
            "amount": 5000.00,
            "type": "money_in",
            "category": "Sales",
        },
    )
    client.post(
        "/api/transactions/simple",
        headers=auth_headers,
        json={
            "org_id": org_id,
            "description": "Expense",
            "amount": 2000.00,
            "type": "money_out",
            "category": "Rent",
        },
    )
    res = client.get(f"/api/reports/{org_id}/dashboard", headers=auth_headers)
    data = res.json()
    assert data["numbers"]["total_income"] == 5000.00
    assert data["numbers"]["total_expenses"] == 2000.00
    assert data["numbers"]["profit"] == 3000.00
    assert "healthy" in data["plain_english"]["health"].lower()


def test_profit_loss(client, auth_headers, org_id):
    client.post(
        "/api/transactions/simple",
        headers=auth_headers,
        json={
            "org_id": org_id,
            "description": "Revenue",
            "amount": 10000.00,
            "type": "money_in",
            "category": "Sales",
        },
    )
    res = client.get(f"/api/reports/{org_id}/profit-loss", headers=auth_headers)
    data = res.json()
    assert data["revenue"] == 10000.00
    assert data["profit"] == 10000.00
    assert data["margin"] == 100.0
