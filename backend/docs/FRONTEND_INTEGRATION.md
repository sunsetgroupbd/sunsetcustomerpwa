# Frontend Integration Guide — Sunset Customer Platform

This guide helps frontend engineers connect the **Next.js** application to the **FastAPI** backend.

---

## 1. Base Configuration

In your Next.js `.env.local`:
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

For server-side requests (e.g. Next.js App Router Server Components/Server Actions):
```bash
INTERNAL_API_URL=http://localhost:8000/api/v1
```

---

## 2. Authentication Flow & Token Management

The API uses **JWT Bearer Authentication** with access token expiration (30 mins) and refresh tokens (7 days).

### Registration & Login Flow
1. **User Registers:** `POST /api/v1/auth/register` with `{ full_name, mobile, password, email }`.
2. **User Submits OTP:** `POST /api/v1/auth/verify-otp` with `{ mobile, otp, purpose: "registration" }`.
3. **User Logs In:** `POST /api/v1/auth/login` with `{ mobile, password }`.
4. Response returns:
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer",
  "expires_in": 1800
}
```

### Storage Recommendation
- **Access Token:** In-memory or React state / HttpOnly cookie.
- **Refresh Token:** Secure HttpOnly cookie or secure storage.

### Axios / Fetch Interceptor Example
```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Automatic token refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });
          const { access_token, refresh_token: newRefresh } = res.data.data;
          localStorage.setItem('access_token', access_token);
          localStorage.setItem('refresh_token', newRefresh);
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        } catch (err) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);
```

---

## 3. Handling File Uploads

File uploads use standard `multipart/form-data`:

```typescript
export async function uploadDocument(
  applicationId: number,
  documentType: string,
  file: File
) {
  const formData = new FormData();
  formData.append('document_type', documentType);
  formData.append('file', file);

  const response = await api.post(
    `/applications/${applicationId}/documents`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return response.data;
}
```

### Supported Document Types
- `applicant_photo`
- `nominee_photo`
- `nid_front`
- `nid_back`
- `passport`
- `tin`
- `other`

---

## 4. Exporting CSV / Excel Files

When downloading reports, trigger browser download using `responseType: 'blob'`:

```typescript
export async function downloadApplicationExport(format: 'csv' | 'xlsx', filters = {}) {
  const response = await api.get(`/exports/applications/${format}`, {
    params: filters,
    responseType: 'blob',
  });

  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `applications_${Date.now()}.${format}`);
  document.body.appendChild(link);
  link.click();
  link.remove();
}
```

---

## 5. TypeScript Interfaces

```typescript
export type UserRole = 'admin' | 'cr' | 'customer';

export type ApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'documents_required'
  | 'correction_required'
  | 'approved'
  | 'rejected'
  | 'cancelled';

export interface Business {
  id: number;
  name: string;
  code: 'SKH' | 'DFI' | 'SCH' | 'SPC';
  description?: string;
  is_active: boolean;
  pricing?: PricingTier[];
  terms?: TermsAndConditions;
}

export interface Application {
  id: number;
  application_number: string;
  customer_id: number;
  business_id: number;
  application_status: ApplicationStatus;
  payment_status: 'pending' | 'partial' | 'paid' | 'overdue' | 'refunded';
  assigned_cr_id?: number;
  declaration_accepted: boolean;
  submitted_at?: string;
  created_at: string;
  applicant_info?: ApplicantInfo;
  nominees?: Nominee[];
  bank_detail?: BankDetail;
  ownership_detail?: OwnershipDetail;
  payment_detail?: PaymentDetail;
}
```

