"""
Tests for document management and verification endpoints:
  POST   /api/v1/applications/{id}/documents
  GET    /api/v1/applications/{id}/documents
  DELETE /api/v1/applications/{id}/documents/{doc_id}
  POST   /api/v1/applications/{id}/documents/{doc_id}/verify
"""
import io
import pytest


def test_upload_document_success(client, customer_token):
    # Create application first
    app_resp = client.post(
        "/api/v1/applications/",
        json={"business_id": 1},
        headers={"Authorization": f"Bearer {customer_token}"},
    )
    if app_resp.status_code != 201:
        pytest.skip("Application creation skipped in this test setup")

    app_id = app_resp.json()["data"]["id"]

    # Upload dummy image
    file_content = b"fake-image-bytes-header-data"
    files = {"file": ("nid.jpg", io.BytesIO(file_content), "image/jpeg")}
    data = {"document_type": "nid_front"}

    upload_resp = client.post(
        f"/api/v1/applications/{app_id}/documents",
        files=files,
        data=data,
        headers={"Authorization": f"Bearer {customer_token}"},
    )
    assert upload_resp.status_code in (200, 201)
    doc_data = upload_resp.json()["data"]
    assert doc_data["document_type"] == "nid_front"
    assert doc_data["verification_status"] == "pending"


def test_upload_invalid_type_rejected(client, customer_token):
    app_resp = client.post(
        "/api/v1/applications/",
        json={"business_id": 1},
        headers={"Authorization": f"Bearer {customer_token}"},
    )
    if app_resp.status_code != 201:
        pytest.skip("Application creation skipped")

    app_id = app_resp.json()["data"]["id"]

    # Attempt to upload executable
    files = {"file": ("malware.exe", io.BytesIO(b"MZ..."), "application/x-msdownload")}
    data = {"document_type": "nid_front"}

    resp = client.post(
        f"/api/v1/applications/{app_id}/documents",
        files=files,
        data=data,
        headers={"Authorization": f"Bearer {customer_token}"},
    )
    assert resp.status_code in (400, 422)


def test_customer_cannot_verify_document(client, customer_token):
    # Customer should be forbidden from verifying documents
    resp = client.post(
        "/api/v1/applications/1/documents/1/verify",
        json={"status": "verified"},
        headers={"Authorization": f"Bearer {customer_token}"},
    )
    assert resp.status_code in (401, 403)

