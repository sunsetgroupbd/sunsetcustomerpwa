'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Application, Business } from '@/lib/types';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';
import { Icons } from '@/components/ui/Icons';

export default function CrDashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [applications, setApplications] = useState<Application[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // On-Behalf Modal state
  const [isOnBehalfOpen, setIsOnBehalfOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedBizId, setSelectedBizId] = useState('');
  const [isCreatingOnBehalf, setIsCreatingOnBehalf] = useState(false);
  const [onBehalfError, setOnBehalfError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [appRes, bizRes] = await Promise.all([
        api.applications.list({
          status: statusFilter || undefined,
          search: search || undefined,
        }),
        api.businesses.list().catch(() => []),
      ]);
      const apps = Array.isArray(appRes) ? appRes : ((appRes as any)?.items || (appRes as any)?.data || []);
      setApplications(apps);
      setBusinesses(bizRes);
      if (bizRes.length > 0 && !selectedBizId) {
        setSelectedBizId(bizRes[0].id);
      }
    } catch (err) {
      console.error('Failed to load CR queue', err);
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
  }, [user, authLoading, statusFilter, router]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleCreateOnBehalf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerPhone.trim() || !customerName.trim() || !selectedBizId) {
      setOnBehalfError('Please provide customer name, phone number, and division.');
      return;
    }

    setIsCreatingOnBehalf(true);
    setOnBehalfError(null);
    try {
      const app = await api.cr.createOnBehalf({
        customer_phone: customerPhone.trim(),
        customer_name: customerName.trim(),
        business_id: selectedBizId,
      });
      setIsOnBehalfOpen(false);
      router.push(`/cr/applications/${app.id}`);
    } catch (err: any) {
      setOnBehalfError(err.message || 'Failed to create application on behalf of customer.');
    } finally {
      setIsCreatingOnBehalf(false);
    }
  };

  return (
    <DashboardShell
      title="Customer Relations Desk"
      subtitle="Verify customer documents, process applications, and resolve correction requests."
      actions={
        <Button
          variant="primary"
          onClick={() => setIsOnBehalfOpen(true)}
          leftIcon={<Icons.Plus className="w-4 h-4" />}
        >
          Register on Behalf
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Search & Filter Bar */}
        <Card className="p-4">
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search by reference, name, or phone number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#006B3E]/30"
              />
              <Icons.Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#006B3E]/30"
            >
              <option value="">All Statuses</option>
              <option value="submitted">Submitted</option>
              <option value="under_review">Under Review</option>
              <option value="action_required">Action Required</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="returned">Returned</option>
            </select>

            <Button type="submit" variant="secondary" size="sm">
              Filter
            </Button>
          </form>
        </Card>

        {/* Applications Queue Table */}
        <Card
          title="Applications Queue"
          subtitle={`Showing ${applications.length} applications matching criteria`}
        >
          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-500">
              <Icons.Spinner className="w-6 h-6 text-[#006B3E] mx-auto mb-2" />
              Loading applications...
            </div>
          ) : applications.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-500">
              No applications found matching your criteria.
            </div>
          ) : (
            <div>
              {/* Mobile Card Queue View */}
              <div className="md:hidden divide-y divide-slate-100">
                {applications.map((app) => (
                  <Link
                    key={app.id}
                    href={`/cr/applications/${app.id}`}
                    className="py-3.5 block hover:bg-slate-50 active:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-slate-900">
                          {app.reference_number}
                        </span>
                        <span className="text-[10px] font-bold text-[#006B3E] bg-[#006B3E]/10 px-1.5 py-0.5 rounded">
                          {app.business?.code || 'SKH'}
                        </span>
                      </div>
                      <Badge status={app.status} />
                    </div>
                    <h4 className="text-sm font-semibold text-slate-800">
                      {app.applicant_info?.full_name_en || 'Pending Draft'}
                    </h4>
                    <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
                      <span>Phone: {app.applicant_info?.mobile_number || '-'}</span>
                      <span className="text-slate-400">
                        {app.submission_date ? new Date(app.submission_date).toLocaleDateString() : 'Draft'}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-y border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Ref Number</th>
                      <th className="py-3 px-4">Applicant</th>
                      <th className="py-3 px-4">Phone</th>
                      <th className="py-3 px-4">Division</th>
                      <th className="py-3 px-4">Package</th>
                      <th className="py-3 px-4">Submission Date</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {applications.map((app) => (
                      <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {app.reference_number}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800">
                          {app.applicant_info?.full_name_en || 'Pending Draft'}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {app.applicant_info?.mobile_number || '-'}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-700">
                          {app.business?.code || 'SKH'}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {app.ownership_detail?.package_type || 'Silver'}
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {app.submission_date ? new Date(app.submission_date).toLocaleDateString() : 'Draft'}
                        </td>
                        <td className="py-3 px-4">
                          <Badge status={app.status} />
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link href={`/cr/applications/${app.id}`}>
                            <Button variant="outline" size="sm" className="text-[#006B3E] hover:border-[#006B3E]">
                              Review / Verify
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Modal: Create Application on Behalf */}
      <Modal
        isOpen={isOnBehalfOpen}
        onClose={() => setIsOnBehalfOpen(false)}
        title="Create Application on Behalf of Customer"
        description="Register a walk-in or offline customer and initialize their multi-step application."
      >
        <form onSubmit={handleCreateOnBehalf} className="space-y-4">
          {onBehalfError && <Alert type="error">{onBehalfError}</Alert>}

          <Input
            label="Customer Full Name"
            required
            placeholder="e.g. Zahid Hasan"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />

          <Input
            label="Customer Mobile Phone"
            required
            type="tel"
            placeholder="017XXXXXXXX"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
          />

          <Select
            label="Target Business Division"
            required
            value={selectedBizId}
            onChange={(e) => setSelectedBizId(e.target.value)}
            options={businesses.map((b) => ({ value: b.id, label: `${b.code} — ${b.name}` }))}
          />

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => setIsOnBehalfOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isCreatingOnBehalf}>
              Initialize Form
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardShell>
  );
}

