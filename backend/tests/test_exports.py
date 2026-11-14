"""
Tests for Data Export endpoints:
  GET /api/v1/exports/applications/csv
  GET /api/v1/exports/applications/xlsx
  GET /api/v1/exports/customers/xlsx
  GET /api/v1/exports/payments/xlsx
  GET /api/v1/exports/cr-performance/xlsx
"""
import pytest


def test_customer_cannot_export(client, customer_token):
    resp = client.get(
        "/api/v1/exports/applications/csv",
        headers={"Authorization": f"Bearer {customer_token}"},
    )
    assert resp.status_code in (401, 403)


def test_export_applications_csv(client, admin_token):
    resp = client.get(
        "/api/v1/exports/applications/csv",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("text/csv")
    assert "attachment;" in resp.headers.get("content-disposition", "")


def test_export_applications_xlsx(client, admin_token):
    resp = client.get(
        "/api/v1/exports/applications/xlsx",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    assert "spreadsheetml" in resp.headers["content-type"]
    assert len(resp.content) > 100  # Valid Excel file bytes


def test_export_payments_xlsx(client, admin_token):
    resp = client.get(
        "/api/v1/exports/payments/xlsx",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    assert "spreadsheetml" in resp.headers["content-type"]


def test_export_cr_performance_xlsx(client, admin_token):
    resp = client.get(
        "/api/v1/exports/cr-performance/xlsx",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    assert "spreadsheetml" in resp.headers["content-type"]

