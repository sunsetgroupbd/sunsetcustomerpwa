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
      const filename = `applications_${getTodayStamp()}.csv`;
      triggerDownload(blob, filename);
      setStatusMsg({ type: 'success', text: `Downloaded ${filename}` });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to download CSV.' });
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
      const filename = `applications_${getTodayStamp()}.xlsx`;
      triggerDownload(blob, filename);
      setStatusMsg({ type: 'success', text: `Downloaded ${filename}` });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to download Excel.' });
    } finally {
      setLoadingExport(null);
    }
  };

  // 3. Export Customer Directory (Excel)
  const handleExportCustomersExcel = async () => {
    setLoadingExport('cust_excel');
    setStatusMsg(null);
    try {
      const blob = await api.exports.downloadCustomersExcel();
      const filename = `customers_${getTodayStamp()}.xlsx`;
      triggerDownload(blob, filename);
      setStatusMsg({ type: 'success', text: `Downloaded ${filename}` });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to download Customers.' });
    } finally {
      setLoadingExport(null);
    }
  };

  // 4. Export Payments Ledger (Excel)
  const handleExportPaymentsExcel = async () => {
    setLoadingExport('pay_excel');
    setStatusMsg(null);
    try {
      const blob = await api.exports.downloadPaymentsExcel();
      const filename = `payments_${getTodayStamp()}.xlsx`;
      triggerDownload(blob, filename);
      setStatusMsg({ type: 'success', text: `Downloaded ${filename}` });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to download Payments.' });
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
      const filename = `cr_performance_${getTodayStamp()}.xlsx`;
      triggerDownload(blob, filename);
      setStatusMsg({ type: 'success', text: `Downloaded ${filename}` });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to download CR Performance.' });
    } finally {
      setLoadingExport(null);
    }
  };

  return (
    <DashboardShell
      title="Export Center"
      subtitle="Download applications, customer lists, and financial reports."
      actions={
        <Link href="/admin/dashboard">
          <Button variant="secondary" size="sm" className="flex items-center gap-1.5">
            <Icons.ArrowLeft className="w-4 h-4" />
            <span>Dashboard</span>
          </Button>
        </Link>
      }
    >
      <div className="max-w-4xl space-y-5">
        {statusMsg && (
          <Alert type={statusMsg.type} className="animate-in fade-in">
            {statusMsg.text}
          </Alert>
        )}

        {/* 1. Primary: Applications Report */}
        <Card className="border-slate-200 shadow-xs">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Icons.FileSpreadsheet className="w-4 h-4 text-[#008751]" />
                Applications Report
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Download investor applications with applicant details, package, and status.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Select
                label="Division"
                value={appBiz}
                onChange={(e) => setAppBiz(e.target.value)}
                options={[
                  { value: '', label: 'All Divisions' },
                  ...(Array.isArray(businesses) ? businesses : []).map((b) => ({
                    value: b.id,
                    label: b.code ? `${b.code} - ${b.name}` : b.name,
                  })),
                ]}
              />

              <Select
                label="Status"
                value={appStatus}
                onChange={(e) => setAppStatus(e.target.value)}
                options={[
                  { value: '', label: 'All Statuses' },
                  { value: 'approved', label: 'Approved' },
                  { value: 'under_review', label: 'Under Review' },
                  { value: 'submitted', label: 'Submitted' },
                  { value: 'action_required', label: 'Action Required' },
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

            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportApplicationsCsv}
                isLoading={loadingExport === 'app_csv'}
                leftIcon={<Icons.Download className="w-4 h-4" />}
              >
                Download CSV
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={handleExportApplicationsExcel}
                isLoading={loadingExport === 'app_excel'}
                leftIcon={<Icons.Download className="w-4 h-4" />}
              >
                Download Excel (.xlsx)
              </Button>
            </div>
          </div>
        </Card>

        {/* 2. Quick Direct Reports Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Customer Directory */}
          <Card className="border-slate-200 shadow-xs flex flex-col justify-between p-4">
            <div className="space-y-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                <Icons.Users className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Customer Directory</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Approved customers with Customer ID, phone, and district.
                </p>
              </div>
            </div>

            <div className="pt-3 mt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCustomersExcel}
                isLoading={loadingExport === 'cust_excel'}
                leftIcon={<Icons.Download className="w-4 h-4" />}
                className="w-full text-xs"
              >
                Download Excel
              </Button>
            </div>
          </Card>

          {/* Payment Ledger */}
          <Card className="border-slate-200 shadow-xs flex flex-col justify-between p-4">
            <div className="space-y-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#008751] flex items-center justify-center">
                <Icons.FileSpreadsheet className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Payment Ledger</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Share purchases, amounts, and bank transaction slips.
                </p>
              </div>
            </div>

            <div className="pt-3 mt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPaymentsExcel}
                isLoading={loadingExport === 'pay_excel'}
                leftIcon={<Icons.Download className="w-4 h-4" />}
                className="w-full text-xs"
              >
                Download Excel
              </Button>
            </div>
          </Card>

          {/* CR Performance */}
          <Card className="border-slate-200 shadow-xs flex flex-col justify-between p-4">
            <div className="space-y-2">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                <Icons.Users className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">CR Performance</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Application review volume and approvals per officer.
                </p>
              </div>
            </div>

            <div className="pt-3 mt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCrPerformanceExcel}
                isLoading={loadingExport === 'cr_excel'}
                leftIcon={<Icons.Download className="w-4 h-4" />}
                className="w-full text-xs"
              >
                Download Excel
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
