# Sunset Customer Application Platform — Complete API Documentation

Comprehensive API documentation for the **Sunset Customer Application Platform Backend API**.
This document describes all endpoints, exact request schemas, response payloads, authentication requirements, role-based access rules, status codes, and error formats.

---

## 1. Global Specifications

- **Base URL:** `http://localhost:8000/api/v1`
- **Interactive Swagger UI:** `http://localhost:8000/api/v1/docs`
- **ReDoc:** `http://localhost:8000/api/v1/redoc`
- **OpenAPI JSON Spec:** `http://localhost:8000/api/v1/openapi.json`
- **Authentication Scheme:** HTTP Bearer token via `Authorization: Bearer <access_token>`
- **Token Lifetimes:**
  - Access Token: `30 minutes`
  - Refresh Token: `7 days`
- **Default Content-Type:** `application/json` (except document uploads: `multipart/form-data`, file exports: `text/csv` / `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`)

---

## 2. Standard Response Envelopes

### Success Envelope
Every successful endpoint returns JSON structured as:
```json
{
  "success": true,
  "data": { ... },
  "message": "Action completed successfully."
}
```

### Paginated Success Envelope
Endpoints returning lists of records return pagination metadata in `meta` or top-level items:
```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "total": 120,
    "page": 1,
    "per_page": 20,
    "total_pages": 6
  },
  "message": "Records retrieved successfully."
}
```

### Error Envelope
Any 4xx or 5xx response returns a standard error body:
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

## 3. Business Divisions Supported

Every application is linked to a `business_id`:

| ID | Name | Code | Description |
|---|---|---|---|
| `1` | Sunset Kuakata Hotel & Resort | `SKH` | Premium hotel and resort located at Kuakata sea beach |
| `2` | Dhaka Fantasy Island | `DFI` | Entertainment and leisure theme park in Dhaka |
| `3` | Sun Care Hospital & Diagnostic Centre | `SCH` | Modern hospital and specialized diagnostic center |
| `4` | Super Combo | `SPC` | Combined ownership package across Sunset Group properties |

---

## 4. Roles and Permissions Matrix

| Permission / Capability | Customer | CR Team | Admin |
|---|:---:|:---:|:---:|
| Register & Login | ✅ | ✅ | ✅ |
| View / Edit Own Profile | ✅ | ✅ | ✅ |
| Create Draft Application | ✅ | ✅ (on behalf) | ✅ |
| Update Draft Application | ✅ | ✅ | ✅ |
| Upload & Delete Draft Documents | ✅ | ✅ | ✅ |
| Submit Application | ✅ | ❌ | ❌ |
| Verify / Reject Uploaded Document | ❌ | ✅ | ✅ |
| Request Correction (`correction_required`) | ❌ | ✅ | ✅ |
| Request Missing Documents (`documents_required`) | ❌ | ✅ | ✅ |
| Move to Under Review (`under_review`) | ❌ | ✅ | ✅ |
| Final Approval (`approved`) | ❌ | ❌ | ✅ |
| Final Rejection (`rejected`) | ❌ | ✅ | ✅ |
| Assign CR Officer to Application | ❌ | ❌ | ✅ |
| View All Applications | ❌ (Own only) | ✅ (Assigned/All) | ✅ |
| View / Export Financial Reports & CSV/XLSX | ❌ | ✅ (Masked) | ✅ (Full) |
| Manage System Users (CRUD) | ❌ | ❌ | ✅ |
| View Audit Trail Logs | ❌ | ❌ | ✅ |

---

## 5. Endpoints Reference

### 5.1 Authentication (`/auth`)

#### `POST /auth/register`
- **Auth Required:** None
- **Description:** Customer registration. Validates Bangladeshi phone numbers (`013-019XXXXXXXX`) and strong password. Automatically generates and sends OTP.
- **Request Body:**
```json
{
  "full_name": "Rahim Ahmed",
  "mobile": "01712345678",
  "email": "rahim@example.com",
  "password": "Password@123"
}
```
- **Response `201 Created`:**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "full_name": "Rahim Ahmed",
    "mobile": "01712345678",
    "email": "rahim@example.com",
    "role": "customer",
    "is_active": true,
    "is_verified": false,
    "created_at": "2026-11-14T12:00:00Z"
  },
  "message": "Registration successful. Please verify your mobile number with the OTP sent."
}
```

---

#### `POST /auth/verify-otp`
- **Auth Required:** None (Rate limit: 10/min)
- **Description:** Verifies 6-digit OTP and activates account (`is_verified = True`).
- **Request Body:**
```json
{
  "mobile": "01712345678",
  "otp": "123456",
  "purpose": "registration"
}
```
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "message": "Mobile number verified successfully."
  },
  "message": "OTP verified successfully."
}
```

---

#### `POST /auth/login`
- **Auth Required:** None (Rate limit: 10/min)
- **Description:** Logs in user using mobile and password. Returns JWT access token and rotating refresh token.
- **Request Body:**
```json
{
  "mobile": "01700000000",
  "password": "Admin@123"
}
```
- **Response `200 OK`:**
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

#### `POST /auth/refresh`
- **Auth Required:** None
- **Description:** Exchanges a valid refresh token for a brand-new access token and rotated refresh token. Revokes the old refresh token.
- **Request Body:**
```json
{
  "refresh_token": "eyJhbGciOi..."
}
```
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOi...",
    "refresh_token": "eyJhbGciOi...",
    "token_type": "bearer",
    "expires_in": 1800
  },
  "message": "Tokens refreshed successfully."
}
```

---

#### `POST /auth/logout`
- **Auth Required:** Bearer Token
- **Description:** Revokes the refresh token from database.
- **Request Body:**
```json
{
  "refresh_token": "eyJhbGciOi..."
}
```
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": null,
  "message": "Logged out successfully."
}
```

---

#### `POST /auth/forgot-password`
- **Auth Required:** None (Rate limit: 5/min)
- **Request Body:**
```json
{
  "mobile": "01712345678"
}
```
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": null,
  "message": "If that mobile number is registered, an OTP has been sent."
}
```

---

#### `POST /auth/reset-password`
- **Auth Required:** None
- **Request Body:**
```json
{
  "mobile": "01712345678",
  "otp": "123456",
  "new_password": "NewPassword@123"
}
```
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": null,
  "message": "Password reset successfully."
}
```

---

### 5.2 Customers (`/customers`)

#### `GET /customers/me`
- **Auth Required:** Any authenticated role (`customer`, `cr`, `admin`)
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "full_name": "Rahim Ahmed",
    "mobile": "01712345678",
    "email": "rahim@example.com",
    "role": "customer",
    "is_active": true,
    "is_verified": true,
    "created_at": "2026-11-14T12:00:00Z",
    "profile": {
      "preferred_language": "en",
      "address": "House 12, Road 4, Dhanmondi",
      "district": "Dhaka",
      "division": "Dhaka",
      "post_code": "1205"
    }
  },
  "message": "Profile retrieved successfully."
}
```

---

#### `PATCH /customers/me`
- **Auth Required:** Any authenticated role
- **Request Body:**
```json
{
  "preferred_language": "bn",
  "address": "Flat 4B, Sector 7, Uttara",
  "district": "Dhaka",
  "division": "Dhaka",
  "post_code": "1230"
}
```
- **Response `200 OK`:** Updated profile object.

---

#### `GET /customers`
- **Auth Required:** `admin`, `cr`
- **Query Parameters:** `page=1`, `per_page=20`, `search=Rahim`
- **Response `200 OK`:** Paginated list of customer accounts.

---

#### `GET /customers/{customer_id}`
- **Auth Required:** `admin`, `cr`, or owning customer
- **Response `200 OK`:** Complete customer profile.

---

### 5.3 Businesses (`/businesses`)

#### `GET /businesses`
- **Auth Required:** None (Public)
- **Query Parameters:** `page=1`, `per_page=20`, `search=`
- **Response `200 OK`:** List of all 4 active business divisions (`SKH`, `DFI`, `SCH`, `SPC`).

---

#### `GET /businesses/{business_id}`
- **Auth Required:** Any authenticated role
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Sunset Kuakata Hotel & Resort",
    "code": "SKH",
    "description": "Premium hotel and resort located at Kuakata sea beach.",
    "is_active": true,
    "created_at": "2026-11-14T12:00:00Z",
    "pricing": [
      {
        "id": 1,
        "package_name": "Platinum Suite",
        "price": 500000.0,
        "effective_from": "2026-01-01"
      }
    ],
    "terms": {
      "id": 1,
      "version": "v1.0",
      "content": "All terms and conditions of ownership..."
    }
  },
  "message": "Business retrieved successfully."
}
```

---

#### `POST /businesses` & `PATCH /businesses/{id}`
- **Auth Required:** `admin` only.

---

### 5.4 Applications (`/applications`)

#### `POST /applications`
- **Auth Required:** `customer`, `cr`, `admin`
- **Description:** Creates an application in `draft` status.
- **Request Body:**
```json
{
  "business_id": 1,
  "applicant_info": {
    "full_name_en": "RAHIM AHMED",
    "full_name_bn": "রহিম আহমেদ",
    "father_name": "Karim Ahmed",
    "mother_name": "Amena Begum",
    "spouse_name": "Fatema Ahmed",
    "present_address": "House 12, Road 4, Dhanmondi, Dhaka",
    "permanent_address": "Vill: Sonapur, P.O: Raipur, Noakhali",
    "mobile_number": "01712345678",
    "phone_number": "029876543",
    "date_of_birth": "1990-05-15",
    "nationality": "Bangladeshi",
    "religion": "Islam",
    "nid_number": "19901234567890123",
    "passport_number": "A01234567",
    "tin_number": "123456789012",
    "personal_email": "rahim@example.com",
    "company_name": "ABC Logistics Ltd",
    "office_address": "Gulshan 1, Dhaka",
    "designation": "General Manager",
    "cell_number": "01712345678"
  },
  "bank_detail": {
    "account_name": "RAHIM AHMED",
    "account_number": "102345678901",
    "bank_name": "City Bank PLC",
    "branch": "Dhanmondi Branch"
  },
  "ownership_detail": {
    "package": "Platinum",
    "number_of_ownership": 1,
    "price_per_ownership": 500000.0,
    "discount": 25000.0,
    "total_price": 475000.0,
    "amount_in_words": "Four Lakh Seventy Five Thousand Taka Only"
  },
  "payment_detail": {
    "token_money": 25000.0,
    "booking_money": 100000.0,
    "booking_money_date": "2026-11-20",
    "installment_type": "monthly",
    "number_of_installments": 24,
    "installment_amount": 14583.33,
    "installment_starting_date": "2026-12-01",
    "dues_amount": 350000.0
  }
}
```
- **Response `201 Created`:** Full Application object with generated `application_number` (e.g. `SKH-2026-00001`).

---

#### `GET /applications`
- **Auth Required:** Any authenticated role.
  - `customer`: Automatically filtered to own applications.
  - `cr`: View assigned / permitted applications.
  - `admin`: View all applications.
- **Query Parameters:**
  - `page` (default 1)
  - `per_page` (default 20)
  - `search` (Search by application number, applicant name, mobile, NID)
  - `status` (`draft`, `submitted`, `under_review`, `documents_required`, `correction_required`, `approved`, `rejected`, `cancelled`)
  - `business_id` (`1`, `2`, `3`, `4`)
  - `payment_status` (`pending`, `partial`, `paid`, `overdue`, `refunded`)
  - `assigned_cr_id` (CR user ID)
- **Response `200 OK`:** Paginated array of applications.

---

#### `GET /applications/{application_id}`
- **Auth Required:** Customer (owner), CR, Admin
- **Response `200 OK`:** Full Application object including `applicant_info`, `nominees`, `bank_detail`, `ownership_detail`, `payment_detail`, `business`, and `assigned_cr`.

---

#### `PATCH /applications/{application_id}`
- **Auth Required:** Customer (owner for `draft` or `correction_required`), CR, Admin
- **Description:** Partial update of application form fields.
- **Request Body:** Same schema as `POST /applications` (all fields optional) + `"declaration_accepted": true`.

---

#### `POST /applications/{application_id}/submit`
- **Auth Required:** Customer (owner)
- **Description:** Submits a `draft` application for official review. Requires `"declaration_accepted": true`. Transitions status to `submitted`.

---

#### `POST /applications/{application_id}/assign`
- **Auth Required:** `admin` only
- **Request Body:**
```json
{
  "cr_user_id": 3
}
```
- **Response `200 OK`:** Assigns application to the designated CR officer and creates active assignment record.

---

#### `POST /applications/{application_id}/status`
- **Auth Required:** `cr`, `admin`
- **Description:** State machine transition.
- **Allowed Transitions:**
  - `submitted` ➔ `under_review` or `cancelled`
  - `under_review` ➔ `documents_required`, `correction_required`, `approved` (Admin only), `rejected`
  - `documents_required` ➔ `under_review` or `cancelled`
  - `correction_required` ➔ `submitted` or `cancelled`
- **Request Body:**
```json
{
  "new_status": "under_review",
  "reason": "All documents verified and initial payment received."
}
```

---

#### `GET /applications/{application_id}/history`
- **Auth Required:** Customer (owner), CR, Admin
- **Response `200 OK`:** Immutable list of status changes with timestamps, reason, and changing officer ID.

---

### 5.5 Nominees (`/applications/{id}/nominees`)

#### `POST /applications/{id}/nominees`
- **Auth Required:** Customer (owner), CR
- **Constraint:** Maximum 2 nominees allowed per application (`nominee_number` must be `1` or `2`).
- **Request Body:**
```json
{
  "nominee_number": 1,
  "name": "Fatema Ahmed",
  "father_or_husband_name": "Rahim Ahmed",
  "nid_or_passport": "1992987654321",
  "cell_number": "01787654321",
  "relationship": "Spouse",
  "date_of_birth": "1992-08-20"
}
```

#### `PATCH /applications/{id}/nominees/{nominee_id}` & `DELETE /applications/{id}/nominees/{nominee_id}`
- **Auth Required:** Customer (owner), CR

---

### 5.6 Documents (`/applications/{id}/documents`)

#### `POST /applications/{id}/documents`
- **Auth Required:** Customer (owner), CR
- **Content-Type:** `multipart/form-data`
- **Form Fields:**
  - `document_type`: (`applicant_photo`, `nominee_photo`, `nid_front`, `nid_back`, `passport`, `tin`, `other`)
  - `file`: Binary file (JPEG, PNG, WebP, or PDF. Max 10MB).
- **Response `201 Created`:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "application_id": 1,
    "document_type": "applicant_photo",
    "original_filename": "photo.jpg",
    "mime_type": "image/jpeg",
    "file_size": 245000,
    "uploaded_by_id": 2,
    "verification_status": "pending",
    "created_at": "2026-11-14T12:00:00Z"
  },
  "message": "Document uploaded successfully."
}
```

---

#### `GET /applications/{id}/documents`
- **Auth Required:** Customer (owner), CR, Admin
- **Description:** Lists all uploaded documents with expiring **presigned download URLs** (`download_url`).

---

#### `POST /applications/{id}/documents/{document_id}/verify`
- **Auth Required:** `cr`, `admin`
- **Request Body:**
```json
{
  "status": "verified",
  "rejection_reason": null
}
```
*(If rejecting, pass `"status": "rejected"` and `"rejection_reason": "NID front image is blurred"`).*

---

#### `DELETE /applications/{id}/documents/{document_id}`
- **Auth Required:** Customer (draft only), CR, Admin

---

### 5.7 Remarks (`/applications/{id}/remarks`)

#### `POST /applications/{id}/remarks`
- **Auth Required:** Any authenticated role
- **Request Body:**
```json
{
  "remark": "Customer submitted updated TIN certificate.",
  "visibility": "customer_visible"
}
```
*(Options for `visibility`: `"internal"` for CR/Admin only, `"customer_visible"` for customer notices).*

---

#### `GET /applications/{id}/remarks`
- **Auth Required:** Role-filtered. Customers only see `customer_visible` remarks.

---

### 5.8 Admin Portal (`/admin`)

*All endpoints in this section require `role: "admin"`.*

#### `GET /admin/dashboard`
- **Response `200 OK`:** Real-time PostgreSQL aggregation stats:
```json
{
  "success": true,
  "data": {
    "total_customers": 450,
    "total_applications": 520,
    "applications_by_status": {
      "draft": 40,
      "submitted": 35,
      "under_review": 65,
      "documents_required": 15,
      "correction_required": 10,
      "approved": 320,
      "rejected": 25,
      "cancelled": 10
    },
    "applications_by_business": {
      "Sunset Kuakata Hotel & Resort": 260,
      "Dhaka Fantasy Island": 140,
      "Sun Care Hospital & Diagnostic Centre": 80,
      "Super Combo": 40
    },
    "pending_applications": 125,
    "approved_applications": 320,
    "rejected_applications": 25,
    "today_applications": 12,
    "this_month_applications": 145
  },
  "message": "Dashboard metrics retrieved."
}
```

---

#### `GET /admin/dashboard/cr-performance`
- **Response `200 OK`:** Applications assigned, pending, approved, and rejected per CR officer.

---

#### `GET /admin/dashboard/documents`
- **Response `200 OK`:** Count of verified, pending, and rejected documents.

---

#### `GET /admin/users`
- **Query Parameters:** `page=1`, `per_page=20`, `role=cr`, `search=`
- **Response `200 OK`:** Paginated system user directory.

---

#### `POST /admin/users`
- **Description:** Admin creates CR Officer, Customer, or Administrator user.
- **Request Body:**
```json
{
  "full_name": "Tariqul Islam",
  "mobile": "01755443322",
  "email": "tariqul@sunsetgroup.com",
  "password": "Password@123",
  "role": "cr"
}
```

---

#### `GET /admin/users/{id}` & `PATCH /admin/users/{id}`
- **Description:** Update user roles, full name, or activate/deactivate account (`"is_active": false`).

---

#### `GET /admin/audit-logs`
- **Query Parameters:** `page=1`, `per_page=50`, `action=`, `entity_type=`, `user_id=`
- **Response `200 OK`:** Paginated immutable audit trail.

---

### 5.9 Export Center (`/exports`)

*Requires `role: "admin"` or `role: "cr"`.*  
All export endpoints accept query filters: `business_id`, `date_from`, `date_to`, `application_status`, `payment_status`, `assigned_cr_id`, `search`.

| Method | Endpoint | Return Format | Allowed Roles | Description |
|---|---|---|---|---|
| `GET` | `/exports/applications/csv` | `text/csv` | CR, Admin | Applications list CSV (Masked for non-admins) |
| `GET` | `/exports/applications/xlsx` | `.xlsx` | CR, Admin | Formatted Excel with frozen headers, zebra stripes & auto-widths |
| `GET` | `/exports/customers/xlsx` | `.xlsx` | Admin | Complete customer directory Excel |
| `GET` | `/exports/payments/xlsx` | `.xlsx` | Admin | Payment ledger Excel with calculated sum totals |
| `GET` | `/exports/cr-performance/xlsx` | `.xlsx` | Admin | CR team performance & throughput Excel |

---

## 6. HTTP Error Codes

| Status Code | Code String | Description |
|---|---|---|
| `400` | `BAD_REQUEST` | Validation error or invalid request payload |
| `400` | `INVALID_STATUS_TRANSITION` | Attempted invalid workflow state transition |
| `401` | `UNAUTHORIZED` / `INVALID_TOKEN` | Missing, expired, or invalid JWT Bearer token |
| `401` | `INVALID_CREDENTIALS` | Incorrect mobile or password |
| `403` | `FORBIDDEN` | Role unauthorized to access resource (e.g. customer accessing admin) |
| `404` | `NOT_FOUND` | Application, User, Business, or Document not found |
| `409` | `CONFLICT` | Mobile number or email already registered |
| `422` | `VALIDATION_ERROR` | Pydantic schema validation failure (e.g. invalid phone format) |
| `429` | `RATE_LIMIT_EXCEEDED` | Exceeded rate limit (login/OTP endpoints) |
| `500` | `INTERNAL_ERROR` | Unhandled server exception |
