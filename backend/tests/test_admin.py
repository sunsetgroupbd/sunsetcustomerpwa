"""
Tests for Admin endpoints:
  GET  /api/v1/admin/dashboard
  GET  /api/v1/admin/users
  POST /api/v1/admin/users
  GET  /api/v1/admin/audit-logs
"""
import pytest


def test_customer_cannot_access_admin_dashboard(client, customer_token):
    resp = client.get(
        "/api/v1/admin/dashboard",
        headers={"Authorization": f"Bearer {customer_token}"},
    )
    assert resp.status_code in (401, 403)


def test_unauthenticated_cannot_access_admin(client):
    resp = client.get("/api/v1/admin/dashboard")
    assert resp.status_code == 401


def test_admin_dashboard_stats(client, admin_token):
    resp = client.get(
        "/api/v1/admin/dashboard",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert "total_customers" in data
    assert "total_applications" in data
    assert "applications_by_status" in data


def test_admin_create_user(client, admin_token):
    payload = {
        "full_name": "New CR Officer",
        "mobile": "01799887766",
        "email": "newcr@sunsetgroup.com",
        "password": "Password@123",
        "role": "cr",
    }
    resp = client.post(
        "/api/v1/admin/users",
        json=payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code in (200, 201)
    data = resp.json()["data"]
    assert data["role"] == "cr"
    assert data["mobile"] == payload["mobile"]


def test_admin_list_audit_logs(client, admin_token):
    resp = client.get(
        "/api/v1/admin/audit-logs",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert "data" in body or "items" in body

