"""Tests for all new route modules: forex, depreciation, payroll, audit, roles, TDS, email, aging, projects, attachments, consolidation, notifications, search, contacts, invoices, bills, budgets, receipts, reports"""

import json
import io


def test_create_contact(client, auth_headers, org_id):
    res = client.post(
        f"/api/contacts/{org_id}",
        headers=auth_headers,
        data={"name": "John Doe", "email": "john@test.com", "type": "customer"},
    )
    assert res.status_code == 200
    assert res.json()["name"] == "John Doe"


def test_list_contacts_paginated(client, auth_headers, org_id):
    for i in range(3):
        client.post(
            f"/api/contacts/{org_id}",
            headers=auth_headers,
            data={"name": f"Contact {i}", "type": "customer"},
        )
    res = client.get(f"/api/contacts/{org_id}?page=1&per_page=2", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 3
    assert len(data["items"]) == 2


def test_create_invoice(client, auth_headers, org_id):
    client.post(
        f"/api/contacts/{org_id}",
        headers=auth_headers,
        data={"name": "Customer", "type": "customer"},
    )
    res = client.post(
        f"/api/invoices/{org_id}",
        headers=auth_headers,
        data={"contact_id": 1, "items": json.dumps([{"description": "Service", "quantity": 1, "price": 100}])},
    )
    assert res.status_code == 200
    assert res.json()["total"] == 100


def test_list_invoices_paginated(client, auth_headers, org_id):
    client.post(
        f"/api/contacts/{org_id}",
        headers=auth_headers,
        data={"name": "Customer", "type": "customer"},
    )
    client.post(
        f"/api/invoices/{org_id}",
        headers=auth_headers,
        data={"contact_id": 1, "items": json.dumps([{"description": "Svc", "quantity": 1, "price": 50}])},
    )
    res = client.get(f"/api/invoices/{org_id}?page=1&per_page=10", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 1
    assert len(data["items"]) == 1


def test_pay_invoice(client, auth_headers, org_id):
    client.post(
        f"/api/contacts/{org_id}",
        headers=auth_headers,
        data={"name": "Customer", "type": "customer"},
    )
    inv = client.post(
        f"/api/invoices/{org_id}",
        headers=auth_headers,
        data={"contact_id": 1, "items": json.dumps([{"description": "Svc", "quantity": 1, "price": 200}])},
    ).json()
    res = client.post(
        f"/api/invoices/{org_id}/{inv['invoice_id']}/pay",
        headers=auth_headers,
        data={"amount": 200},
    )
    assert res.status_code == 200
    assert res.json()["remaining"] == 0


def test_create_bill(client, auth_headers, org_id):
    client.post(
        f"/api/contacts/{org_id}",
        headers=auth_headers,
        data={"name": "Supplier", "type": "supplier"},
    )
    res = client.post(
        f"/api/bills/{org_id}",
        headers=auth_headers,
        data={"contact_id": 1, "amount": 500, "description": "Office supplies", "due_days": 30},
    )
    assert res.status_code == 200
    assert "BILL" in res.json()["number"]


def test_list_bills_paginated(client, auth_headers, org_id):
    client.post(
        f"/api/contacts/{org_id}",
        headers=auth_headers,
        data={"name": "Supplier", "type": "supplier"},
    )
    client.post(
        f"/api/bills/{org_id}",
        headers=auth_headers,
        data={"contact_id": 1, "amount": 300, "description": "Items"},
    )
    res = client.get(f"/api/bills/{org_id}?page=1&per_page=10", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["total"] == 1


def test_create_budget(client, auth_headers, org_id):
    res = client.post(
        f"/api/budgets/{org_id}?category=Food&amount=1000&period=monthly",
        headers=auth_headers,
    )
    assert res.status_code == 200
    assert res.json()["category"] == "Food"


def test_list_budgets_paginated(client, auth_headers, org_id):
    client.post(
        f"/api/budgets/{org_id}?category=Travel&amount=500",
        headers=auth_headers,
    )
    res = client.get(f"/api/budgets/{org_id}?page=1&per_page=10", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 1


def test_upload_receipt(client, auth_headers, org_id):
    res = client.post(
        f"/api/receipts/{org_id}/upload",
        headers=auth_headers,
        files={"file": ("receipt.pdf", io.BytesIO(b"fake pdf content"), "application/pdf")},
    )
    assert res.status_code == 200
    assert "receipt_id" in res.json()


def test_list_receipts_paginated(client, auth_headers, org_id):
    res = client.get(f"/api/receipts/{org_id}?page=1&per_page=10", headers=auth_headers)
    assert res.status_code == 200
    assert "items" in res.json()


def test_dashboard_reports(client, auth_headers, org_id):
    res = client.get(f"/api/reports/{org_id}/dashboard", headers=auth_headers)
    assert res.status_code == 200
    assert "numbers" in res.json()
    assert "plain_english" in res.json()


def test_profit_loss(client, auth_headers, org_id):
    res = client.get(f"/api/reports/{org_id}/profit-loss?start_date=2024-01-01&end_date=2024-12-31", headers=auth_headers)
    assert res.status_code == 200
    assert "revenue" in res.json()


def test_forex_rate(client, auth_headers, org_id):
    res = client.post(
        "/api/forex/rates",
        headers=auth_headers,
        data={"from_currency": "USD", "to_currency": "EUR", "rate": "0.92"},
    )
    assert res.status_code == 200
    assert "Rate" in res.json()["message"]

    res = client.get("/api/forex/rates?from_cur=USD&to_cur=EUR", headers=auth_headers)
    assert res.status_code == 200
    assert len(res.json()) > 0


def test_forex_conversion(client, auth_headers, org_id):
    client.post(
        "/api/forex/rates",
        headers=auth_headers,
        data={"from_currency": "USD", "to_currency": "EUR", "rate": "0.92"},
    )
    res = client.get("/api/forex/convert?amount=100&from_cur=USD&to_cur=EUR", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["converted"] == 92.0


def test_create_asset(client, auth_headers, org_id):
    res = client.post(
        f"/api/depreciation/{org_id}/assets",
        headers=auth_headers,
        data={"name": "Laptop", "purchase_cost": "1200", "useful_life_years": "3", "salvage_value": "0", "method": "straight_line"},
    )
    assert res.status_code == 200
    assert res.json()["name"] == "Laptop"


def test_list_assets(client, auth_headers, org_id):
    client.post(
        f"/api/depreciation/{org_id}/assets",
        headers=auth_headers,
        data={"name": "Server", "purchase_cost": "5000", "useful_life_years": "5", "salvage_value": "500", "method": "straight_line"},
    )
    res = client.get(f"/api/depreciation/{org_id}/assets", headers=auth_headers)
    assert res.status_code == 200
    assert len(res.json()) >= 1


def test_create_employee(client, auth_headers, org_id):
    res = client.post(
        f"/api/payroll/{org_id}/employees",
        headers=auth_headers,
        data={"name": "Alice", "email": "alice@test.com", "department": "Engineering", "designation": "Developer"},
    )
    assert res.status_code == 200
    assert res.json()["name"] == "Alice"


def test_add_salary_component(client, auth_headers, org_id):
    emp = client.post(
        f"/api/payroll/{org_id}/employees",
        headers=auth_headers,
        data={"name": "Bob", "email": "bob@test.com"},
    ).json()
    res = client.post(
        f"/api/payroll/{org_id}/employees/{emp['id']}/components",
        headers=auth_headers,
        data={"basic": "30000", "hra": "15000"},
    )
    assert res.status_code == 200


def test_generate_payslip(client, auth_headers, org_id):
    emp = client.post(
        f"/api/payroll/{org_id}/employees",
        headers=auth_headers,
        data={"name": "Charlie", "email": "charlie@test.com", "doj": "2024-01-01"},
    ).json()
    client.post(
        f"/api/payroll/{org_id}/employees/{emp['id']}/components",
        headers=auth_headers,
        data={"basic": "30000", "hra": "15000"},
    )
    res = client.post(
        f"/api/payroll/{org_id}/employees/{emp['id']}/payslip",
        headers=auth_headers,
        data={"month": "2024-06"},
    )
    assert res.status_code == 200
    assert "net_pay" in res.json()


def test_audit_log(client, auth_headers, org_id):
    res = client.get(f"/api/audit/{org_id}?page=1&per_page=10", headers=auth_headers)
    assert res.status_code == 200
    assert "items" in res.json()


def test_team_roles(client, auth_headers, org_id):
    res = client.get(f"/api/roles/{org_id}/members", headers=auth_headers)
    assert res.status_code == 200


def test_tds_rates(client, auth_headers, org_id):
    res = client.post(
        f"/api/tds/{org_id}/rates",
        headers=auth_headers,
        data={"section": "192", "name": "Salary", "rate": "10.0", "threshold": "500000"},
    )
    assert res.status_code == 200


def test_tds_deduction(client, auth_headers, org_id):
    client.post(
        f"/api/tds/{org_id}/rates",
        headers=auth_headers,
        data={"section": "192", "name": "Salary", "rate": "10.0", "threshold": "0"},
    )
    res = client.post(
        f"/api/tds/{org_id}/compute",
        headers=auth_headers,
        data={"section": "192", "deductee_name": "Vendor A", "amount": "100000", "date_str": "2024-06-15"},
    )
    assert res.status_code == 200
    assert res.json()["tds_amount"] == 10000


def test_aging_report(client, auth_headers, org_id):
    res = client.get(f"/api/aging/{org_id}/receivables", headers=auth_headers)
    assert res.status_code == 200
    assert "buckets" in res.json()

    res = client.get(f"/api/aging/{org_id}/payables", headers=auth_headers)
    assert res.status_code == 200


def test_create_project(client, auth_headers, org_id):
    res = client.post(
        f"/api/projects/{org_id}",
        headers=auth_headers,
        data={"name": "Website Redesign", "budget": "10000", "status": "active"},
    )
    assert res.status_code == 200
    assert res.json()["name"] == "Website Redesign"


def test_project_profit_loss(client, auth_headers, org_id):
    proj = client.post(
        f"/api/projects/{org_id}",
        headers=auth_headers,
        data={"name": "Mobile App", "budget": "20000"},
    ).json()
    res = client.get(f"/api/projects/{org_id}/{proj['id']}/pnl", headers=auth_headers)
    assert res.status_code == 200


def test_upload_attachment(client, auth_headers, org_id):
    res = client.post(
        f"/api/attachments/{org_id}/upload",
        headers=auth_headers,
        files={"file": ("test.pdf", io.BytesIO(b"fake content"), "application/pdf")},
        data={"record_type": "transaction", "record_id": "0"},
    )
    assert res.status_code == 200
    assert "original_name" in res.json()


def test_list_attachments(client, auth_headers, org_id):
    res = client.get(f"/api/attachments/{org_id}/list?record_type=transaction&record_id=0", headers=auth_headers)
    assert res.status_code == 200


def test_consolidation(client, auth_headers, org_id):
    res = client.get(f"/api/consolidation/{org_id}/summary", headers=auth_headers)
    assert res.status_code == 200
    assert "income" in res.json()
    assert "expenses" in res.json()


def test_notifications(client, auth_headers, org_id):
    res = client.post(f"/api/notifications/{org_id}/generate", headers=auth_headers)
    assert res.status_code == 200

    res = client.get(f"/api/notifications/{org_id}?limit=10", headers=auth_headers)
    assert res.status_code == 200
    assert "notifications" in res.json()
    assert "unread_count" in res.json()


def test_mark_notification_read(client, auth_headers, org_id):
    client.post(f"/api/notifications/{org_id}/generate", headers=auth_headers)
    n = client.get(f"/api/notifications/{org_id}", headers=auth_headers).json()
    if n["notifications"]:
        nid = n["notifications"][0]["id"]
        res = client.put(f"/api/notifications/{org_id}/read/{nid}", headers=auth_headers)
        assert res.status_code == 200
        assert res.json()["read"] is True


def test_mark_all_read(client, auth_headers, org_id):
    client.post(f"/api/notifications/{org_id}/generate", headers=auth_headers)
    res = client.put(f"/api/notifications/{org_id}/read-all", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["ok"] is True


def test_global_search(client, auth_headers, org_id):
    res = client.get(f"/api/search/{org_id}?q=test", headers=auth_headers)
    assert res.status_code == 200
    assert "results" in res.json()


def test_search_empty(client, auth_headers, org_id):
    res = client.get(f"/api/search/{org_id}?q=", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["results"] == []


def test_csv_export(client, auth_headers, org_id):
    res = client.get(f"/api/export/{org_id}/transactions", headers=auth_headers)
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]

    res = client.get(f"/api/export/{org_id}/invoices", headers=auth_headers)
    assert res.status_code == 200

    res = client.get(f"/api/export/{org_id}/bills", headers=auth_headers)
    assert res.status_code == 200


def test_email_config(client, auth_headers, org_id):
    res = client.post(
        "/api/email/invoice/0",
        headers=auth_headers,
    )
    # Invoice 0 doesn't exist, so we expect 404
    assert res.status_code == 404
