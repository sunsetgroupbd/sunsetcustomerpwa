# Sunset Customer Application Platform — Frontend

Production-quality Progressive Web Application (PWA) built with Next.js 16, React 19, TypeScript, and Tailwind CSS for **Sunset Group**.

## Platform Overview

The platform provides a centralized, role-based registration and ownership application workflow for all four Sunset Group business divisions:
1. **Sunset Kuakata Hotel & Resort (SKH)**
2. **Dhaka Fantasy Island (DFI)**
3. **Sun Care Hospital & Diagnostic Centre (SCH)**
4. **Super Combo (SPC)**

---

## Roles & Portals

### 1. Customer Experience (`/customer/dashboard`)
- Phone + Password / Mobile OTP Registration and Login.
- Division selection and multi-step ownership application.
- Auto-saving drafts to local storage and backend sync.
- Real-time application tracking with reference numbers (`SKH-2026-00001`).
- Action-required banners for correction requests with document re-uploading.

### 2. Customer Relations (CR) Experience (`/cr/dashboard`)
- Work queue of assigned customer applications with status and division filters.
- Walk-in / on-behalf application registration for offline clients.
- Interactive document verification:
  - **Verify**: Marks documents verified with audit timestamp.
  - **Reject**: Rejects with explicit reasons (e.g., photo blurred, missing border) and automatically prompts customer for revision.
- Multi-party remarks thread (internal notes vs. customer-facing communication).
- Workflow status transitions (`under_review`, `action_required`, `approved`, `rejected`, `returned`).

### 3. Executive Admin Experience (`/admin/dashboard`)
- Real-time KPI statistics: Total Applications, Total Customers, Approved, Pending, Rejected, Returned.
- Division distribution analytics.
- CR Employee assignment modal for unassigned applications.
- **User Management** (`/admin/users`): Role filters, search, activate/suspend switches.
- **Export Center** (`/admin/exports`): Audit-ready CSV and Excel (.xlsx) downloads with division, status, and date range filters.

---

## 9-Step Application Wizard

Based directly on the scanned Sunset Group ownership registration form:
1. **Step 1: Applicant Information**: Full name (English block & Bengali), father's, mother's, spouse's, mailing & permanent addresses, mobile phone, DOB, nationality, religion, NID/Passport, TIN.
2. **Step 2: Profession / Occupation**: Company name, designation, office address, workplace cell number.
3. **Step 3: Nominee Information**: Primary nominee (photo, NID, relation, phone, DOB) + optional second nominee with add/remove controls.
4. **Step 4: Bank Details**: Account holder name, account number, bank name, branch name.
5. **Step 5: Ownership & Pricing**: Package tiers (Bronze, Silver, Gold, Platinum), share count, discount, dynamic total calculation, automated Bangladeshi Taka amount-in-words.
6. **Step 6: Payment Schedule**: Token money, booking money + date, installment schedule (Monthly, Quarterly, Half-Yearly, Yearly), automated dues calculation.
7. **Step 7: Documents & Attachments**: Upload applicant photo, nominee photo, NID front/back, TIN certificate with progress indicator and validation.
8. **Step 8: Declaration & Review**: Division-specific Terms & Conditions viewer, formal customer legal declaration checkbox, full structured summary review.
9. **Step 9: Confirmation**: Generated reference number, submission timestamp, printable receipt record.

---

## Running the Application

### 1. Prerequisites
- Node.js 18+ (tested with Node 20 / 22)
- Running FastAPI backend on `http://localhost:8000`

### 2. Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Production Build
```bash
npm run build
npm start
```

### 4. Configuration
Create a `.env.local` if custom backend URL is desired:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```
