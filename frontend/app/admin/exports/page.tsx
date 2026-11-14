'use client';

import React, { useEffect, useState } from 'react';
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
  const [selectedBiz, setSelectedBiz] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
      return;
    }

    async function loadBusinesses() {
      try {
        const list = await api.businesses.list().catch(() => []);
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

  const handleExportCsv = async () => {
    setIsExportingCsv(true);
    setStatusMsg(null);
    try {
      const blob = await api.exports.downloadApplicationsCsv({
        business_id: selectedBiz || undefined,
        status: selectedStatus || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
      triggerDownload(blob, `sunset_applications_${new Date().toISOString().split('T')[0]}.csv`);
      setStatusMsg({ type: 'success', text: 'CSV export downloaded successfully.' });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to download CSV export.' });
    } finally {
      setIsExportingCsv(false);
    }
  };

  const handleExportExcel = async () => {
    setIsExportingExcel(true);
    setStatusMsg(null);
    try {
      const blob = await api.exports.downloadApplicationsExcel({
        business_id: selectedBiz || undefined,
        status: selectedStatus || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
      triggerDownload(blob, `sunset_applications_${new Date().toISOString().split('T')[0]}.xlsx`);
      setStatusMsg({ type: 'success', text: 'Excel export downloaded successfully.' });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to download Excel export.' });
    } finally {
      setIsExportingExcel(false);
    }
  };

  return (
    <DashboardShell
      title="Data Export Center"
      subtitle="Generate audit-ready CSV and Excel spreadsheets of customer applications across Sunset divisions."
    >
      <div className="max-w-3xl space-y-6">
        {statusMsg && <Alert type={statusMsg.type}>{statusMsg.text}</Alert>}

        <Card title="Configure Dataset Filters" subtitle="Refine the records you want to include in the export.">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Business Division"
                value={selectedBiz}
                onChange={(e) => setSelectedBiz(e.target.value)}
                options={[
                  { value: '', label: 'All Divisions (Unified)' },
                  ...businesses.map((b) => ({ value: b.id, label: `${b.code} — ${b.name}` })),
                ]}
              />

              <Select
                label="Application Status"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                options={[
                  { value: '', label: 'All Statuses' },
                  { value: 'submitted', label: 'Submitted' },
                  { value: 'under_review', label: 'Under Review' },
                  { value: 'action_required', label: 'Action Required' },
                  { value: 'approved', label: 'Approved' },
                  { value: 'rejected', label: 'Rejected' },
                  { value: 'returned', label: 'Returned' },
                  { value: 'draft', label: 'Draft' },
                ]}
              />

              <Input
                label="From Date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />

              <Input
                label="To Date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
              <Button
                variant="primary"
                onClick={handleExportCsv}
                isLoading={isExportingCsv}
                leftIcon={<Icons.Download className="w-4 h-4" />}
                className="flex-1"
              >
                Download CSV Spreadsheet
              </Button>

              <Button
                variant="secondary"
                onClick={handleExportExcel}
                isLoading={isExportingExcel}
                leftIcon={<Icons.Download className="w-4 h-4" />}
                className="flex-1"
              >
                Download Excel (.xlsx) Report
              </Button>
            </div>
          </div>
        </Card>

        {/* Security & Audit notice */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1">
          <span className="font-bold text-slate-800 block">Security and Compliance Notice</span>
          <p>
            Exported spreadsheets contain customer personally identifiable information (PII) including national IDs, phone numbers, and financial details. Treat downloaded files as confidential and strictly in compliance with Sunset Group corporate governance.
          </p>
        </div>
      </div>
    </DashboardShell>
  );
}

