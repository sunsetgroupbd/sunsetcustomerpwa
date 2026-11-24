// Centralized API Client for Sunset Customer Application Platform
import {
  ApiResponse,
  AuthResponse,
  Application,
  ApplicationEditRequest,
  ApplicationTrackStatus,
  Business,
  CustomerProfileData,
  DashboardStats,
  InAppNotification,
  NotificationListResponse,
  PackagePricing,
  TermsAndConditions,
  User,
} from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export const getAvatarUrl = (url?: string | null): string | null => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }
  // If running in browser and no NEXT_PUBLIC_API_URL set, default to backend server origin
  let baseUrl = '';
  if (typeof window !== 'undefined') {
    const envUrl = process.env.NEXT_PUBLIC_API_URL;
    if (envUrl) {
      baseUrl = envUrl.replace(/\/api\/v1\/?$/, '');
    } else {
      // Typically backend runs on port 8000
      baseUrl = `${window.location.protocol}//${window.location.hostname}:8000`;
    }
  } else {
    baseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1').replace(/\/api\/v1\/?$/, '');
  }
  return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
};

class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export const getStoredTokens = () => {
  if (typeof window === 'undefined') return { accessToken: null, refreshToken: null };
  return {
    accessToken: localStorage.getItem('sunset_access_token'),
    refreshToken: localStorage.getItem('sunset_refresh_token'),
  };
};

export const setStoredTokens = (access: string, refresh: string) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('sunset_access_token', access);
  localStorage.setItem('sunset_refresh_token', refresh);
};

export const clearStoredTokens = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('sunset_access_token');
  localStorage.removeItem('sunset_refresh_token');
  localStorage.removeItem('sunset_user');
};

export const getStoredUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  const userJson = localStorage.getItem('sunset_user');
  if (!userJson) return null;
  try {
    return JSON.parse(userJson);
  } catch {
    return null;
  }
};

export const setStoredUser = (user: User) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('sunset_user', JSON.stringify(user));
};

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  retry = true
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = new Headers(options.headers || {});

  const { accessToken, refreshToken } = getStoredTokens();
  if (accessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  // Do not set Content-Type if FormData is being sent
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (res.status === 401 && retry && refreshToken && !endpoint.includes('/auth/refresh')) {
      // Try refresh
      try {
        const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          const newAccess = refreshData.data?.access_token || refreshData.tokens?.access_token;
          const newRefresh = refreshData.data?.refresh_token || refreshData.tokens?.refresh_token || refreshToken;
          setStoredTokens(newAccess, newRefresh);

          // Retry original request with new token
          headers.set('Authorization', `Bearer ${newAccess}`);
          return request<T>(endpoint, { ...options, headers }, false);
        } else {
          clearStoredTokens();
          if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
            window.location.href = '/login';
          }
        }
      } catch (err) {
        clearStoredTokens();
      }
    }

    // Handle non-JSON responses (e.g. downloads)
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('text/csv') || contentType.includes('application/vnd.openxmlformats') || contentType.includes('application/octet-stream')) {
      return (await res.blob()) as unknown as T;
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      let errorMsg = data?.message;
      if (!errorMsg && Array.isArray(data?.detail)) {
        errorMsg = data.detail.map((d: any) => d.msg || JSON.stringify(d)).join('; ');
      } else if (!errorMsg && typeof data?.detail === 'string') {
        errorMsg = data.detail;
      }
      if (!errorMsg) {
        errorMsg = `API request failed with status ${res.status}`;
      }
      throw new ApiError(errorMsg, res.status, data);
    }

    if (data && data.data !== undefined) {
      if (Array.isArray(data.data) && data.meta !== undefined) {
        return {
          items: data.data,
          total: data.meta?.total ?? data.data.length,
          page: data.meta?.page ?? 1,
          limit: data.meta?.page_size ?? 20,
          data: data.data,
        } as unknown as T;
      }
      return data.data as T;
    }
    return data as T;
  } catch (error: any) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(error.message || 'Network error occurred', 0);
  }
}

export const api = {
  // Authentication
  auth: {
    login: (phone_number: string, password?: string) =>
      request<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ phone_number, mobile: phone_number, password }),
      }),

    register: (data: { phone_number: string; full_name: string; password?: string; email?: string }) =>
      request<AuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ ...data, mobile: data.phone_number }),
      }),

    sendOtp: (phone_number: string) =>
      request<{ success: boolean; message: string }>('/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ phone_number, mobile: phone_number }),
      }),

    verifyOtp: (phone_number: string, otp_code: string) =>
      request<AuthResponse>('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ phone_number, mobile: phone_number, otp: otp_code, otp_code, purpose: 'login' }),
      }),

    me: () => request<User>('/auth/me'),

    uploadAvatar: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return request<{ avatar_url: string }>('/auth/avatar', {
        method: 'POST',
        body: formData,
      });
    },

    removeAvatar: () =>
      request<{ avatar_url: null }>('/auth/avatar', {
        method: 'DELETE',
      }),

    logout: () => {
      clearStoredTokens();
      return Promise.resolve();
    },
  },

  // Businesses & Configuration
  businesses: {
    list: async () => {
      const res = await request<any>('/businesses');
      return (Array.isArray(res) ? res : (res?.items || res?.data || [])) as Business[];
    },
    get: (id: string) => request<Business>(`/businesses/${id}`),
    getPackages: (businessId: string) => request<PackagePricing[]>(`/businesses/${businessId}/packages`),
    getTerms: (businessId: string) => request<TermsAndConditions>(`/businesses/${businessId}/terms`),
  },

  // Applications
  applications: {
    list: (params?: { business_id?: string; status?: string; search?: string; page?: number; limit?: number }) => {
      const q = new URLSearchParams();
      if (params?.business_id) q.set('business_id', params.business_id);
      if (params?.status) q.set('status', params.status);
      if (params?.search) q.set('search', params.search);
      if (params?.page) q.set('page', params.page.toString());
      if (params?.limit) {
        q.set('limit', params.limit.toString());
        q.set('per_page', params.limit.toString());
      }
      const query = q.toString() ? `?${q.toString()}` : '';
      return request<{ items: Application[]; total: number; page: number; limit: number }>(`/applications${query}`);
    },

    get: (id: string) => request<Application>(`/applications/${id}`),

    track: (referenceNumber: string) =>
      request<ApplicationTrackStatus>(`/applications/track/${encodeURIComponent(referenceNumber.trim())}`),

    createDraft: (data: { business_id: string; applicant_info?: any; current_step?: number }) =>
      request<Application>('/applications', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    updateDraft: (id: string, data: Partial<Application>) =>
      request<Application>(`/applications/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    submit: (id: string, declarationAccepted: boolean) =>
      request<Application>(`/applications/${id}/submit`, {
        method: 'POST',
        body: JSON.stringify({ declaration_accepted: declarationAccepted }),
      }),

    uploadDocument: (id: string, documentType: string, file: File) => {
      const formData = new FormData();
      formData.append('document_type', documentType);
      formData.append('file', file);
      return request<{
        id: string;
        file_path?: string;
        download_url?: string;
        document_type: string;
        original_filename?: string;
        mime_type?: string;
        file_size?: number;
      }>(`/applications/${id}/documents`, {
        method: 'POST',
        body: formData,
      });
    },

    getDocuments: (id: string) =>
      request<
        Array<{
          id: string | number;
          application_id?: number;
          document_type: string;
          original_filename: string;
          mime_type: string;
          file_size?: number;
          download_url?: string;
          verification_status?: string;
        }>
      >(`/applications/${id}/documents`),

    verifyDocument: (id: string, documentId: string, status: 'verified' | 'rejected', notes?: string) =>
      request<{ success: boolean; message: string }>(`/applications/${id}/documents/${documentId}/verify`, {
        method: 'POST',
        body: JSON.stringify({ status, notes }),
      }),

    updateStatus: (id: string, status: string, notes?: string, correctionDetails?: string) =>
      request<Application>(`/applications/${id}/status`, {
        method: 'POST',
        body: JSON.stringify({
          new_status: status,
          status,
          reason: notes || correctionDetails || undefined,
          notes: notes || undefined,
          correction_details: correctionDetails || undefined,
        }),
      }),

    addRemark: (id: string, text: string, isInternal: boolean = false) =>
      request<any>(`/applications/${id}/remarks`, {
        method: 'POST',
        body: JSON.stringify({ remark_text: text, is_internal: isInternal }),
      }),

    assignCr: (id: string, crUserId: string) =>
      request<Application>(`/applications/${id}/assign`, {
        method: 'POST',
        body: JSON.stringify({ cr_user_id: crUserId }),
      }),

    requestEdit: (id: string, reason: string, requestedChanges?: string) =>
      request<{ id: number; application_id: number; status: string }>(`/applications/${id}/edit-requests`, {
        method: 'POST',
        body: JSON.stringify({ reason, requested_changes: requestedChanges }),
      }),

    getEditRequests: (id: string) =>
      request<ApplicationEditRequest[]>(`/applications/${id}/edit-requests`),
  },

  // CR Team
  cr: {
    listAssigned: (params?: { status?: string; search?: string }) => {
      const q = new URLSearchParams();
      if (params?.status) q.set('status', params.status);
      if (params?.search) q.set('search', params.search);
      const query = q.toString() ? `?${q.toString()}` : '';
      return request<{ items: Application[]; total: number }>(`/applications/assigned${query}`);
    },

    createOnBehalf: (data: {
      customer_phone: string;
      customer_name: string;
      business_id: string | number;
      customer_email?: string;
      package_type?: string;
      number_of_shares?: number;
      total_amount?: number;
      lead_source?: string;
      temporary_password?: string;
    }) =>
      request<Application>('/applications/on-behalf', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // Sales Executive Team
  sales: {
    createOnBehalf: (data: {
      customer_phone: string;
      customer_name: string;
      business_id: string | number;
      customer_email?: string;
      package_type?: string;
      number_of_shares?: number;
      total_amount?: number;
      lead_source?: string;
      temporary_password?: string;
    }) =>
      request<Application>('/applications/on-behalf', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // Admin & Analytics
  admin: {
    stats: () => request<DashboardStats>('/admin/stats'),
    users: (params?: { role?: string; search?: string; page?: number; limit?: number }) => {
      const q = new URLSearchParams();
      if (params?.role) q.set('role', params.role);
      if (params?.search) q.set('search', params.search);
      if (params?.page) q.set('page', params.page.toString());
      const limitVal = (params?.limit || 500).toString();
      q.set('per_page', limitVal);
      q.set('limit', limitVal);
      const query = q.toString() ? `?${q.toString()}` : '';
      return request<{ items: User[]; total: number }>(`/admin/users${query}`);
    },
    crTeam: () => request<User[]>('/admin/cr-team'),
    updateUserStatus: (userId: string, isActive: boolean) =>
      request<User>(`/admin/users/${userId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: isActive }),
      }),
    createUser: (data: {
      full_name: string;
      mobile: string;
      password: string;
      email?: string;
      role?: string;
      employee_id?: string;
      designation?: string;
      username?: string;
    }) =>
      request<User>('/admin/users', {
        method: 'POST',
        body: JSON.stringify({ ...data, role: data.role || 'customer' }),
      }),
    deleteUser: (userId: string | number) =>
      request<{ success: boolean; message: string }>(`/admin/users/${userId}`, {
        method: 'DELETE',
      }),
    importSalesCsv: async (file?: File, csvText?: string) => {
      const formData = new FormData();
      if (file) formData.append('file', file);
      if (csvText) formData.append('csv_text', csvText);
      return request<{
        success: boolean;
        total_rows: number;
        created: number;
        updated: number;
        errors: string[];
        processed: any[];
      }>('/admin/users/import-sales-csv', {
        method: 'POST',
        body: formData,
      });
    },
    listEditRequests: (status?: string) => {
      const query = status ? `?status=${status}` : '';
      return request<ApplicationEditRequest[]>(`/admin/edit-requests${query}`);
    },
    reviewEditRequest: (requestId: number | string, action: 'approve' | 'reject', adminNotes?: string) =>
      request<{ status: string; application_id: number }>(`/admin/edit-requests/${requestId}/review`, {
        method: 'POST',
        body: JSON.stringify({ action, admin_notes: adminNotes }),
      }),
  },

  // Customer Profile
  profile: {
    get: () => request<CustomerProfileData>('/customers/me'),
    update: (data: {
      full_name?: string;
      email?: string;
      date_of_birth?: string | null;
      gender?: string | null;
      address?: string | null;
      district?: string | null;
      division?: string | null;
      post_code?: string | null;
      emergency_contact?: string | null;
      preferred_language?: string;
    }) =>
      request<CustomerProfileData>('/customers/me', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    changePassword: (data: { current_password: string; new_password: string; confirm_password?: string }) =>
      request<{ success: boolean; message: string }>('/customers/change-password', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // Exports
  exports: {
    downloadApplicationsCsv: async (filters?: { business_id?: string; status?: string; start_date?: string; end_date?: string }) => {
      const q = new URLSearchParams();
      if (filters?.business_id) q.set('business_id', filters.business_id);
      if (filters?.status) q.set('status', filters.status);
      if (filters?.start_date) q.set('start_date', filters.start_date);
      if (filters?.end_date) q.set('end_date', filters.end_date);
      const query = q.toString() ? `?${q.toString()}` : '';
      return request<Blob>(`/exports/applications/csv${query}`);
    },
    downloadApplicationsExcel: async (filters?: { business_id?: string; status?: string; start_date?: string; end_date?: string }) => {
      const q = new URLSearchParams();
      if (filters?.business_id) q.set('business_id', filters.business_id);
      if (filters?.status) q.set('status', filters.status);
      if (filters?.start_date) q.set('start_date', filters.start_date);
      if (filters?.end_date) q.set('end_date', filters.end_date);
      const query = q.toString() ? `?${q.toString()}` : '';
      return request<Blob>(`/exports/applications/xlsx${query}`);
    },
    downloadCustomersExcel: async (search?: string) => {
      const q = new URLSearchParams();
      if (search) q.set('search', search);
      const query = q.toString() ? `?${q.toString()}` : '';
      return request<Blob>(`/exports/customers/xlsx${query}`);
    },
    downloadPaymentsExcel: async (filters?: { business_id?: string; payment_status?: string; start_date?: string; end_date?: string }) => {
      const q = new URLSearchParams();
      if (filters?.business_id) q.set('business_id', filters.business_id);
      if (filters?.payment_status) q.set('payment_status', filters.payment_status);
      if (filters?.start_date) q.set('start_date', filters.start_date);
      if (filters?.end_date) q.set('end_date', filters.end_date);
      const query = q.toString() ? `?${q.toString()}` : '';
      return request<Blob>(`/exports/payments/xlsx${query}`);
    },
    downloadCrPerformanceExcel: async () => {
      return request<Blob>('/exports/cr-performance/xlsx');
    },
  },

  // In-App Notifications
  notifications: {
    list: (unreadOnly = false, limit = 50, offset = 0) => {
      const q = new URLSearchParams();
      if (unreadOnly) q.set('unread_only', 'true');
      q.set('limit', limit.toString());
      q.set('offset', offset.toString());
      return request<NotificationListResponse>(`/notifications?${q.toString()}`);
    },
    markRead: (id: number) =>
      request<InAppNotification>(`/notifications/${id}/read`, {
        method: 'PATCH',
      }),
    markAllRead: () =>
      request<{ updated_count: number }>(`/notifications/read-all`, {
        method: 'POST',
      }),
  },
};

