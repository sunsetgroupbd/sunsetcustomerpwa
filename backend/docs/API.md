# Sunset Customer Application Platform — API Reference Manual

Base URL: `/api/v1`  
Specification: OpenAPI 3.1.0 (Interactive docs at `/api/v1/docs`, ReDoc at `/api/v1/redoc`)

All requests and responses use JSON (`application/json`) unless otherwise specified (e.g., file uploads use `multipart/form-data`, exports return `.csv` or `.xlsx`).

---

## Standard Response Envelopes

### Success Envelope
```json
{
  "success": true,
  "data": { ... },
  "message": "Action completed successfully."
}
```

### Paginated Success Envelope
```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "total": 128,
    "page": 1,
    "per_page": 20,
    "total_pages": 7
  },
  "message": "Records retrieved successfully."
}
```

### Error Envelope
```json
{
  "success": false,
  "error": {
    "code": "INVALID_STATUS_TRANSITION",
    "message": "Cannot transition from 'draft' to 'approved'.",
    "details": null
  }
}
```

---

## 1. Authentication Module (`/api/v1/auth`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | None | Customer registration. Generates OTP. |
| `POST` | `/api/v1/auth/verify-otp` | None | Verify 6-digit OTP & activate account. |
| `POST` | `/api/v1/auth/login` | None | Mobile + Password authentication. Returns JWT tokens. |
| `POST` | `/api/v1/auth/refresh` | None | Refresh access token via token rotation. |
| `POST` | `/api/v1/auth/logout` | Bearer | Revokes the current refresh token. |
| `POST` | `/api/v1/auth/forgot-password` | None | Request password reset OTP. |
| `POST` | `/api/v1/auth/reset-password` | None | Reset password using verified OTP. |

### Register Request
```json
{
  "full_name": "Rahim Ahmed",
  "mobile": "01712345678",
  "email": "rahim@example.com",
  "password": "Password@123"
}
```

### Login Response
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOi...",
    "refresh_token": "eyJhbGciOi...",
    "token_type": "bearer",
    "expires_in": 1800
  },
  "message": "Login successful."
}
```

---

## 2. Customer Module (`/api/v1/customers`)

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `GET` | `/api/v1/customers/me` | Any | Get currently logged-in user profile. |
| `PATCH` | `/api/v1/customers/me` | Any | Update profile details (address, language, etc.). |
| `GET` | `/api/v1/customers` | Admin, CR | Paginated directory of customers. |
| `GET` | `/api/v1/customers/{id}` | Admin, CR, Owner | Detailed customer profile. |

---

## 3. Business Division Module (`/api/v1/businesses`)

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `GET` | `/api/v1/businesses` | Public | List all 4 active business divisions. |
| `GET` | `/api/v1/businesses/{id}` | Authenticated | Business detail, active pricing packages & terms. |
| `POST` | `/api/v1/businesses` | Admin | Create a new business division. |
| `PATCH` | `/api/v1/businesses/{id}` | Admin | Update business info. |

### Business Divisions Supported:
1. `SKH` — Sunset Kuakata Hotel & Resort
2. `DFI` — Dhaka Fantasy Island
3. `SCH` — Sun Care Hospital & Diagnostic Centre
4. `SPC` — Super Combo

---

## 4. Applications Module (`/api/v1/applications`)

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `POST` | `/api/v1/applications` | Customer, CR | Create application as draft. |
| `GET` | `/api/v1/applications` | Role-filtered | List applications. |
| `GET` | `/api/v1/applications/{id}` | Role-filtered | Get full application details. |
| `PATCH` | `/api/v1/applications/{id}` | Owner, CR, Admin | Update draft/correction application. |
| `POST` | `/api/v1/applications/{id}/submit` | Owner | Submit draft for review. |
| `POST` | `/api/v1/applications/{id}/assign` | Admin | Assign application to a CR officer. |
| `POST` | `/api/v1/applications/{id}/status` | CR, Admin | Transition status in state machine. |
| `GET` | `/api/v1/applications/{id}/history` | Role-filtered | Immutable audit log of status changes. |

### Application Statuses & State Machine
```
draft
  ├──> submitted ──> under_review ──┬──> documents_required ──> under_review
  │                                 ├──> correction_required ──> submitted
  │                                 ├──> approved
  │                                 └──> rejected
  └──> cancelled
```

---

## 5. Nominees Sub-Resource (`/api/v1/applications/{id}/nominees`)

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `POST` | `/api/v1/applications/{id}/nominees` | Owner, CR | Add nominee (Max 2: Primary & Optional). |
| `PATCH` | `/api/v1/applications/{id}/nominees/{nominee_id}` | Owner, CR | Update nominee details. |
| `DELETE` | `/api/v1/applications/{id}/nominees/{nominee_id}` | Owner, CR | Delete nominee. |

---

## 6. Documents Sub-Resource (`/api/v1/applications/{id}/documents`)

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `POST` | `/api/v1/applications/{id}/documents` | Owner, CR | Upload file (multipart/form-data). |
| `GET` | `/api/v1/applications/{id}/documents` | Role-filtered | List documents with presigned S3 URLs. |
| `DELETE` | `/api/v1/applications/{id}/documents/{document_id}` | Owner, CR | Delete document. |
| `POST` | `/api/v1/applications/{id}/documents/{document_id}/verify` | CR, Admin | Verify or reject document. |

### Allowed Document Types
- `applicant_photo`, `nominee_photo`, `nid_front`, `nid_back`, `passport`, `tin`, `other`

---

## 7. Remarks Sub-Resource (`/api/v1/applications/{id}/remarks`)

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `POST` | `/api/v1/applications/{id}/remarks` | Any authenticated | Add remark (`internal` or `customer_visible`). |
| `GET` | `/api/v1/applications/{id}/remarks` | Role-filtered | List remarks. |

---

## 8. Admin Module (`/api/v1/admin`)

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `GET` | `/api/v1/admin/dashboard` | Admin | Real-time PostgreSQL aggregation stats. |
| `GET` | `/api/v1/admin/dashboard/cr-performance` | Admin | CR officer application counts & rates. |
| `GET` | `/api/v1/admin/dashboard/documents` | Admin | Document verification metrics. |
| `GET` | `/api/v1/admin/users` | Admin | Paginated user management directory. |
| `POST` | `/api/v1/admin/users` | Admin | Create CR, Admin, or Customer user. |
| `GET` | `/api/v1/admin/users/{id}` | Admin | Get user detail. |
| `PATCH` | `/api/v1/admin/users/{id}` | Admin | Update user (role, active status, etc.). |
| `GET` | `/api/v1/admin/audit-logs` | Admin | System-wide audit log trail. |

---

## 9. Exports Module (`/api/v1/exports`)

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `GET` | `/api/v1/exports/applications/csv` | Admin, CR | Download filtered applications CSV. |
| `GET` | `/api/v1/exports/applications/xlsx` | Admin, CR | Download corporate-styled Excel workbook. |
| `GET` | `/api/v1/exports/customers/xlsx` | Admin | Customer master directory Excel. |
| `GET` | `/api/v1/exports/payments/xlsx` | Admin | Financial payment ledger with sum totals. |
| `GET` | `/api/v1/exports/cr-performance/xlsx` | Admin | CR productivity & SLA Excel report. |

### Query Filter Parameters:
`business_id`, `date_from`, `date_to`, `application_status`, `payment_status`, `assigned_cr_id`, `search`

