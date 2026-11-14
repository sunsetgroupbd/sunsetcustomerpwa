'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Application } from '@/lib/types';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Icons } from '@/components/ui/Icons';

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

  const loadData = async () => {
    try {
      const app = await api.applications.get(resolvedParams.id);
      setApplication(app);
    } catch (err: any) {
      setError(err.message || 'Failed to find application.');
    } finally {
      setIsLoading(false);
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

  return (
    <DashboardShell
      title={`Application ${application.reference_number}`}
      subtitle={`${application.business?.name || 'Sunset Division'} • Submitted on ${
        application.submission_date ? new Date(application.submission_date).toLocaleDateString() : 'Draft'
      }`}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()} leftIcon={<Icons.Download className="w-4 h-4" />}>
            Print Record
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
            <div className="flex items-center gap-2.5 mt-1">
              <Badge status={application.status} className="text-sm px-3 py-1" />
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
    </DashboardShell>
  );
}

