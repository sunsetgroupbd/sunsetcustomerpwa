'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Business } from '@/lib/types';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { Icons } from '@/components/ui/Icons';

export default function AdminExportsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [businesses, setBusinesses] = useState<Business[]>([]);

  // Application Export Filters
  const [appBiz, setAppBiz] = useState('');
  const [appStatus, setAppStatus] = useState('');
  const [appStartDate, setAppStartDate] = useState('');
  const [appEndDate, setAppEndDate] = useState('');

  // Customer Directory Filter
  const [custSearch, setCustSearch] = useState('');

  // Payment Ledger Filters
  const [payBiz, setPayBiz] = useState('');
  const [payStatus, setPayStatus] = useState('');
  const [payStartDate, setPayStartDate] = useState('');
  const [payEndDate, setPayEndDate] = useState('');

  // Loading States
  const [loadingExport, setLoadingExport] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || (user.role !== 'admin' && user.role !== 'subadmin'))) {
      router.push('/login');
      return;
    }

    async function loadBusinesses() {
      try {
        const res = await api.businesses.list().catch(() => []);
        const list = Array.isArray(res) ? res : ((res as any)?.items || (res as any)?.data || []);
        setBusinesses(list);
      } catch (err) {
        console.error('Failed to load businesses', err);
      }
    }
    if (user) {
      loadBusinesses();
    }
  }, [user, authLoading, router]);

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const getTodayStamp = () => new Date().toISOString().split('T')[0];

  // 1. Export Applications (CSV)
  const handleExportApplicationsCsv = async () => {
    setLoadingExport('app_csv');
    setStatusMsg(null);
    try {
      const blob = await api.exports.downloadApplicationsCsv({
        business_id: appBiz || undefined,
        status: appStatus || undefined,
        start_date: appStartDate || undefined,
        end_date: appEndDate || undefined,
      });
      const filename = `applications_export_${getTodayStamp()}.csv`;
      triggerDownload(blob, filename);
      setStatusMsg({ type: 'success', text: `Downloaded ${filename} successfully.` });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to download Applications CSV.' });
    } finally {
      setLoadingExport(null);
    }
  };

  // 2. Export Applications (Excel)
  const handleExportApplicationsExcel = async () => {
    setLoadingExport('app_excel');
    setStatusMsg(null);
    try {
      const blob = await api.exports.downloadApplicationsExcel({
        business_id: appBiz || undefined,
        status: appStatus || undefined,
        start_date: appStartDate || undefined,
        end_date: appEndDate || undefined,
      });
      const filename = `applications_report_${getTodayStamp()}.xlsx`;
      triggerDownload(blob, filename);
      setStatusMsg({ type: 'success', text: `Downloaded ${filename} successfully.` });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to download Applications Excel.' });
    } finally {
      setLoadingExport(null);
    }
  };

  // 3. Export Customer Directory (Excel)
  const handleExportCustomersExcel = async () => {
    setLoadingExport('cust_excel');
    setStatusMsg(null);
    try {
      const blob = await api.exports.downloadCustomersExcel(custSearch || undefined);
      const filename = `customers_directory_${getTodayStamp()}.xlsx`;
      triggerDownload(blob, filename);
      setStatusMsg({ type: 'success', text: `Downloaded ${filename} successfully.` });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to download Customer Directory.' });
    } finally {
      setLoadingExport(null);
    }
  };

  // 4. Export Payments Ledger (Excel)
  const handleExportPaymentsExcel = async () => {
    setLoadingExport('pay_excel');
    setStatusMsg(null);
    try {
      const blob = await api.exports.downloadPaymentsExcel({
        business_id: payBiz || undefined,
        payment_status: payStatus || undefined,
        start_date: payStartDate || undefined,
        end_date: payEndDate || undefined,
      });
      const filename = `payment_ledger_${getTodayStamp()}.xlsx`;
      triggerDownload(blob, filename);
      setStatusMsg({ type: 'success', text: `Downloaded ${filename} successfully.` });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to download Payment Ledger.' });
    } finally {
      setLoadingExport(null);
    }
  };

  // 5. Export CR Performance (Excel)
  const handleExportCrPerformanceExcel = async () => {
    setLoadingExport('cr_excel');
    setStatusMsg(null);
    try {
      const blob = await api.exports.downloadCrPerformanceExcel();
      const filename = `cr_performance_sla_${getTodayStamp()}.xlsx`;
      triggerDownload(blob, filename);
      setStatusMsg({ type: 'success', text: `Downloaded ${filename} successfully.` });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to download CR Performance Report.' });
    } finally {
      setLoadingExport(null);
    }
  };

  return (
    <DashboardShell
      title="Data Export Center"
      subtitle="Generate audit-ready spreadsheets of applications, customer accounts, and payment ledgers across Sunset divisions."
      actions={
        <Link href="/admin/dashboard">
          <Button variant="secondary" size="sm" className="flex items-center gap-1.5">
            <Icons.ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Button>
        </Link>
      }
    >
      <div className="max-w-5xl space-y-6">
        {statusMsg && (
          <Alert type={statusMsg.type} className="animate-in fade-in">
            {statusMsg.text}
          </Alert>
        )}

        {/* Quick Format Explainer Guide */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-xl flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-[#008751] flex items-center justify-center shrink-0 mt-0.5">
              <Icons.FileSpreadsheet className="w-5 h-5" />
            </div>
            <div className="text-xs text-emerald-950 space-y-1">
              <span className="font-bold text-emerald-900 block">Excel Format (.xlsx) — Recommended</span>
              <p className="text-slate-600 leading-relaxed">
                Includes formatted column headers, automated mathematical sums, currency symbols, and clean column widths. Ideal for printing, boardroom review, and tax audits.
              </p>
            </div>
          </div>

          <div className="p-4 bg-blue-50/70 border border-blue-200/80 rounded-xl flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
              <Icons.FileText className="w-5 h-5" />
            </div>
            <div className="text-xs text-blue-950 space-y-1">
              <span className="font-bold text-blue-900 block">CSV Format (.csv) — Raw Data</span>
              <p className="text-slate-600 leading-relaxed">
                Lightweight comma-separated table format. Best for importing directly into accounting tools, ERPs, CRM systems, or custom data warehouse scripts.
              </p>
            </div>
          </div>
        </div>

        {/* =========================================================================
            REPORT 1: CUSTOMER APPLICATIONS REPORT (PRIMARY)
            ========================================================================= */}
        <Card className="border-slate-200 shadow-xs">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-[#008751] flex items-center justify-center shrink-0">
                  <Icons.FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    1. Customer Applications Ledger
                  </h3>
                  <p className="text-xs text-slate-500">
                    Audit-ready master log of all customer investor applications with stage statuses and division allotments.
                  </p>
                </div>
              </div>
              <span className="self-start sm:self-auto text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                Primary Audit Log
              </span>
            </div>

            {/* Field Chips: What will be exported */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 text-xs">
              <span className="text-[11px] font-semibold text-slate-700 block mb-1.5 uppercase tracking-wider">
                Columns Included in this Export:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Application Ref #',
                  'Submission Date',
                  'Applicant Full Name',
                  'Mobile Phone',
                  'Email Address',
                  'Division (SKH / DFI / SG)',
                  'Package Type & Shares',
                  'Share Value (BDT)',
                  'Payment Status',
                  'Assigned CR Officer',
                  'Current Workflow Status',
                ].map((col) => (
                  <span
                    key={col}
                    className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-white border border-slate-200 text-slate-700"
                  >
                    {col}
                  </span>
                ))}
              </div>
            </div>

            {/* Mandatory Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              <Select
                label="Division Filter"
                value={appBiz}
                onChange={(e) => setAppBiz(e.target.value)}
                options={[
                  { value: '', label: 'All Divisions (Unified)' },
                  ...(Array.isArray(businesses) ? businesses : []).map((b) => ({
                    value: b.id,
                    label: `${b.code} — ${b.name}`,
                  })),
                ]}
              />

              <Select
                label="Application Status"
                value={appStatus}
                onChange={(e) => setAppStatus(e.target.value)}
                options={[
                  { value: '', label: 'All Statuses (Full Log)' },
                  { value: 'approved', label: 'Approved Only' },
                  { value: 'under_review', label: 'Under Review' },
                  { value: 'submitted', label: 'Submitted (New)' },
                  { value: 'action_required', label: 'Action Required' },
                  { value: 'correction_required', label: 'Correction Required' },
                  { value: 'rejected', label: 'Rejected' },
                  { value: 'draft', label: 'Draft' },
                ]}
              />

              <Input
                label="From Date"
                type="date"
                value={appStartDate}
                onChange={(e) => setAppStartDate(e.target.value)}
              />

              <Input
                label="To Date"
                type="date"
                value={appEndDate}
                onChange={(e) => setAppEndDate(e.target.value)}
              />
            </div>

            {/* Download Buttons */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportApplicationsCsv}
                isLoading={loadingExport === 'app_csv'}
                leftIcon={<Icons.Download className="w-4 h-4" />}
                className="w-full sm:w-auto"
              >
                Download CSV (.csv)
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={handleExportApplicationsExcel}
                isLoading={loadingExport === 'app_excel'}
                leftIcon={<Icons.Download className="w-4 h-4" />}
                className="w-full sm:w-auto"
              >
                Download Excel (.xlsx)
              </Button>
            </div>
          </div>
        </Card>

        {/* =========================================================================
            REPORT 2: APPROVED CUSTOMERS MASTER DIRECTORY
            ========================================================================= */}
        <Card className="border-slate-200 shadow-xs">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <Icons.Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    2. Approved Customers Master Directory
                  </h3>
                  <p className="text-xs text-slate-500">
                    Allotted customer registry of verified shareholders with assigned Customer ID numbers and contact records.
                  </p>
                </div>
              </div>
              <span className="self-start sm:self-auto text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                Investor Directory
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 text-xs">
              <span className="text-[11px] font-semibold text-slate-700 block mb-1.5 uppercase tracking-wider">
                Columns Included in this Export:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Customer ID Number',
                  'Investor Full Name',
                  'Mobile Phone',
                  'Email Address',
                  'Residential Address',
                  'District & Division',
                  'Verification Status',
                  'Account Creation Date',
                ].map((col) => (
                  <span
                    key={col}
                    className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-white border border-slate-200 text-slate-700"
                  >
                    {col}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-end gap-3 pt-1">
              <div className="flex-1 w-full">
                <Input
                  label="Optional Search Filter"
                  placeholder="Filter by Name, Mobile, or Customer ID..."
                  value={custSearch}
                  onChange={(e) => setCustSearch(e.target.value)}
                />
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={handleExportCustomersExcel}
                isLoading={loadingExport === 'cust_excel'}
                leftIcon={<Icons.Download className="w-4 h-4" />}
                className="w-full sm:w-auto shrink-0"
              >
                Download Customer Directory (.xlsx)
              </Button>
            </div>
          </div>
        </Card>

        {/* =========================================================================
            REPORT 3 & 4 IN TWO COLUMNS: FINANCIAL LEDGER & TEAM PERFORMANCE
            ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Report 3: Payment & Accounting Ledger */}
          <Card className="border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                  <Icons.FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    3. Payment & Collections Ledger
                  </h3>
                  <p className="text-xs text-slate-500">
                    Financial audit log of share purchases, payment slips, and verification notes.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 text-xs">
                <span className="text-[11px] font-semibold text-slate-700 block mb-1.5 uppercase tracking-wider">
                  Columns Included:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Application Ref #',
                    'Applicant Name',
                    'Division',
                    'Share Value (BDT)',
                    'Payment Status',
                    'Bank Name',
                    'Transaction Ref',
                  ].map((col) => (
                    <span
                      key={col}
                      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-white border border-slate-200 text-slate-700"
                    >
                      {col}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <Select
                  label="Division"
                  value={payBiz}
                  onChange={(e) => setPayBiz(e.target.value)}
                  options={[
                    { value: '', label: 'All Divisions' },
                    ...(Array.isArray(businesses) ? businesses : []).map((b) => ({
                      value: b.id,
                      label: b.code,
                    })),
                  ]}
                />

                <Select
                  label="Payment Status"
                  value={payStatus}
                  onChange={(e) => setPayStatus(e.target.value)}
                  options={[
                    { value: '', label: 'All Payments' },
                    { value: 'verified', label: 'Verified Only' },
                    { value: 'pending', label: 'Pending' },
                  ]}
                />
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPaymentsExcel}
                isLoading={loadingExport === 'pay_excel'}
                leftIcon={<Icons.Download className="w-4 h-4" />}
                className="w-full sm:w-auto"
              >
                Download Payment Ledger (.xlsx)
              </Button>
            </div>
          </Card>

          {/* Report 4: CR Team Verification & Performance SLA */}
          <Card className="border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <Icons.Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    4. CR Team Verification SLA
                  </h3>
                  <p className="text-xs text-slate-500">
                    Throughput and review volume breakdown per Customer Relations team member.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 text-xs">
                <span className="text-[11px] font-semibold text-slate-700 block mb-1.5 uppercase tracking-wider">
                  Columns Included:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'CR Officer Name',
                    'Employee ID',
                    'Mobile & Email',
                    'Total Assigned',
                    'Pending Review',
                    'Approved Applications',
                    'Rejected Count',
                  ].map((col) => (
                    <span
                      key={col}
                      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-white border border-slate-200 text-slate-700"
                    >
                      {col}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-amber-50/60 border border-amber-200/60 rounded-xl text-xs text-amber-900 leading-relaxed">
                <span className="font-semibold block mb-0.5">Automated Team Audit</span>
                Aggregates live verification performance for all active CR officers without requiring manual date calculation.
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCrPerformanceExcel}
                isLoading={loadingExport === 'cr_excel'}
                leftIcon={<Icons.Download className="w-4 h-4" />}
                className="w-full sm:w-auto"
              >
                Download Team SLA Report (.xlsx)
              </Button>
            </div>
          </Card>
        </div>

        {/* Compliance and Data Privacy Notice */}
        <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl flex items-start gap-3 text-xs text-slate-600">
          <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
            <Icons.CheckCircle className="w-3.5 h-3.5" />
          </div>
          <div className="space-y-1">
            <span className="font-bold text-slate-900 block">
              Audit Compliance & Privacy Protection
            </span>
            <p className="leading-relaxed">
              Exported spreadsheets contain customer personally identifiable information (PII) including national IDs, phone numbers, and share allotment values. All export actions are logged with timestamp and user ID in the system audit log.
            </p>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
