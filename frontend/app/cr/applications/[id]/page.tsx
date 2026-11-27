'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Application, ApplicationEditRequest, ApplicationStatus } from '@/lib/types';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';
import { Icons } from '@/components/ui/Icons';
import { openSmsWithCredentials } from '@/lib/sms';
import { ApplicationReceiptModal } from '@/components/application-form/ApplicationReceiptModal';

interface PreviewDocState {
  id: string | number;
  title: string;
  url: string;
  mimeType: string;
  verificationStatus: string;
  fileName: string;
}

export default function CrApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [application, setApplication] = useState<Application | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);

  // Deduplicate documents by slot so re-uploaded items show only the latest version
  const displayDocuments = React.useMemo(() => {
    if (!documents || !Array.isArray(documents)) return [];
    const map = new Map<string, any>();
    // Sort ascending by ID so latest uploaded entry overwrites older ones
    const sorted = [...documents].sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));
    for (const doc of sorted) {
      const rawType = (doc.document_type || doc.type || 'other').toLowerCase();
      let slot = rawType;
      if (slot === 'photograph' || slot === 'photo' || slot === 'profile_photo') {
        slot = 'applicant_photo';
      }
      map.set(slot, doc);
    }
    return Array.from(map.values());
  }, [documents]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Status transition modal
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<ApplicationStatus>('under_review');
  const [statusNotes, setStatusNotes] = useState('');
  const [correctionDetails, setCorrectionDetails] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Receipt modal
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // Document preview lightbox modal
  const [previewDoc, setPreviewDoc] = useState<PreviewDocState | null>(null);

  // Document rejection modal
  const [rejectingDocId, setRejectingDocId] = useState<string | null>(null);
  const [docRejectionReason, setDocRejectionReason] = useState('');
  const [isRejectingDoc, setIsRejectingDoc] = useState(false);

  // Add Remark
  const [remarkText, setRemarkText] = useState('');
  const [isInternalRemark, setIsInternalRemark] = useState(false);
  const [isPostingRemark, setIsPostingRemark] = useState(false);

  // Edit Request Modal
  const [editRequests, setEditRequests] = useState<ApplicationEditRequest[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editReason, setEditReason] = useState('');
  const [isSubmittingEditReq, setIsSubmittingEditReq] = useState(false);

  const getDocumentUrl = (doc: any) => {
    const rawUrl = doc?.download_url || doc?.file_path || doc?.url || '';
    if (!rawUrl) return '';
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
      return rawUrl;
    }
    const backendBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1').replace('/api/v1', '');
    return `${backendBase}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
  };

  const isImageFile = (doc: any) => {
    const mime = (doc?.mime_type || '').toLowerCase();
    const name = (doc?.original_filename || doc?.file_name || '').toLowerCase();
    return mime.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(name);
  };

  const isPdfFile = (doc: any) => {
    const mime = (doc?.mime_type || '').toLowerCase();
    const name = (doc?.original_filename || doc?.file_name || '').toLowerCase();
    return mime.includes('pdf') || /\.pdf$/i.test(name);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const loadData = async () => {
    try {
      const [app, reqs, docsRes] = await Promise.all([
        api.applications.get(resolvedParams.id),
        api.applications.getEditRequests(resolvedParams.id).catch(() => []),
        api.applications.getDocuments(resolvedParams.id).catch(() => []),
      ]);
      setApplication(app);
      setNewStatus(app.status);
      setEditRequests(Array.isArray(reqs) ? reqs : (reqs as any)?.data || []);

      const docList = Array.isArray(docsRes) ? docsRes : (docsRes as any)?.data || app.documents || [];
      setDocuments(docList);
    } catch (err: any) {
      setError(err.message || 'Failed to load application.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && (!user || (user.role !== 'cr' && user.role !== 'admin' && user.role !== 'subadmin'))) {
      router.push('/login');
      return;
    }
    if (user) {
      loadData();
    }
  }, [user, authLoading, resolvedParams.id, router]);

  const handleVerifyDocument = async (docId: string | number) => {
    if (!application) return;
    try {
      await api.applications.verifyDocument(String(application.id), String(docId), 'verified');
      setStatusMsg({ type: 'success', text: 'Document verified successfully.' });
      if (previewDoc && String(previewDoc.id) === String(docId)) {
        setPreviewDoc({ ...previewDoc, verificationStatus: 'verified' });
      }
      loadData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to verify document.' });
    }
  };

  const handleRejectDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!application || !rejectingDocId || !docRejectionReason.trim()) return;

    setIsRejectingDoc(true);
    try {
      await api.applications.verifyDocument(String(application.id), String(rejectingDocId), 'rejected', docRejectionReason.trim());
      if (previewDoc && String(previewDoc.id) === String(rejectingDocId)) {
        setPreviewDoc({ ...previewDoc, verificationStatus: 'rejected' });
      }
      setRejectingDocId(null);
      setDocRejectionReason('');
      setStatusMsg({ type: 'success', text: 'Document rejected with reason recorded.' });
      loadData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to reject document.' });
    } finally {
      setIsRejectingDoc(false);
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!application) return;

    setIsUpdatingStatus(true);
    try {
      await api.applications.updateStatus(
        String(application.id),
        newStatus,
        statusNotes.trim() || undefined,
        newStatus === 'correction_required' || (newStatus as any) === 'action_required'
          ? correctionDetails.trim()
          : undefined
      );
      setIsStatusModalOpen(false);
      setStatusMsg({ type: 'success', text: `Application status updated to ${newStatus.toUpperCase()}.` });
      loadData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to update status.' });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleAddRemark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!application || !remarkText.trim()) return;

    setIsPostingRemark(true);
    try {
      await api.applications.addRemark(String(application.id), remarkText.trim(), isInternalRemark);
      setRemarkText('');
      setStatusMsg({ type: 'success', text: 'Remark logged successfully.' });
      loadData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to post remark.' });
    } finally {
      setIsPostingRemark(false);
    }
  };

  const handleRequestEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!application || !editReason.trim()) return;

    setIsSubmittingEditReq(true);
    try {
      await api.applications.requestEdit(String(application.id), editReason.trim());
      setIsEditModalOpen(false);
      setEditReason('');
      setStatusMsg({
        type: 'success',
        text: 'Edit permission request submitted to Administrator. Form will unlock once approved.',
      });
      loadData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to submit edit request.' });
    } finally {
      setIsSubmittingEditReq(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardShell title="Application Inspection" subtitle="Loading application details...">
        <div className="py-16 text-center text-xs text-slate-500">
          <Icons.Spinner className="w-8 h-8 text-[#006B3E] mx-auto mb-3 animate-spin" />
          Loading full application particulars and documents...
        </div>
      </DashboardShell>
    );
  }

  if (error || !application) {
    return (
      <DashboardShell title="Application Review" subtitle="Error">
        <Alert type="error" title="Not Found">
          {error || 'Unable to locate application.'}
        </Alert>
        <div className="mt-4">
          <Link href={user?.role === 'admin' ? '/admin/dashboard' : '/cr/dashboard'}>
            <Button variant="outline" size="sm" leftIcon={<Icons.ArrowLeft className="w-4 h-4" />}>
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </DashboardShell>
    );
  }

  const isEditable =
    application.status === 'draft' ||
    application.is_edit_unlocked ||
    application.status === 'action_required' ||
    (application.status as any) === 'correction_required';
  const pendingEditReq = editRequests.find((r) => r.status === 'pending');

  const backLink = user?.role === 'admin' ? '/admin/dashboard?tab=applications' : '/cr/dashboard';

  return (
    <DashboardShell
      title={`Inspect Application: ${application.reference_number || application.application_number || `APP-${application.id}`}`}
      subtitle={`${application.business?.name || 'Sunset Division'} • Submitted: ${
        application.submission_date || application.application_date
          ? new Date(application.submission_date || application.application_date || '').toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })
          : 'Draft'
      }`}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {/* Official Printable Receipt */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsReceiptOpen(true)}
            className="flex items-center gap-1.5 text-slate-700 bg-white hover:bg-slate-50"
            title="Inspect corporate receipt and print PDF"
          >
            <Icons.FileText className="w-4 h-4 text-emerald-600" />
            <span>Official Receipt / PDF</span>
          </Button>

          {isEditable ? (
            <Link href={`/customer/apply?application_id=${application.id}`}>
              <Button variant="primary" size="sm" className="bg-[#008751] hover:bg-[#007043] flex items-center gap-1.5">
                <Icons.CheckCircle className="w-4 h-4" />
                <span>Activate</span>
              </Button>
            </Link>
          ) : pendingEditReq ? (
            <span className="text-xs bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5">
              <Icons.Clock className="w-4 h-4 text-amber-600" />
              <span>Edit Pending Admin Approval</span>
            </span>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditReason('');
                setIsEditModalOpen(true);
              }}
              className="flex items-center gap-1.5 text-slate-700"
            >
              <Icons.Lock className="w-4 h-4" />
              <span>Request Edit Permission</span>
            </Button>
          )}

          {application.applicant_info?.mobile_number && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                openSmsWithCredentials({
                  phone: application.applicant_info?.mobile_number || '',
                  customerName: application.applicant_info?.full_name_en,
                  tempPassword: 'Sunset@123',
                  referenceNumber: application.reference_number || application.application_number || '',
                  businessCode: application.business?.code,
                })
              }
              className="flex items-center gap-1.5 text-[#008751] bg-emerald-50 hover:bg-emerald-100 border-emerald-200 font-semibold"
              title="Send login credentials to customer via mobile SMS"
            >
              <Icons.MessageSquare className="w-4 h-4 text-[#008751]" />
              <span>SMS Credentials</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsStatusModalOpen(true)}
            leftIcon={<Icons.Shield className="w-4 h-4" />}
            className="font-bold text-slate-800"
          >
            Workflow Status
          </Button>

          <Link href={backLink}>
            <Button variant="ghost" size="sm" leftIcon={<Icons.ArrowLeft className="w-4 h-4" />}>
              Back
            </Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {statusMsg && (
          <Alert type={statusMsg.type} className="animate-in fade-in">
            {statusMsg.text}
          </Alert>
        )}

        {application.is_edit_unlocked && (
          <Alert type="success" title="Application Unlocked for Editing">
            Admin has granted permission to update this application. You can click <strong>&quot;Fill / Edit Form&quot;</strong> to modify customer information. Once submitted, it will be locked again.
          </Alert>
        )}

        {pendingEditReq && (
          <Alert type="warning" title="Edit Permission Pending Review">
            An edit permission request is currently pending Administrator review: &quot;{pendingEditReq.reason}&quot;.
          </Alert>
        )}

        {/* Status & Review Header */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">
              Current Application Status
            </span>
            <div className="flex flex-wrap items-center gap-3 mt-1.5">
              <Badge status={application.status} className="text-sm px-3 py-1 font-bold" />
              {application.assigned_cr_name && (
                <span className="text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
                  CR Officer: <strong>{application.assigned_cr_name}</strong>
                </span>
              )}
              {application.customer?.customer_id_number && (
                <span className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md font-bold">
                  Customer ID: {application.customer.customer_id_number}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {user?.role === 'admin' && application.status !== 'approved' && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setNewStatus('approved');
                  setIsStatusModalOpen(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm"
              >
                1-Click Master Approval (Admin)
              </Button>
            )}

            {user?.role === 'subadmin' && application.status !== 'approved' && (
              <Button
                variant="primary"
                size="sm"
                disabled={application.approval_progress?.approvals?.some((a: any) => String(a.approved_by_id) === String(user.id))}
                onClick={() => {
                  setNewStatus('approved');
                  setIsStatusModalOpen(true);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm disabled:opacity-50"
              >
                {application.approval_progress?.approvals?.some((a: any) => String(a.approved_by_id) === String(user.id))
                  ? 'Already Approved by You'
                  : 'Approve Application (Subadmin)'}
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setNewStatus('correction_required');
                setIsStatusModalOpen(true);
              }}
              className="text-purple-700 hover:bg-purple-50 border-purple-300 font-semibold"
            >
              Request Correction
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setNewStatus('documents_required');
                setIsStatusModalOpen(true);
              }}
              className="text-amber-700 hover:bg-amber-50 border-amber-300 font-semibold"
            >
              Require Documents
            </Button>
          </div>
        </div>

        {/* Main 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* 1. Applicant Full Particulars */}
            <Card
              title="Applicant Personal Particulars"
              subtitle="Comprehensive profile details verified against identity documents."
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block">Full Name (English)</span>
                  <span className="font-bold text-slate-900 text-sm">{application.applicant_info?.full_name_en || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Full Name (Bangla)</span>
                  <span className="font-semibold text-slate-900">{application.applicant_info?.full_name_bn || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Father&apos;s Name</span>
                  <span className="font-semibold text-slate-900">{application.applicant_info?.father_name || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Mother&apos;s Name</span>
                  <span className="font-semibold text-slate-900">{application.applicant_info?.mother_name || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Spouse Name</span>
                  <span className="font-semibold text-slate-900">{application.applicant_info?.spouse_name || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Mobile Number</span>
                  <span className="font-bold text-[#008751]">{application.applicant_info?.mobile_number || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Emergency / Phone</span>
                  <span className="font-semibold text-slate-900">{application.applicant_info?.phone_number || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Personal Email</span>
                  <span className="font-semibold text-slate-900">{application.applicant_info?.personal_email || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Date of Birth</span>
                  <span className="font-semibold text-slate-900">{application.applicant_info?.date_of_birth || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Nationality</span>
                  <span className="font-semibold text-slate-900">{application.applicant_info?.nationality || 'Bangladeshi'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Religion</span>
                  <span className="font-semibold text-slate-900">{application.applicant_info?.religion || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">NID / Passport Number</span>
                  <span className="font-bold text-slate-900">{application.applicant_info?.nid_or_passport || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">TIN Number</span>
                  <span className="font-semibold text-slate-900">{application.applicant_info?.tin_number || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Company Name</span>
                  <span className="font-semibold text-slate-900">{application.applicant_info?.company_name || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Designation / Profession</span>
                  <span className="font-semibold text-slate-900">{application.applicant_info?.designation || '-'}</span>
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <span className="text-slate-500 block">Present Address</span>
                  <span className="font-medium text-slate-800 bg-slate-50 p-2 rounded block mt-0.5 border border-slate-100">
                    {application.applicant_info?.present_address || '-'}
                  </span>
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <span className="text-slate-500 block">Permanent Address</span>
                  <span className="font-medium text-slate-800 bg-slate-50 p-2 rounded block mt-0.5 border border-slate-100">
                    {application.applicant_info?.permanent_address || '-'}
                  </span>
                </div>
              </div>
            </Card>

            {/* 2. Document Verification & Visual Previews */}
            <Card
              title="Uploaded Documents &amp; Visual Previews"
              subtitle="Inspect uploaded attachments, preview high-res scans, and verify authenticity."
            >
              {displayDocuments.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <Icons.FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-xs font-medium">No documents uploaded for this application yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {displayDocuments.map((doc) => {
                    const docUrl = getDocumentUrl(doc);
                    const isImg = isImageFile(doc);
                    const isPdf = isPdfFile(doc);
                    const formattedType = (doc.document_type || 'document').replace(/_/g, ' ').toUpperCase();

                    return (
                      <div
                        key={doc.id}
                        className="p-3.5 border border-slate-200 rounded-xl bg-slate-50/60 hover:bg-white hover:shadow-sm transition-all flex flex-col justify-between text-xs"
                      >
                        {/* Header info */}
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="font-bold text-slate-900 text-xs truncate" title={formattedType}>
                              {formattedType}
                            </span>
                            <Badge status={doc.verification_status || 'pending'} />
                          </div>

                          {/* Image or PDF Preview Box */}
                          <div className="relative w-full h-36 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center group mb-2.5">
                            {isImg && docUrl ? (
                              <>
                                <img
                                  src={docUrl}
                                  alt={doc.original_filename || formattedType}
                                  className="w-full h-full object-contain cursor-pointer transition-transform duration-200 group-hover:scale-105"
                                  onClick={() =>
                                    setPreviewDoc({
                                      id: doc.id,
                                      title: formattedType,
                                      url: docUrl,
                                      mimeType: doc.mime_type || 'image/jpeg',
                                      verificationStatus: doc.verification_status || 'pending',
                                      fileName: doc.original_filename || doc.file_name || 'document.jpg',
                                    })
                                  }
                                />
                                <div
                                  onClick={() =>
                                    setPreviewDoc({
                                      id: doc.id,
                                      title: formattedType,
                                      url: docUrl,
                                      mimeType: doc.mime_type || 'image/jpeg',
                                      verificationStatus: doc.verification_status || 'pending',
                                      fileName: doc.original_filename || doc.file_name || 'document.jpg',
                                    })
                                  }
                                  className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-white font-semibold text-xs gap-1.5"
                                >
                                  <Icons.Eye className="w-4 h-4" />
                                  <span>Preview Full Size</span>
                                </div>
                              </>
                            ) : isPdf ? (
                              <div className="text-center p-3">
                                <Icons.FileText className="w-10 h-10 text-rose-500 mx-auto mb-1" />
                                <span className="text-[11px] font-bold text-slate-700 block truncate max-w-[200px]">
                                  {doc.original_filename || 'PDF Document'}
                                </span>
                                <span className="text-[10px] text-slate-400">PDF File</span>
                              </div>
                            ) : (
                              <div className="text-center p-3">
                                <Icons.FileText className="w-10 h-10 text-slate-400 mx-auto mb-1" />
                                <span className="text-[11px] font-medium text-slate-600 block truncate max-w-[200px]">
                                  {doc.original_filename || 'Document'}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-2">
                            <span className="truncate max-w-[180px]" title={doc.original_filename || doc.file_name}>
                              {doc.original_filename || doc.file_name || 'file'}
                            </span>
                            <span>{formatFileSize(doc.file_size)}</span>
                          </div>

                          {doc.rejection_reason && (
                            <div className="p-2 mb-2 bg-rose-50 border border-rose-200 rounded text-[11px] text-rose-700 font-medium">
                              Rejection: {doc.rejection_reason}
                            </div>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            {docUrl && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setPreviewDoc({
                                    id: doc.id,
                                    title: formattedType,
                                    url: docUrl,
                                    mimeType: doc.mime_type || (isPdf ? 'application/pdf' : 'image/jpeg'),
                                    verificationStatus: doc.verification_status || 'pending',
                                    fileName: doc.original_filename || doc.file_name || 'document',
                                  })
                                }
                                className="p-1.5 text-slate-600 hover:text-slate-900"
                                title="Inspect document"
                              >
                                <Icons.Eye className="w-3.5 h-3.5" />
                              </Button>
                            )}

                            {docUrl && (
                              <a
                                href={docUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-slate-500 hover:text-[#008751] hover:bg-slate-100 rounded border border-slate-200"
                                title="Open original in new tab / download"
                              >
                                <Icons.ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            {doc.verification_status !== 'verified' && (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleVerifyDocument(doc.id)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] py-1 px-2.5 h-auto font-semibold"
                                leftIcon={<Icons.Check className="w-3 h-3" />}
                              >
                                Verify
                              </Button>
                            )}
                            {doc.verification_status !== 'rejected' && (
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => {
                                  setRejectingDocId(String(doc.id));
                                  setDocRejectionReason('');
                                }}
                                className="text-[11px] py-1 px-2.5 h-auto font-semibold"
                                leftIcon={<Icons.X className="w-3 h-3" />}
                              >
                                Reject
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* 3. Remarks & Communications Thread */}
            <Card title="Remarks &amp; Audit Timeline" subtitle="Communication history between customer and CR officers.">
              <div className="space-y-4 mb-6">
                {application.remarks?.length === 0 ? (
                  <p className="text-xs text-slate-400">No remarks logged yet.</p>
                ) : (
                  <div className="space-y-3">
                    {application.remarks?.map((rmk) => (
                      <div
                        key={rmk.id}
                        className={`p-3 rounded-lg border text-xs ${
                          rmk.is_internal ? 'bg-amber-50/60 border-amber-200' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-slate-900">
                            {rmk.author_name || 'CR Officer'}
                            {rmk.is_internal && <span className="ml-2 text-[10px] text-amber-700 font-normal uppercase">(Internal Note)</span>}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(rmk.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-slate-700 leading-relaxed">{rmk.remark_text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add Remark Form */}
              <form onSubmit={handleAddRemark} className="space-y-3 pt-3 border-t border-slate-100">
                <Textarea
                  placeholder="Enter remarks, notes, or follow-up comments..."
                  rows={2}
                  value={remarkText}
                  onChange={(e) => setRemarkText(e.target.value)}
                />
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={isInternalRemark}
                      onChange={(e) => setIsInternalRemark(e.target.checked)}
                      className="rounded border-slate-300 text-[#006B3E] focus:ring-[#006B3E]"
                    />
                    Internal note only (invisible to customer)
                  </label>
                  <Button type="submit" variant="secondary" size="sm" isLoading={isPostingRemark}>
                    Post Remark
                  </Button>
                </div>
              </form>
            </Card>
          </div>

          {/* Right Column: Financial, Bank, Nominees, Ownership */}
          <div className="space-y-6">
            {/* 4. Financial & Payment Breakdown */}
            <Card title="Financial Breakdown" subtitle="Pricing, down payment, and installment terms">
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Package Type</span>
                  <span className="font-semibold text-slate-900">
                    {application.ownership_detail?.package_type || application.ownership_detail?.package || '-'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Ownership Shares</span>
                  <span className="font-semibold text-slate-900">{application.ownership_detail?.number_of_ownership || '-'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-200">
                  <span className="font-bold text-slate-900">Total Agreed Price</span>
                  <span className="font-bold text-base text-[#006B3E]">
                    ৳ {application.ownership_detail?.total_price ? application.ownership_detail.total_price.toLocaleString('en-IN') : '0'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Booking / Down Payment</span>
                  <span className="font-semibold text-slate-900">
                    ৳ {application.payment_detail?.booking_money ? application.payment_detail.booking_money.toLocaleString('en-IN') : '0'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Payment Mode</span>
                  <span className="font-semibold text-slate-900 uppercase">
                    {application.payment_detail?.payment_type || application.payment_detail?.payment_mode || 'Cash'}
                  </span>
                </div>
                {application.payment_detail?.cheque_number && (
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Cheque / PO / DD No</span>
                    <span className="font-semibold text-slate-900">{application.payment_detail.cheque_number}</span>
                  </div>
                )}
                {application.payment_detail?.bank_name && (
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Issuing Bank</span>
                    <span className="font-semibold text-slate-900">{application.payment_detail.bank_name}</span>
                  </div>
                )}
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Installments Plan</span>
                  <span className="font-semibold text-slate-900">
                    {application.payment_detail?.number_of_installments || 0} x ৳{' '}
                    {application.payment_detail?.installment_amount
                      ? application.payment_detail.installment_amount.toLocaleString('en-IN')
                      : '0'}
                  </span>
                </div>
              </div>
            </Card>

            {/* 5. Bank Account Details */}
            <Card title="Bank Account Details" subtitle="Customer banking information for verification & disbursements">
              {application.bank_detail ? (
                <div className="space-y-2.5 text-xs">
                  <div>
                    <span className="text-slate-500 block">Bank Name</span>
                    <span className="font-bold text-slate-900">{application.bank_detail.bank_name || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Branch Name</span>
                    <span className="font-semibold text-slate-800">{application.bank_detail.branch || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Account Name</span>
                    <span className="font-semibold text-slate-800">{application.bank_detail.account_name || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Account Number</span>
                    <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded inline-block mt-0.5">
                      {application.bank_detail.account_number || '-'}
                    </span>
                  </div>
                  {application.bank_detail.routing_number && (
                    <div>
                      <span className="text-slate-500 block">Routing Number</span>
                      <span className="font-mono text-slate-800">{application.bank_detail.routing_number}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-2">No bank details recorded.</p>
              )}
            </Card>

            {/* 6. Nominees Summary */}
            <Card title="Nominees Particulars" subtitle="Designated nominees and emergency successors">
              <div className="space-y-3 text-xs">
                {application.nominees && application.nominees.length > 0 ? (
                  application.nominees.map((n, i) => (
                    <div key={i} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-sm">
                          {n.full_name || n.name}
                        </span>
                        <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-semibold uppercase">
                          {n.relation || n.relationship || `Nominee ${i + 1}`}
                        </span>
                      </div>
                      {n.father_or_husband_name && (
                        <span className="text-slate-600 block text-[11px]">
                          Father/Spouse: {n.father_or_husband_name}
                        </span>
                      )}
                      {n.date_of_birth && (
                        <span className="text-slate-600 block text-[11px]">
                          DoB: {n.date_of_birth}
                        </span>
                      )}
                      <span className="text-slate-600 block text-[11px]">
                        Cell: <strong>{n.cell_number || '-'}</strong>
                      </span>
                      <span className="text-slate-600 block text-[11px]">
                        NID/Passport: <strong>{n.nid_or_passport || '-'}</strong>
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 py-2">No nominees recorded.</p>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Modal: Full Document Preview Lightbox */}
      <Modal
        isOpen={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
        title={previewDoc?.title || 'Document Inspection'}
        description={previewDoc?.fileName || 'High-resolution scan preview'}
      >
        {previewDoc && (
          <div className="space-y-4">
            <div className="w-full max-h-[70vh] bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center p-2 border border-slate-800">
              {previewDoc.mimeType.includes('pdf') || /\.pdf$/i.test(previewDoc.fileName) ? (
                <iframe
                  src={previewDoc.url}
                  className="w-full h-[60vh] rounded bg-white"
                  title={previewDoc.title}
                />
              ) : (
                <img
                  src={previewDoc.url}
                  alt={previewDoc.title}
                  className="max-h-[65vh] w-auto max-w-full object-contain rounded"
                />
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <Badge status={previewDoc.verificationStatus} />
                <a
                  href={previewDoc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="text-xs font-semibold text-[#008751] hover:underline flex items-center gap-1"
                >
                  <Icons.Download className="w-3.5 h-3.5" />
                  <span>Download Original</span>
                </a>
              </div>

              <div className="flex items-center gap-2">
                {previewDoc.verificationStatus !== 'verified' && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleVerifyDocument(previewDoc.id)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    leftIcon={<Icons.Check className="w-3.5 h-3.5" />}
                  >
                    Verify Document
                  </Button>
                )}
                {previewDoc.verificationStatus !== 'rejected' && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      setRejectingDocId(String(previewDoc.id));
                      setDocRejectionReason('');
                    }}
                    leftIcon={<Icons.X className="w-3.5 h-3.5" />}
                  >
                    Reject
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Status Transition */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title="Update Application Status"
        description="Transition application to the next workflow stage."
      >
        <form onSubmit={handleUpdateStatus} className="space-y-4">
          <Select
            label="Select New Status"
            required
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value as ApplicationStatus)}
            options={[
              { value: 'under_review', label: 'Under Review' },
              ...(user?.role === 'admin'
                ? [{ value: 'approved', label: 'Approve Immediately (1-Click Super Admin Override)' }]
                : user?.role === 'subadmin'
                ? [{ value: 'approved', label: 'Sign-off & Approve (Subadmin Quorum)' }]
                : []),
              { value: 'correction_required', label: 'Correction Required (Action Needed)' },
              { value: 'documents_required', label: 'Documents Required' },
              { value: 'rejected', label: 'Rejected' },
              { value: 'cancelled', label: 'Cancelled' },
            ]}
          />

          {(newStatus === 'correction_required' || (newStatus as any) === 'action_required') && (
            <Textarea
              label="Correction Instructions for Customer"
              required
              rows={3}
              placeholder="Specify exactly which documents or fields need correction..."
              value={correctionDetails}
              onChange={(e) => setCorrectionDetails(e.target.value)}
            />
          )}

          <Textarea
            label="Internal Review Notes (Optional)"
            rows={2}
            placeholder="Notes for audit record..."
            value={statusNotes}
            onChange={(e) => setStatusNotes(e.target.value)}
          />

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => setIsStatusModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isUpdatingStatus}>
              Save Status
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Document Rejection Reason */}
      <Modal
        isOpen={!!rejectingDocId}
        onClose={() => setRejectingDocId(null)}
        title="Reject Document"
        description="Provide a clear reason why this document does not meet validation standards."
      >
        <form onSubmit={handleRejectDocument} className="space-y-4">
          <Textarea
            label="Rejection Reason"
            required
            rows={3}
            placeholder="e.g. Photograph is blurred; NID back side is cut off..."
            value={docRejectionReason}
            onChange={(e) => setDocRejectionReason(e.target.value)}
          />

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => setRejectingDocId(null)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" type="submit" isLoading={isRejectingDoc}>
              Confirm Rejection
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Request Edit Permission from Admin */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Request Edit Permission from Admin"
        description={`Application ${application.reference_number || application.application_number} is currently locked after submission. Explain why changes are needed.`}
      >
        <form onSubmit={handleRequestEdit} className="space-y-4">
          <Textarea
            label="Reason for Modification / Edit Request"
            required
            rows={4}
            placeholder="e.g. Customer provided revised passport number and updated permanent address..."
            value={editReason}
            onChange={(e) => setEditReason(e.target.value)}
          />

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs">
            Once submitted, an Administrator will review your request. When approved, the application form will unlock so you can update customer details.
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => setIsEditModalOpen(false)} disabled={isSubmittingEditReq}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isSubmittingEditReq}>
              Submit Request to Admin
            </Button>
          </div>
        </form>
      </Modal>

      {/* Corporate Printable Receipt Modal */}
      <ApplicationReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        data={{
          referenceNumber: application.reference_number || application.application_number || `APP-${application.id}`,
          submissionDate: application.submission_date || application.submitted_at || application.application_date || new Date().toISOString(),
          status: application.status,
          businessName: application.business?.name || application.business_name || 'Sunset Group',
          businessCode: application.business?.code || application.business_code || 'SG',
          applicantInfo: {
            full_name_en: application.applicant_info?.full_name_en,
            full_name_bn: application.applicant_info?.full_name_bn,
            father_name: application.applicant_info?.father_name,
            mother_name: application.applicant_info?.mother_name,
            spouse_name: application.applicant_info?.spouse_name,
            mobile_number: application.applicant_info?.mobile_number,
            present_address: application.applicant_info?.present_address,
            permanent_address: application.applicant_info?.permanent_address,
            nid_or_passport: application.applicant_info?.nid_or_passport,
            date_of_birth: application.applicant_info?.date_of_birth,
            personal_email: application.applicant_info?.personal_email,
            company_name: application.applicant_info?.company_name,
            designation: application.applicant_info?.designation,
          },
          ownershipDetail: {
            package: application.ownership_detail?.package_type || (application.ownership_detail as any)?.package || 'Standard',
            package_type: application.ownership_detail?.package_type || (application.ownership_detail as any)?.package || 'Standard',
            number_of_ownership: application.ownership_detail?.number_of_ownership || 1,
            price_per_ownership: application.ownership_detail?.price_per_ownership || 0,
            discount: application.ownership_detail?.discount_amount || 0,
            discount_amount: application.ownership_detail?.discount_amount || 0,
            total_price: application.ownership_detail?.total_price || 0,
            amount_in_words: application.ownership_detail?.amount_in_words,
          },
          paymentDetail: {
            token_money: application.payment_detail?.token_money || 0,
            booking_money: application.payment_detail?.booking_money || 0,
            booking_date: application.payment_detail?.booking_date || (application.payment_detail as any)?.booking_money_date,
            booking_installment_count: application.payment_detail?.booking_installment_count || 1,
            booking_installment_amount: application.payment_detail?.booking_installment_amount || 0,
            installment_type: application.payment_detail?.installment_type,
            number_of_installments: application.payment_detail?.number_of_installments || 0,
            installment_amount: application.payment_detail?.installment_amount || 0,
            installment_start_date: application.payment_detail?.installment_start_date || (application.payment_detail as any)?.installment_starting_date,
            dues_amount: application.payment_detail?.dues_amount || 0,
          },
          bankDetail: application.bank_detail
            ? {
                bank_name: application.bank_detail.bank_name,
                branch_name: application.bank_detail.branch || (application.bank_detail as any).branch_name,
                account_name: application.bank_detail.account_name,
                account_number: application.bank_detail.account_number,
              }
            : undefined,
          nominees: (application.nominees || []).map((n) => ({
            name: n.full_name || n.name || '',
            full_name: n.full_name || n.name || '',
            relationship: n.relation || n.relationship || '',
            relation: n.relation || n.relationship || '',
            cell_number: n.cell_number || (n as any).mobile_number,
            nid_or_passport: n.nid_or_passport || (n as any).nid_number,
            share_percentage: (n as any).share_percentage || (n as any).percentage,
          })),
        }}
      />
    </DashboardShell>
  );
}
