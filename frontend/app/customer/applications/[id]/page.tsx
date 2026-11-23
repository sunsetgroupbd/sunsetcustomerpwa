'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Application, ApplicationEditRequest } from '@/lib/types';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { Icons } from '@/components/ui/Icons';
import { ApplicationReceiptModal } from '@/components/application-form/ApplicationReceiptModal';

export default function CustomerApplicationDetailPage({
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
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Edit / Info Change Request
  const [editRequests, setEditRequests] = useState<ApplicationEditRequest[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [editReason, setEditReason] = useState('');
  const [isSubmittingEditReq, setIsSubmittingEditReq] = useState(false);

  const loadData = async () => {
    try {
      const [app, reqs] = await Promise.all([
        api.applications.get(resolvedParams.id),
        api.applications.getEditRequests(resolvedParams.id).catch(() => []),
      ]);
      setApplication(app);
      setEditRequests(Array.isArray(reqs) ? reqs : (reqs as any)?.data || []);
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
    setStatusMsg(null);
    try {
      await api.applications.uploadDocument(application.id, docType, file);
      setStatusMsg({ type: 'success', text: `Revised document (${file.name}) uploaded for CR review.` });
      await loadData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to upload revised document.' });
    } finally {
      setUploadingDocId(null);
    }
  };

  if (isLoading) {
    return (
      <DashboardShell title="Application Overview" subtitle="Loading details...">
        <div className="py-16 text-center text-xs text-slate-500">
          <Icons.Spinner className="w-8 h-8 text-[#006B3E] mx-auto mb-3" />
          Loading application record...
        </div>
      </DashboardShell>
    );
  }

  if (error || !application) {
    return (
      <DashboardShell title="Application Overview" subtitle="Not Found">
        <Alert type="error" title="Application Not Found">
          {error || 'Could not locate the requested application record.'}
        </Alert>
        <div className="mt-4">
          <Link href="/customer/dashboard">
            <Button variant="outline" size="sm" leftIcon={<Icons.ArrowLeft className="w-4 h-4" />}>
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </DashboardShell>
    );
  }

  const isActionRequired = application.status === 'action_required';
  const isEditable = application.status === 'draft' || application.is_edit_unlocked || isActionRequired;
  const pendingEditReq = editRequests.find((r) => r.status === 'pending');

  return (
    <DashboardShell
      title={`Application ${application.reference_number}`}
      subtitle={`${application.business?.name || 'Sunset Division'} • Submitted on ${
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
                        <span className="font-semibold text-slate-900">{nom.nid_or_passport}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Documents & Verification Status */}
            <Card
              title="Attached Documents &amp; Verification"
              subtitle="Verification status of submitted credentials."
            >
              {application.documents?.length === 0 ? (
                <p className="text-xs text-slate-500">No documents attached.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {application.documents?.map((doc) => (
                    <div key={doc.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <Icons.FileText className="w-4 h-4 text-slate-400" />
                          <span className="font-semibold text-slate-900 uppercase">
                            {doc.document_type.replace(/_/g, ' ')}
                          </span>
                          <Badge status={doc.verification_status} />
                        </div>
                        <span className="text-[11px] text-slate-500 mt-0.5 block">{doc.file_name}</span>
                        {doc.rejection_reason && (
                          <span className="text-rose-600 font-semibold block text-[11px] mt-1">
                            Reason: {doc.rejection_reason}
                          </span>
                        )}
                      </div>

                      {/* Allow re-upload if rejected or action_required */}
                      {(doc.verification_status === 'rejected' || isActionRequired) && (
                        <div>
                          <label className="cursor-pointer inline-flex items-center px-2.5 py-1.5 border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-50">
                            {uploadingDocId === doc.document_type ? (
                              <Icons.Spinner className="w-3.5 h-3.5" />
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
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
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
                  <span className="font-semibold text-slate-900">৳ {application.ownership_detail?.price_per_ownership?.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Discount</span>
                  <span className="font-semibold text-slate-900">৳ {application.ownership_detail?.discount_amount?.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-200">
                  <span className="font-bold text-slate-900">Total Price</span>
                  <span className="font-bold text-[#006B3E]">৳ {application.ownership_detail?.total_price?.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Booking Money Paid</span>
                  <span className="font-semibold text-slate-900">৳ {application.payment_detail?.booking_money?.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Remaining Balance</span>
                  <span className="font-semibold text-slate-900">৳ {application.payment_detail?.dues_amount?.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Installments</span>
                  <span className="font-semibold text-slate-900">
                    {application.payment_detail?.number_of_installments} x ৳ {application.payment_detail?.installment_amount?.toLocaleString('en-IN')} ({application.payment_detail?.installment_type})
                  </span>
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
                  <span className="font-semibold text-slate-900">{application.bank_detail?.account_number || '-'}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Modal: Customer Request Information Change */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Request Information Change"
        description="Submitted applications are locked for official record integrity. Explain what information you need to update, and Sunset Group administration will review and unlock your application."
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
            referenceNumber: application.reference_number || application.application_number || 'SKH-2026-00001',
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
    </DashboardShell>
  );
}

