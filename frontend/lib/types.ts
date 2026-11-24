// TypeScript interfaces for Sunset Customer Application Platform

export type UserRole = 'customer' | 'cr' | 'sales' | 'admin';

export type ApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'action_required'
  | 'correction_required'
  | 'documents_required'
  | 'approved'
  | 'rejected'
  | 'returned'
  | 'cancelled';

export type DocumentType =
  | 'applicant_photo'
  | 'applicant_photo_copies'
  | 'nid_front'
  | 'nid_back'
  | 'passport'
  | 'tin_certificate'
  | 'nominee_photo'
  | 'nominee_nid'
  | 'payment_proof'
  | 'other';

export type DocumentVerificationStatus = 'pending' | 'verified' | 'rejected';

export interface User {
  id: string;
  phone_number: string;
  email: string | null;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  is_verified: boolean;
  business_id: string | null;
  employee_id?: string | null;
  customer_id_number?: string | null;
  designation?: string | null;
  username?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerProfileData {
  id: number | string;
  full_name: string;
  mobile: string;
  email: string | null;
  customer_id_number?: string | null;
  role: UserRole;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  profile?: {
    preferred_language?: string;
    address?: string | null;
    district?: string | null;
    division?: string | null;
    post_code?: string | null;
    date_of_birth?: string | null;
    gender?: string | null;
    emergency_contact?: string | null;
  } | null;
}

export interface Business {
  id: string;
  code: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  is_active: boolean;
}

export interface ApplicantInfo {
  id?: string;
  ownership_id?: string | null;
  customer_id_number?: string | null;
  application_date?: string | null;
  full_name_en: string;
  full_name_bn?: string | null;
  father_name: string;
  mother_name: string;
  spouse_name?: string | null;
  present_address: string;
  permanent_address: string;
  mobile_number: string;
  phone_number?: string | null;
  date_of_birth: string;
  nationality: string;
  religion?: string | null;
  nid_or_passport: string;
  tin_number?: string | null;
  personal_email?: string | null;
  company_name?: string | null;
  office_address?: string | null;
  designation?: string | null;
  office_phone?: string | null;
}

export interface Nominee {
  id?: string;
  nominee_order?: number;
  full_name: string;
  name?: string;
  relation: string;
  relationship?: string;
  father_or_husband_name: string;
  nid_or_passport: string;
  cell_number: string;
  date_of_birth?: string | null;
  photograph_url?: string | null;
}

export interface BankDetail {
  id?: string;
  account_name: string;
  account_number: string;
  bank_name: string;
  branch_name?: string;
  branch?: string;
  routing_number?: string | null;
}

export interface OwnershipDetail {
  id?: string;
  package_type: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | string;
  package?: string;
  number_of_ownership: number;
  number_of_shares?: number;
  price_per_ownership?: number;
  discount_amount?: number;
  total_price: number;
  amount_in_words?: string | null;
}

export interface PaymentDetail {
  id?: string;
  token_money?: number;
  booking_money: number;
  booking_date?: string | null;
  installment_type?: 'monthly' | 'quarterly' | 'half_yearly' | 'yearly' | string;
  number_of_installments: number;
  installment_amount: number;
  installment_start_date?: string | null;
  dues_amount?: number;
  payment_type?: string;
  payment_mode?: string;
  cheque_number?: string | null;
  bank_name?: string | null;
}

export interface ApplicationDocument {
  id: string;
  application_id: string;
  document_type: DocumentType;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  verification_status: DocumentVerificationStatus;
  rejection_reason?: string | null;
  created_at: string;
}

export interface ApplicationRemark {
  id: string;
  application_id: string;
  author_id: string;
  author_name?: string;
  remark_text: string;
  is_internal: boolean;
  created_at: string;
}

export interface Application {
  id: string;
  reference_number: string;
  customer_id: string;
  customer_id_number?: string | null;
  customer?: any;
  business_id: string;
  business?: Business;
  assigned_cr_id?: string | null;
  assigned_cr_name?: string | null;
  assigned_cr_employee_id?: string | null;
  status: ApplicationStatus;
  submission_date?: string | null;
  submitted_at?: string | null;
  application_date?: string | null;
  current_step: number;
  is_submitted: boolean;
  is_edit_unlocked?: boolean;
  declaration_accepted?: boolean;
  application_number?: string;
  sales_agent_id?: string | null;
  sales_agent_name?: string | null;
  sales_agent_employee_id?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  business_code?: string | null;
  business_name?: string | null;
  rejection_reason?: string | null;
  correction_requested?: string | null;
  applicant_info?: ApplicantInfo | null;
  nominees: Nominee[];
  bank_detail?: BankDetail | null;
  ownership_detail?: OwnershipDetail | null;
  payment_detail?: PaymentDetail | null;
  documents: ApplicationDocument[];
  remarks: ApplicationRemark[];
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  total_applications: number;
  total_customers: number;
  total_registered_users?: number;
  pending_applications: number;
  approved_applications: number;
  rejected_applications: number;
  returned_applications: number;
  business_distribution: {
    business_id: string;
    business_name: string;
    business_code: string;
    count: number;
  }[];
  recent_applications: {
    id: string;
    reference_number: string;
    applicant_name: string;
    business_name: string;
    status: ApplicationStatus;
    submission_date: string | null;
    created_at: string;
  }[];
}

export interface ApplicationTrackStatus {
  id: number;
  application_number: string;
  business_id: number;
  business_name: string;
  business_code: string;
  status: ApplicationStatus;
  submission_date: string | null;
  applicant_name: string | null;
  customer_phone_masked: string | null;
  created_at: string;
  updated_at: string;
  status_history: {
    id: number;
    previous_status: string | null;
    new_status: string;
    changed_by_id: number;
    reason: string | null;
    created_at: string;
  }[];
}

export interface PackagePricing {
  id: string;
  business_id: string;
  package_type: string;
  base_price: number;
  description?: string | null;
  is_active: boolean;
}

export interface TermsAndConditions {
  id: string;
  business_id: string;
  version: string;
  content: string;
  is_active: boolean;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface AuthResponse {
  tokens: AuthTokens;
  user: User;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    pages?: number;
  };
}

export interface ApplicationEditRequest {
  id: number;
  application_id: number;
  application_number?: string;
  applicant_name?: string;
  applicant_phone?: string;
  application_status?: string;
  requested_by_id?: number;
  requester_name?: string;
  requester_role: 'cr' | 'customer' | string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by_name?: string;
  admin_notes?: string;
  created_at: string;
  reviewed_at?: string;
}

export interface InAppNotification {
  id: number;
  user_id?: number | null;
  role?: string | null;
  title: string;
  message: string;
  type: string;
  link_url?: string | null;
  application_id?: number | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationListResponse {
  items: InAppNotification[];
  total: number;
  unread_count: number;
}


