'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Application, ApplicationEditRequest } from '@/lib/types';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icons';
import { Alert } from '@/components/ui/Alert';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { ApplicationReceiptModal } from '@/components/application-form/ApplicationReceiptModal';
import { ProjectTransferModal } from '@/components/customer/ProjectTransferModal';

interface PreviewDocState {
  id: string | number;
  title: string;
  url: string;
  mimeType?: string;
  fileName?: string;
  verificationStatus?: string;
}

export default function CustomerApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [application, setApplication] = useState<Application | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Edit / Info Change Request
  const [editRequests, setEditRequests] = useState<ApplicationEditRequest[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [editReason, setEditReason] = useState('');
  const [isSubmittingEditReq, setIsSubmittingEditReq] = useState(false);

  // Document preview lightbox modal
  const [previewDoc, setPreviewDoc] = useState<PreviewDocState | null>(null);

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

  // Deduplicate documents by slot so re-uploaded items show only their latest version
  const displayDocuments = React.useMemo(() => {
    const source = documents.length > 0 ? documents : application?.documents || [];
    if (!source || !Array.isArray(source)) return [];
    const map = new Map<string, any>();
    const sorted = [...source].sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));
    for (const doc of sorted) {
      const rawType = (doc.document_type || (doc as any).type || 'other').toLowerCase();
      let slot = rawType;
      if (slot === 'photograph' || slot === 'photo' || slot === 'profile_photo') {
        slot = 'applicant_photo';
      }
      map.set(slot, doc);
    }
    return Array.from(map.values());
  }, [documents, application?.documents]);

  const loadData = async () => {
    try {
      const [app, reqs, docsRes] = await Promise.all([
        api.applications.get(resolvedParams.id),
        api.applications.getEditRequests(resolvedParams.id).catch(() => []),
        api.applications.getDocuments(resolvedParams.id).catch(() => []),
      ]);
      setApplication(app);
      setEditRequests(Array.isArray(reqs) ? reqs : (reqs as any)?.data || []);
      const docList = Array.isArray(docsRes) ? docsRes : (docsRes as any)?.data || app.documents || [];
      setDocuments(docList);
    } catch (err: any) {
      setError(err.message || 'Failed to find application.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!application || !editReason.trim()) return;

    setIsSubmittingEditReq(true);
    try {
      await api.applications.requestEdit(application.id, editReason.trim());
      setIsEditModalOpen(false);
      setEditReason('');
      setStatusMsg({
        type: 'success',
        text: 'Your information change request has been submitted to Administration for review.',
      });
      loadData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to submit change request.' });
    } finally {
      setIsSubmittingEditReq(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      loadData();
    }
  }, [user, authLoading, resolvedParams.id, router]);

  const handleDocumentReupload = async (docType: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !application) return;

    setUploadingDocId(docType);
    try {
      await api.applications.uploadDocument(String(application.id), docType, file);
      setStatusMsg({ type: 'success', text: 'Document re-uploaded successfully.' });
      loadData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to upload document.' });
    } finally {
      setUploadingDocId(null);
    }
  };

  if (isLoading) {
    return (
      <DashboardShell title="Application Details" subtitle="Loading application record...">
        <div className="py-20 flex flex-col items-center justify-center">
          <Icons.Spinner className="w-8 h-8 text-[#006B3E] animate-spin mb-3" />
          <p className="text-xs text-slate-500 font-medium">Loading application particulars &amp; documents...</p>
        </div>
      </DashboardShell>
    );
  }

  if (error || !application) {
    return (
      <DashboardShell title="Application Not Found">
        <div className="py-12 text-center max-w-md mx-auto">
          <Icons.AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900 mb-1">Application Record Unavailable</h3>
          <p className="text-xs text-slate-500 mb-5">{error || 'This application could not be located.'}</p>
          <Link href="/customer/dashboard">
            <Button variant="primary" size="sm">
              Return to Dashboard
            </Button>
          </Link>
        </div>
      </DashboardShell>
    );
  }

  const isActionRequired = application.status === 'action_required';
  const pendingEditReq = editRequests.find((r) => r.status === 'pending');
  const refNum = application.reference_number || (application as any).application_number || `SKH-2026-00003`;

  return (
    <DashboardShell
      title={`Application: ${refNum}`}
      subtitle={`${application.business?.name || 'Sunset Group Division'} • Registered on ${
        application.submission_date ? new Date(application.submission_date).toLocaleDateString() : 'Draft'
      }`}
      actions={
        <div className="flex items-center gap-2">
          {pendingEditReq ? (
            <span className="text-xs bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5">
              <Icons.Clock className="w-4 h-4 text-amber-600" />
              <span>Change Request Pending Admin Review</span>
            </span>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditReason('');
                setIsEditModalOpen(true);
              }}
              className="flex items-center gap-1.5"
            >
              <Icons.FileText className="w-4 h-4" />
              <span>Request Info Change</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsReceiptModalOpen(true)}
            leftIcon={<Icons.Printer className="w-4 h-4 text-[#006B3E]" />}
            className="font-bold text-slate-800"
          >
            Official Receipt
          </Button>
          <Link href="/customer/dashboard">
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
          <Alert type="success" title="Application Unlocked for CR Editing">
            Administration has approved your request to update information. Your assigned Customer Relations officer is making the required revisions.
          </Alert>
        )}

        {pendingEditReq && (
          <Alert type="warning" title="Information Change Request Pending">
            Your request to update application details (&quot;{pendingEditReq.reason}&quot;) is currently under review by Sunset Group administration.
          </Alert>
        )}

        {/* Action Required Banner if CR requested changes */}
        {isActionRequired && (
          <Alert type="warning" title="Correction / Revision Required">
            <p className="font-semibold text-xs mb-1">
              Instructions from Customer Relations:
            </p>
            <p className="text-xs bg-white/70 p-2.5 rounded border border-amber-300">
              {application.correction_requested || 'Please re-upload requested documents or verify information.'}
            </p>
          </Alert>
        )}

        {/* Application Status Header */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs text-slate-500 uppercase tracking-wider block font-semibold">
              Current Workflow Status
            </span>
            <div className="flex flex-wrap items-center gap-2.5 mt-1">
              <Badge status={application.status} className="text-sm px-3 py-1" />
              {application.customer_id_number ? (
                <span className="font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded text-xs flex items-center gap-1">
                  <Icons.Shield className="w-3.5 h-3.5 text-emerald-600" />
                  Customer ID: {application.customer_id_number}
                </span>
              ) : (
                <span className="font-mono text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded text-xs">
                  Customer ID: Pending Admin Approval
                </span>
              )}
              {application.assigned_cr_name && (
                <span className="text-xs text-slate-500">
                  Assigned Officer: <strong className="text-slate-800">{application.assigned_cr_name}</strong>
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-500 block">Total Ownership Valuation</span>
            <span className="text-xl font-bold text-[#006B3E]">
              ৳ {application.ownership_detail?.total_price?.toLocaleString('en-IN') || '0'}
            </span>
          </div>
        </div>

        {/* 2-Column Details Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Applicant Personal & Occupation */}
            <Card title="Applicant &amp; Professional Information">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block">Full Name (English)</span>
                  <span className="font-semibold text-slate-900">{application.applicant_info?.full_name_en || '-'}</span>
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
                  <span className="text-slate-500 block">Spouse&apos;s Name</span>
                  <span className="font-semibold text-slate-900">{application.applicant_info?.spouse_name || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Mobile Number</span>
                  <span className="font-semibold text-slate-900">{application.applicant_info?.mobile_number || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Personal Email</span>
                  <span className="font-semibold text-slate-900">{application.applicant_info?.personal_email || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">NID / Passport</span>
                  <span className="font-semibold text-slate-900 font-mono">{application.applicant_info?.nid_or_passport || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Date of Birth</span>
                  <span className="font-semibold text-slate-900">{application.applicant_info?.date_of_birth || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Nationality</span>
                  <span className="font-semibold text-slate-900">{application.applicant_info?.nationality || 'Bangladeshi'}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-500 block">Present Address</span>
                  <span className="font-semibold text-slate-900">{application.applicant_info?.present_address || '-'}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-500 block">Permanent Address</span>
                  <span className="font-semibold text-slate-900">{application.applicant_info?.permanent_address || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Company / Workplace</span>
                  <span className="font-semibold text-slate-900">{application.applicant_info?.company_name || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Designation</span>
                  <span className="font-semibold text-slate-900">{application.applicant_info?.designation || '-'}</span>
                </div>
              </div>
            </Card>

            {/* Attached Documents & Visual Previews */}
            <Card
              title="Attached Documents &amp; Visual Scans"
              subtitle="Inspect uploaded identity credentials, photos, and verification status."
            >
              {displayDocuments.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <Icons.FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-xs font-medium">No documents attached to this application yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {displayDocuments.map((doc) => {
                    const docUrl = getDocumentUrl(doc);
                    const isImg = isImageFile(doc);
                    const isPdf = isPdfFile(doc);
                    const formattedType = (doc.document_type || 'document').replace(/_/g, ' ').toUpperCase();

                    return (
                      <div
                        key={doc.id}
                        className="p-3 border border-slate-200 rounded-xl bg-slate-50/60 hover:bg-white hover:shadow-sm transition-all flex flex-col justify-between text-xs"
                      >
                        <div>
                          {/* Card Header */}
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="font-bold text-slate-900 text-xs truncate" title={formattedType}>
                              {formattedType}
                            </span>
                            <Badge status={doc.verification_status || 'pending'} />
                          </div>

                          {/* Visual Image / PDF Thumbnail */}
                          <div className="relative w-full h-36 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center group mb-2">
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
                              <div
                                className="text-center p-3 cursor-pointer"
                                onClick={() =>
                                  setPreviewDoc({
                                    id: doc.id,
                                    title: formattedType,
                                    url: docUrl,
                                    mimeType: 'application/pdf',
                                    verificationStatus: doc.verification_status || 'pending',
                                    fileName: doc.original_filename || 'document.pdf',
                                  })
                                }
                              >
                                <Icons.FileText className="w-10 h-10 text-rose-500 mx-auto mb-1" />
                                <span className="text-[11px] font-bold text-slate-700 block truncate max-w-[180px]">
                                  {doc.original_filename || doc.file_name || 'PDF Document'}
                                </span>
                                <span className="text-[10px] text-slate-400">Tap to Preview</span>
                              </div>
                            ) : (
                              <div className="text-center p-3">
                                <Icons.FileText className="w-8 h-8 text-slate-400 mx-auto mb-1" />
                                <span className="text-[11px] font-medium text-slate-600 block truncate max-w-[180px]">
                                  {doc.original_filename || doc.file_name || 'Document'}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* File Details */}
                          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5">
                            <span className="truncate max-w-[170px]" title={doc.original_filename || doc.file_name}>
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

                        {/* Actions */}
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                          {docUrl && (
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewDoc({
                                  id: doc.id,
                                  title: formattedType,
                                  url: docUrl,
                                  mimeType: doc.mime_type || (isPdf ? 'application/pdf' : 'image/jpeg'),
                                  verificationStatus: doc.verification_status || 'pending',
                                  fileName: doc.original_filename || doc.file_name || 'document.jpg',
                                })
                              }
                              className="text-xs font-semibold text-[#006B3E] hover:underline flex items-center gap-1"
                            >
                              <Icons.Eye className="w-3.5 h-3.5" />
                              <span>View Full Size</span>
                            </button>
                          )}

                          {/* Allow re-upload if rejected or action_required */}
                          {(doc.verification_status === 'rejected' || isActionRequired) && (
                            <label className="cursor-pointer inline-flex items-center px-2 py-1 border border-slate-300 rounded text-[11px] font-semibold text-slate-700 hover:bg-slate-50">
                              {uploadingDocId === doc.document_type ? (
                                <Icons.Spinner className="w-3 h-3 animate-spin" />
                              ) : (
                                'Replace File'
                              )}
                              <input
                                type="file"
                                accept="image/*,application/pdf"
                                className="hidden"
                                onChange={(e) => handleDocumentReupload(doc.document_type, e)}
                              />
                            </label>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Nominees */}
            <Card title="Nominee Details">
              <div className="space-y-4">
                {application.nominees?.map((nom, idx) => (
                  <div key={idx} className="p-3 border border-slate-100 rounded-lg bg-slate-50/60 text-xs">
                    <span className="font-bold text-[#006B3E] uppercase tracking-wider block mb-2">
                      Nominee {idx + 1} ({nom.relation})
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <div>
                        <span className="text-slate-500 block">Name:</span>
                        <span className="font-semibold text-slate-900">{nom.full_name}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Cell Phone:</span>
                        <span className="font-semibold text-slate-900">{nom.cell_number}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">NID:</span>
                        <span className="font-semibold text-slate-900 font-mono">{nom.nid_or_passport}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Right Column: Pricing & Banking */}
          <div className="space-y-6">
            <Card title="Ownership &amp; Payment Summary">
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Package Type</span>
                  <span className="font-semibold text-slate-900">{application.ownership_detail?.package_type}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">No. of Ownerships</span>
                  <span className="font-semibold text-slate-900">{application.ownership_detail?.number_of_ownership} Share</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Unit Price</span>
                  <span className="font-semibold text-slate-900 font-mono">৳ {application.ownership_detail?.price_per_ownership?.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Discount</span>
                  <span className="font-semibold text-slate-900 font-mono">৳ {application.ownership_detail?.discount_amount?.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-200">
                  <span className="font-bold text-slate-900">Total Price</span>
                  <span className="font-bold text-[#006B3E] font-mono">৳ {application.ownership_detail?.total_price?.toLocaleString('en-IN')}</span>
                </div>
                {application.ownership_detail?.amount_in_words && (
                  <div className="text-[11px] text-slate-500 italic">
                    In Words: Taka {application.ownership_detail.amount_in_words} Only
                  </div>
                )}
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Booking Money Paid</span>
                  <span className="font-semibold text-[#006B3E] font-mono">৳ {application.payment_detail?.booking_money?.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Remaining Balance</span>
                  <span className="font-semibold text-rose-700 font-mono">৳ {application.payment_detail?.dues_amount?.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Installments</span>
                  <span className="font-semibold text-slate-900">
                    {application.payment_detail?.number_of_installments} x ৳ {application.payment_detail?.installment_amount?.toLocaleString('en-IN')} ({application.payment_detail?.installment_type})
                  </span>
                </div>

                {/* Discreet Project / Package Transfer Option */}
                <div className="pt-2.5 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Investment Adjustment</span>
                  <button
                    type="button"
                    onClick={() => setIsTransferModalOpen(true)}
                    className="hover:text-slate-600 underline transition-colors cursor-pointer"
                  >
                    Request Project Transfer
                  </button>
                </div>
              </div>
            </Card>

            <Card title="Bank Account">
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-500 block">Bank Name:</span>
                  <span className="font-semibold text-slate-900">{application.bank_detail?.bank_name || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Branch:</span>
                  <span className="font-semibold text-slate-900">{application.bank_detail?.branch_name || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Account Name:</span>
                  <span className="font-semibold text-slate-900">{application.bank_detail?.account_name || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Account Number:</span>
                  <span className="font-semibold text-slate-900 font-mono">{application.bank_detail?.account_number || '-'}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Lightbox Modal: High-Res Document Preview */}
      <Modal
        isOpen={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
        title={previewDoc?.title || 'Document Preview'}
        description={previewDoc?.fileName || 'Attached application credential'}
      >
        {previewDoc && (
          <div className="space-y-4">
            <div className="w-full max-h-[70vh] bg-slate-100 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center p-2">
              {previewDoc.mimeType?.includes('pdf') || previewDoc.url.toLowerCase().endsWith('.pdf') ? (
                <div className="text-center py-10 w-full">
                  <Icons.FileText className="w-16 h-16 text-rose-500 mx-auto mb-3" />
                  <p className="text-sm font-bold text-slate-800 mb-1">{previewDoc.fileName}</p>
                  <p className="text-xs text-slate-500 mb-4">PDF document preview</p>
                  <a
                    href={previewDoc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#006B3E] text-white text-xs font-bold hover:bg-[#005230] transition-colors"
                  >
                    <Icons.Download className="w-4 h-4" />
                    <span>Open / Download PDF</span>
                  </a>
                </div>
              ) : (
                <img
                  src={previewDoc.url}
                  alt={previewDoc.title}
                  className="max-h-[65vh] w-auto max-w-full object-contain rounded"
                />
              )}
            </div>

            <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
              <Badge status={previewDoc.verificationStatus || 'pending'} />
              <a
                href={previewDoc.url}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="font-bold text-[#006B3E] hover:underline flex items-center gap-1"
              >
                <Icons.Download className="w-4 h-4" />
                <span>Download Original File</span>
              </a>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Request Edit */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Request Information Update"
        description="Submit a revision request to Sunset Group Administration to unlock your application."
      >
        <form onSubmit={handleRequestEdit} className="space-y-4">
          <Textarea
            label="What details would you like to update?"
            required
            rows={4}
            placeholder="e.g. I need to update my nominee contact details and corrected permanent address..."
            value={editReason}
            onChange={(e) => setEditReason(e.target.value)}
          />

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 text-xs">
            An administrator will review your change request. Once approved, the application will be unlocked and you will be able to edit and resubmit the form.
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => setIsEditModalOpen(false)} disabled={isSubmittingEditReq}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isSubmittingEditReq}>
              Submit Request
            </Button>
          </div>
        </form>
      </Modal>

      {/* Official Printable Receipt Modal */}
      {application && (
        <ApplicationReceiptModal
          isOpen={isReceiptModalOpen}
          onClose={() => setIsReceiptModalOpen(false)}
          data={{
            referenceNumber: refNum,
            submissionDate: application.submission_date || application.submitted_at || application.created_at,
            status: application.status,
            businessName: application.business?.name || application.business_name || 'Sunset Bay Limited',
            businessCode: application.business?.code || application.business_code || 'SKH',
            applicantInfo: {
              full_name_en: application.applicant_info?.full_name_en,
              full_name_bn: application.applicant_info?.full_name_bn,
              father_name: application.applicant_info?.father_name,
              mother_name: application.applicant_info?.mother_name,
              spouse_name: application.applicant_info?.spouse_name,
              mobile_number: application.applicant_info?.mobile_number,
              phone_number: application.applicant_info?.phone_number,
              personal_email: application.applicant_info?.personal_email,
              nid_or_passport: application.applicant_info?.nid_or_passport || (application.applicant_info as any)?.nid_number,
              date_of_birth: application.applicant_info?.date_of_birth,
              nationality: application.applicant_info?.nationality,
              religion: application.applicant_info?.religion,
              present_address: application.applicant_info?.present_address,
              permanent_address: application.applicant_info?.permanent_address,
              company_name: application.applicant_info?.company_name,
              designation: application.applicant_info?.designation,
              office_address: application.applicant_info?.office_address,
            },
            ownershipDetail: {
              package: application.ownership_detail?.package_type || (application.ownership_detail as any)?.package,
              package_type: application.ownership_detail?.package_type || (application.ownership_detail as any)?.package,
              number_of_ownership: Number(application.ownership_detail?.number_of_ownership) || 1,
              price_per_ownership: Number(application.ownership_detail?.price_per_ownership) || 0,
              discount: Number(application.ownership_detail?.discount_amount || (application.ownership_detail as any)?.discount) || 0,
              discount_amount: Number(application.ownership_detail?.discount_amount || (application.ownership_detail as any)?.discount) || 0,
              total_price: Number(application.ownership_detail?.total_price) || 0,
              amount_in_words: application.ownership_detail?.amount_in_words,
            },
            paymentDetail: {
              token_money: Number(application.payment_detail?.token_money) || 0,
              booking_money: Number(application.payment_detail?.booking_money) || 0,
              booking_date: application.payment_detail?.booking_date || (application.payment_detail as any)?.booking_money_date,
              installment_type: application.payment_detail?.installment_type,
              number_of_installments: Number(application.payment_detail?.number_of_installments) || 0,
              installment_amount: Number(application.payment_detail?.installment_amount) || 0,
              installment_start_date: application.payment_detail?.installment_start_date || (application.payment_detail as any)?.installment_starting_date,
              dues_amount: Number(application.payment_detail?.dues_amount) || 0,
            },
            bankDetail: {
              account_name: application.bank_detail?.account_name,
              account_number: application.bank_detail?.account_number,
              bank_name: application.bank_detail?.bank_name,
              branch_name: application.bank_detail?.branch_name || (application.bank_detail as any)?.branch,
            },
            nominees: application.nominees as any,
            declarationAccepted: Boolean(application.declaration_accepted),
          }}
        />
      )}

      {/* Discreet Project / Package Transfer Modal */}
      {application && (
        <ProjectTransferModal
          isOpen={isTransferModalOpen}
          onClose={() => setIsTransferModalOpen(false)}
          application={application}
          onSuccess={() => {
            setStatusMsg({
              type: 'success',
              text: 'Project transfer request submitted successfully. Our team will review and contact you.',
            });
            loadData();
          }}
        />
      )}
    </DashboardShell>
  );
}
