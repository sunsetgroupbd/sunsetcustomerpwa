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
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';
import { Icons } from '@/components/ui/Icons';
import { openSmsWithCredentials } from '@/lib/sms';

export default function CrApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [application, setApplication] = useState<Application | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Status transition modal
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<ApplicationStatus>('under_review');
  const [statusNotes, setStatusNotes] = useState('');
  const [correctionDetails, setCorrectionDetails] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

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

  const loadData = async () => {
    try {
      const [app, reqs] = await Promise.all([
        api.applications.get(resolvedParams.id),
        api.applications.getEditRequests(resolvedParams.id).catch(() => []),
      ]);
      setApplication(app);
      setNewStatus(app.status);
      setEditRequests(Array.isArray(reqs) ? reqs : (reqs as any)?.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load application.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && (!user || (user.role !== 'cr' && user.role !== 'admin'))) {
      router.push('/login');
      return;
    }
    if (user) {
      loadData();
    }
  }, [user, authLoading, resolvedParams.id, router]);

  const handleVerifyDocument = async (docId: string) => {
    if (!application) return;
    try {
      await api.applications.verifyDocument(application.id, docId, 'verified');
      setStatusMsg({ type: 'success', text: 'Document verified successfully.' });
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
      await api.applications.verifyDocument(application.id, rejectingDocId, 'rejected', docRejectionReason.trim());
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
        application.id,
        newStatus,
        statusNotes.trim() || undefined,
        newStatus === 'action_required' ? correctionDetails.trim() : undefined
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
      await api.applications.addRemark(application.id, remarkText.trim(), isInternalRemark);
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
      await api.applications.requestEdit(application.id, editReason.trim());
      setIsEditModalOpen(false);
      setEditReason('');
      setStatusMsg({
        type: 'success',
        text: 'Edit permission request has been submitted to Administrator. You will be able to edit once approved.',
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
      <DashboardShell title="CR Review" subtitle="Loading application...">
        <div className="py-16 text-center text-xs text-slate-500">
          <Icons.Spinner className="w-8 h-8 text-[#006B3E] mx-auto mb-3" />
          Loading application...
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
          <Link href="/cr/dashboard">
            <Button variant="outline" size="sm" leftIcon={<Icons.ArrowLeft className="w-4 h-4" />}>
              Back to Queue
            </Button>
          </Link>
        </div>
      </DashboardShell>
    );
  }

  const isEditable = application.status === 'draft' || application.is_edit_unlocked || application.status === 'action_required';
  const pendingEditReq = editRequests.find((r) => r.status === 'pending');

  return (
    <DashboardShell
      title={`Review Application: ${application.reference_number}`}
      subtitle={`${application.business?.name || 'Sunset Division'} • Submitted on ${
        application.submission_date ? new Date(application.submission_date).toLocaleDateString() : 'Draft'
      }`}
      actions={
        <div className="flex items-center gap-2">
          {isEditable ? (
            <Link href={`/customer/apply?application_id=${application.id}`}>
              <Button variant="primary" size="sm" className="bg-[#008751] hover:bg-[#007043] flex items-center gap-1.5">
                <Icons.Edit className="w-4 h-4" />
                <span>Fill / Edit Form</span>
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
                  referenceNumber: application.reference_number,
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
          >
            Workflow Status
          </Button>

          <Link href="/cr/dashboard">
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
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">
              Current Application Status
            </span>
            <div className="flex items-center gap-3 mt-1.5">
              <Badge status={application.status} className="text-sm px-3 py-1" />
              {application.assigned_cr_name && (
                <span className="text-xs text-slate-600">
                  CR Officer: <strong>{application.assigned_cr_name}</strong>
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setNewStatus('approved');
                setIsStatusModalOpen(true);
              }}
              className="text-emerald-700 hover:bg-emerald-50 border-emerald-300"
            >
              Approve Application
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setNewStatus('action_required');
                setIsStatusModalOpen(true);
              }}
              className="text-purple-700 hover:bg-purple-50 border-purple-300"
            >
              Request Correction
            </Button>
          </div>
        </div>

        {/* 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Applicant Details */}
            <Card title="Applicant Particulars">
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
                  <span className="text-slate-500 block">Mobile Number</span>
                  <span className="font-semibold text-slate-900">{application.applicant_info?.mobile_number || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">NID / Passport</span>
                  <span className="font-semibold text-slate-900">{application.applicant_info?.nid_or_passport || '-'}</span>
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
              </div>
            </Card>

            {/* Document Verification Section */}
            <Card
              title="Document Verification &amp; Audit"
              subtitle="Inspect uploaded proofs, verify authenticity, or reject with detailed remarks."
            >
              {application.documents?.length === 0 ? (
                <p className="text-xs text-slate-500 py-3">No documents submitted yet.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {application.documents?.map((doc) => (
                    <div key={doc.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <Icons.FileText className="w-4 h-4 text-slate-400" />
                          <span className="font-bold text-slate-900 uppercase">
                            {doc.document_type.replace(/_/g, ' ')}
                          </span>
                          <Badge status={doc.verification_status} />
                        </div>
                        <span className="text-[11px] text-slate-500 mt-1 block">File: {doc.file_name}</span>
                        {doc.rejection_reason && (
                          <span className="text-rose-600 font-semibold block text-[11px] mt-1">
                            Rejection Note: {doc.rejection_reason}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {doc.verification_status !== 'verified' && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleVerifyDocument(doc.id)}
                            leftIcon={<Icons.Check className="w-3.5 h-3.5" />}
                          >
                            Verify
                          </Button>
                        )}
                        {doc.verification_status !== 'rejected' && (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => {
                              setRejectingDocId(doc.id);
                              setDocRejectionReason('');
                            }}
                            leftIcon={<Icons.X className="w-3.5 h-3.5" />}
                          >
                            Reject
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Remarks & Communications Thread */}
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

          {/* Right Column: Pricing & Quick Data */}
          <div className="space-y-6">
            <Card title="Financial Breakdown">
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Package Type</span>
                  <span className="font-semibold text-slate-900">{application.ownership_detail?.package_type}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Ownership Shares</span>
                  <span className="font-semibold text-slate-900">{application.ownership_detail?.number_of_ownership}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-200">
                  <span className="font-bold text-slate-900">Total Price</span>
                  <span className="font-bold text-[#006B3E]">৳ {application.ownership_detail?.total_price?.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Booking Paid</span>
                  <span className="font-semibold text-slate-900">৳ {application.payment_detail?.booking_money?.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Installments</span>
                  <span className="font-semibold text-slate-900">
                    {application.payment_detail?.number_of_installments} x ৳ {application.payment_detail?.installment_amount?.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </Card>

            <Card title="Nominees Summary">
              <div className="space-y-3 text-xs">
                {application.nominees?.map((n, i) => (
                  <div key={i} className="p-2.5 bg-slate-50 rounded border border-slate-200">
                    <span className="font-bold text-slate-800 block">{n.full_name} ({n.relation})</span>
                    <span className="text-slate-500 text-[11px] block mt-0.5">Cell: {n.cell_number}</span>
                    <span className="text-slate-500 text-[11px] block">NID: {n.nid_or_passport}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>

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
              { value: 'action_required', label: 'Action Required (Correction Needed)' },
              { value: 'approved', label: 'Approved' },
              { value: 'rejected', label: 'Rejected' },
              { value: 'returned', label: 'Returned' },
            ]}
          />

          {newStatus === 'action_required' && (
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
        description={`Application ${application.reference_number} is currently locked after submission. Explain why changes are needed.`}
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
    </DashboardShell>
  );
}

