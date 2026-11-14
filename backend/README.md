# Sunset Group Customer Application Platform — Backend API

An enterprise-grade, multi-division customer onboarding and application processing platform built with **FastAPI**, **SQLAlchemy 2.0**, **PostgreSQL**, **Alembic**, and **Pydantic v2**.

---

## 🌟 Key Features

- **4 Business Divisions in Single Architecture:**
  1. Sunset Kuakata Hotel & Resort (`SKH`)
  2. Dhaka Fantasy Island (`DFI`)
  3. Sun Care Hospital & Diagnostic Centre (`SCH`)
  4. Super Combo (`SPC`)
- **Strict Role-Based Access Control (RBAC):** `admin`, `cr` (Customer Relations), and `customer`.
- **Complete Application State Machine:**
  `draft` ➔ `submitted` ➔ `under_review` ➔ `documents_required` / `correction_required` ➔ `approved` / `rejected` / `cancelled`.
- **Form Fields (Form 1:1 Mapping):**
  Full English & Bangla names, parents & spouse details, present & permanent addresses, TIN, NID/Passport, nationality, religion, occupation, company, 1 or 2 nominees with photos, bank details, ownership package, installment payment schedules.
- **Enterprise Reporting & Export Engine:**
  Export applications, customer directories, payment ledgers, and CR performance reports to **CSV** and **corporate-styled Excel (.xlsx)** with frozen headers, zebra striping, currency formatting, and automatic column widths.
- **S3-Compatible Private File Storage:**
  Secure presigned URLs for applicant photos, nominee photos, NID, TIN, and bank slips. Never exposes private bucket URLs publicly.
- **Live Aggregated Dashboard Analytics:**
  Live PostgreSQL counts for status breakdowns, business breakdowns, pending queues, and CR SLA tracking.
- **Security & Hardening:**
  Bcrypt hashing, JWT rotation with SHA-256 opaque refresh token revocation, SlowAPI rate limiting, security headers middleware, and complete IDOR protection.

---

## 📂 Project Structure

```
backend/
├── alembic/                         # Database migration environment
│   ├── versions/                    # Migration revision scripts
│   ├── env.py                       # SQLAlchemy 2.0 + Alembic runner
│   └── script.py.mako               # Template
├── alembic.ini                      # Alembic configuration
├── app/
│   ├── api/                         # API presentation layer
│   │   └── v1/
│   │       ├── endpoints/
│   │       │   ├── admin.py         # Dashboard stats, user management, audit logs
│   │       │   ├── applications.py  # Full application lifecycle, nominees, documents
│   │       │   ├── auth.py          # Registration, OTP, login, refresh, logout
│   │       │   ├── businesses.py    # Division management & pricing/terms query
│   │       │   ├── customers.py     # Customer directory & self-service profile
│   │       │   └── exports.py       # CSV and XLSX downloads
│   │       └── router.py            # Mounts all v1 sub-routers
│   ├── core/                        # Infrastructure, security, configuration
│   │   ├── config.py                # Pydantic Settings v2 (.env parser)
│   │   ├── dependencies.py          # get_db, get_current_user, RBAC guards
│   │   ├── exceptions.py            # Typed AppException hierarchy
│   │   ├── logging_config.py        # Structured logging
│   │   ├── middleware.py            # Security headers & Request-ID tracing
│   │   ├── permissions.py           # Atomic permissions & role matrix
│   │   ├── responses.py             # Standard JSON envelope formatters
│   │   └── security.py              # JWT, bcrypt, OTP generator, app numbers
│   ├── db/                          # Database connection & session
│   │   ├── base.py                  # DeclarativeBase with standard naming conventions
│   │   └── session.py               # Engine & SessionLocal factory
│   ├── models/                      # SQLAlchemy 2.0 ORM models
│   │   ├── application.py           # Application, Nominee, ApplicantInfo, Bank, Ownership
│   │   ├── audit.py                 # Immutable AuditLog model
│   │   ├── business.py              # Business division model
│   │   ├── customer.py              # CustomerProfile model
│   │   ├── document.py              # Document upload & verification model
│   │   ├── pricing.py               # PricingConfiguration model
│   │   ├── terms.py                 # TermsAndConditions model
│   │   └── user.py                  # User, RefreshToken, OTPVerification, LoginAttempt
│   ├── schemas/                     # Pydantic v2 validation models
│   │   ├── admin.py
│   │   ├── application.py
│   │   ├── auth.py
│   │   ├── business.py
│   │   ├── customer.py
│   │   ├── document.py
│   │   ├── export.py
│   │   ├── nominee.py
│   │   └── remark.py
│   └── services/                    # Business logic services
│       ├── application_service.py   # State transitions, application CRUD
│       ├── audit_service.py         # Audit logging helper
│       ├── auth_service.py          # Registration, login, OTP verification
│       ├── business_service.py      # Business divisions & pricing
│       ├── customer_service.py      # Customer profile management
│       ├── dashboard_service.py     # Live PostgreSQL aggregation metrics
│       ├── document_service.py      # Document upload, S3 handling, verification
│       ├── export_service.py        # Pandas + OpenPyXL CSV & Excel generator
│       ├── file_storage.py          # S3-compatible Boto3 wrapper
│       └── notification_service.py  # SMS and SMTP OTP dispatchers
├── docs/                            # Documentation
│   ├── API.md                       # Full REST API Reference
│   ├── DEPLOYMENT.md                # Production Linux/Nginx/Gunicorn setup
│   └── FRONTEND_INTEGRATION.md      # Next.js Integration guide
├── scripts/
│   └── seed_db.py                   # Seeds 4 business divisions & Admin user
├── tests/                           # Pytest test suite
│   ├── conftest.py                  # SQLite test fixtures & clients
│   ├── test_admin.py
│   ├── test_applications.py
│   ├── test_auth.py
│   ├── test_documents.py
│   └── test_exports.py
├── .env.example                     # Environment template with full docs
├── main.py                          # FastAPI application factory
├── pyproject.toml                   # Test & tool configurations
├── requirements.txt                 # Pinned dependencies
├── README.md                        # Project documentation
└── setup.ps1                        # Windows automated setup script
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Python 3.11+**
- **PostgreSQL 14+**
- **pip** and **virtualenv**

### 2. Automated Setup (Windows)
```powershell
.\setup.ps1
```

### 3. Manual Setup (Linux / macOS / Windows)
```bash
# 1. Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate

# 2. Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# 3. Create .env file
cp .env.example .env
# Edit .env and configure your DATABASE_URL (e.g. postgresql://postgres:password@localhost:5432/sunset_db)

# 4. Run database migrations
alembic upgrade head

# 5. Seed initial data (4 divisions and default admin)
python scripts/seed_db.py

# 6. Start the API server
uvicorn main:app --reload --port 8000
```

---

## 🔑 Default Seed Credentials

After running `python scripts/seed_db.py`:

- **Role:** Administrator (`admin`)
- **Mobile:** `01700000000`
- **Password:** `Admin@123`

---

## 📖 Interactive Documentation

Once the server is running, visit:
- **Swagger UI:** [http://localhost:8000/api/v1/docs](http://localhost:8000/api/v1/docs)
- **ReDoc:** [http://localhost:8000/api/v1/redoc](http://localhost:8000/api/v1/redoc)
- **Health Check:** [http://localhost:8000/health](http://localhost:8000/health)

---

## 🧪 Running Automated Tests

```bash
pytest -v
```

---

## 🛡️ Security Architecture

1. **Password Security:** Salted Bcrypt with standard cost factor.
2. **Token Security:** Short-lived access tokens (30 minutes), opaque SHA-256 hashed refresh tokens stored in DB with complete rotation on refresh and explicit revocation on logout.
3. **Sensitive Field Masking:** NID, TIN, and bank account numbers are masked (`******1234`) on exports and responses for non-admin roles.
4. **IDOR Protection:** Ownership checks verified on all customer-level resources (profile, applications, nominees, uploaded files).
5. **Private Storage:** Document files stored under partitioned S3 keys and accessed via short-lived presigned URLs.

