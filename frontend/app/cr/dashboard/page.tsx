'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Application, Business } from '@/lib/types';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icons';
import { openSmsWithCredentials } from '@/lib/sms';
import { NotificationBell } from '@/components/layout/NotificationBell';

type QueueTab = 'all' | 'pending_sales' | 'submitted' | 'approved';

export default function CrDashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [applications, setApplications] = useState<Application[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<QueueTab>('all');
  const [selectedDivision, setSelectedDivision] = useState('');

  const loadData = async (searchTerm = search, division = selectedDivision) => {
    setIsLoading(true);
    try {
      const [appRes, bizRes] = await Promise.all([
        api.applications.list({
          search: searchTerm.trim() || undefined,
          business_id: division || undefined,
          limit: 100,
        }),
        api.businesses.list().catch(() => []),
      ]);
      const apps = Array.isArray(appRes) ? appRes : ((appRes as any)?.items || (appRes as any)?.data || []);
      setApplications(apps);
      setBusinesses(bizRes);
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
  }, [user, authLoading, router]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData(search, selectedDivision);
  };

  const handleResetFilters = () => {
    setSearch('');
    setSelectedDivision('');
    loadData('', '');
  };

  // Applications filtered by division (for metric tabs and list)
  const divisionApps = useMemo(() => {
    if (!selectedDivision) return applications;
    return applications.filter((app) => {
      const matchesId = String(app.business_id) === String(selectedDivision);
      const matchesCode =
        (app.business_code && String(app.business_code).toUpperCase() === String(selectedDivision).toUpperCase()) ||
        (app.business?.code && String(app.business?.code).toUpperCase() === String(selectedDivision).toUpperCase());
      const matchesBizId = app.business?.id && String(app.business.id) === String(selectedDivision);
      return matchesId || matchesCode || matchesBizId;
    });
  }, [applications, selectedDivision]);

  // Filter applications by tab, division, and live search query
  const filteredApps = useMemo(() => {
    return divisionApps.filter((app) => {
      // Tab filter
      if (activeTab === 'pending_sales') {
        // Pending draft forms registered by sales executives that CR needs to fill
        return app.status === 'draft';
      }
      if (activeTab === 'submitted') {
        return app.status === 'submitted';
      }
      if (activeTab === 'approved') {
        return app.status === 'approved' || app.status === 'under_review';
      }

      // Live search filter across phone, name, application number, NID, Customer ID
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const clientName = (app.customer_name || app.applicant_info?.full_name_en || app.applicant_info?.full_name_bn || '').toLowerCase();
        const clientPhone = (app.customer_phone || app.applicant_info?.mobile_number || app.applicant_info?.phone_number || '').toLowerCase();
        const refNum = (app.reference_number || (app as any).application_number || '').toLowerCase();
        const custId = (app.customer_id_number || '').toLowerCase();
        const nid = (app.applicant_info?.nid_or_passport || (app.applicant_info as any)?.nid_number || '').toLowerCase();

        const matches =
          clientName.includes(q) ||
          clientPhone.includes(q) ||
          refNum.includes(q) ||
          custId.includes(q) ||
          nid.includes(q);

        if (!matches) {
          return false;
        }
      }

      return true;
    });
  }, [divisionApps, activeTab, search]);

  // Tab counts
  const pendingCount = divisionApps.filter((a) => a.status === 'draft').length;
  const submittedCount = divisionApps.filter((a) => a.status === 'submitted').length;
  const approvedCount = divisionApps.filter((a) => a.status === 'approved' || a.status === 'under_review').length;

  return (
    <DashboardShell
      title="Customer Relations Desk"
      subtitle="Find customer accounts registered by Sales Executives, complete application forms, and verify submitted applications."
      actions={
        <div className="flex items-center gap-2">
          <NotificationBell />
        </div>
      }
    >
      <div className="space-y-6">
        {/* Metric / Tab Quick-Switcher */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={() => setActiveTab('all')}
            className={`p-3 rounded-xl border text-left transition-all ${
              activeTab === 'all'
                ? 'bg-emerald-50/70 border-[#008751] ring-1 ring-[#008751] shadow-sm'
                : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span className="text-[11px] font-semibold text-slate-500 uppercase block">All</span>
            <span className="text-xl font-bold text-slate-900 mt-0.5 block">{applications.length}</span>
            <span className="text-[10px] text-slate-500">Applications</span>
          </button>

          <button
            onClick={() => setActiveTab('pending_sales')}
            className={`p-3 rounded-xl border text-left transition-all ${
              activeTab === 'pending_sales'
                ? 'bg-amber-50/70 border-amber-500 ring-1 ring-amber-500 shadow-sm'
                : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-amber-800 uppercase block">Pending</span>
              {pendingCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              )}
            </div>
            <span className="text-xl font-bold text-amber-900 mt-0.5 block">{pendingCount}</span>
            <span className="text-[10px] text-amber-700">To Fill Form</span>
          </button>

          <button
            onClick={() => setActiveTab('submitted')}
            className={`p-3 rounded-xl border text-left transition-all ${
              activeTab === 'submitted'
                ? 'bg-blue-50/70 border-blue-500 ring-1 ring-blue-500 shadow-sm'
                : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span className="text-[11px] font-semibold text-blue-800 uppercase block">Submitted</span>
            <span className="text-xl font-bold text-blue-900 mt-0.5 block">{submittedCount}</span>
            <span className="text-[10px] text-blue-700">Admin Review</span>
          </button>

          <button
            onClick={() => setActiveTab('approved')}
            className={`p-3 rounded-xl border text-left transition-all ${
              activeTab === 'approved'
                ? 'bg-emerald-50/70 border-[#008751] ring-1 ring-[#008751] shadow-sm'
                : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span className="text-[11px] font-semibold text-emerald-800 uppercase block">Approved</span>
            <span className="text-xl font-bold text-[#008751] mt-0.5 block">{approvedCount}</span>
            <span className="text-[10px] text-emerald-700">Verified</span>
          </button>
        </div>

        {/* Customer Phone Search & Division Filter */}
        <Card className="p-4">
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Find customer by mobile phone number (e.g. 017...), client name, or reference ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 bg-white text-slate-900 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#008751]/30 placeholder:text-slate-400"
              />
              <Icons.Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-2.5 p-0.5 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                  title="Clear search"
                >
                  <Icons.X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <select
              value={selectedDivision}
              onChange={(e) => {
                const newDiv = e.target.value;
                setSelectedDivision(newDiv);
              }}
              className="px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#008751]/30"
            >
              <option value="">All Business Divisions</option>
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code} &mdash; {b.name}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-2">
              <Button type="submit" variant="primary" size="sm" className="bg-[#008751] hover:bg-[#007043] shrink-0">
                Find Customer
              </Button>
              {(search || selectedDivision) && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResetFilters}
                  className="shrink-0 text-xs border-slate-300 text-slate-600 hover:bg-slate-50"
                >
                  Reset
                </Button>
              )}
            </div>
          </form>
        </Card>

        {/* Applications Queue Table */}
        <Card
          title="Customer Application Queue"
          subtitle={`Showing ${filteredApps.length} customer application files (${activeTab === 'pending_sales' ? 'Pending CR form completion' : activeTab === 'submitted' ? 'Submitted files' : 'Active records'})`}
        >
          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-500">
              <Icons.Spinner className="w-6 h-6 text-[#008751] mx-auto mb-2" />
              Loading customer applications...
            </div>
          ) : filteredApps.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-500">
              <Icons.Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              No customer applications found matching your criteria.
            </div>
          ) : (
            <div>
              {/* Mobile Card Queue View */}
              <div className="md:hidden divide-y divide-slate-100">
                {filteredApps.map((app, index) => {
                  const clientName = app.customer_name || app.applicant_info?.full_name_en || 'Registered Customer';
                  const clientPhone = app.customer_phone || app.applicant_info?.mobile_number || '-';
                  const isPending = app.status === 'draft';
                  const isSubmitted = app.status === 'submitted';

                  return (
                    <div
                      key={app.id}
                      className="py-4 hover:bg-slate-50/80 transition-colors space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-slate-400 text-xs font-semibold">#{index + 1}</span>
                          <span className="font-mono font-bold text-xs text-slate-900">
                            {app.reference_number}
                          </span>
                          <span className="text-[10px] font-bold text-[#008751] bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                            {app.business_code || app.business?.code || 'SG'}
                          </span>
                        </div>
                        {isPending ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                            <Icons.Clock className="w-3 h-3 text-amber-600" />
                            Pending (To Fill)
                          </span>
                        ) : isSubmitted ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-300">
                            <Icons.CheckCircle className="w-3 h-3 text-blue-600" />
                            Submitted
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 capitalize">
                            {app.status}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-slate-900">{clientName}</h4>
                        <span className="font-mono font-semibold text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                          {clientPhone}
                        </span>
                      </div>

                      {/* Sales Executive info */}
                      {(app.sales_agent_name || app.sales_agent_employee_id) && (
                        <div className="text-[11px] text-slate-500 bg-slate-50 px-2.5 py-1 rounded border border-slate-200/70 flex items-center justify-between">
                          <span>
                            Agent: <strong>{app.sales_agent_name}</strong>
                          </span>
                          {app.sales_agent_employee_id && (
                            <span className="font-mono font-medium text-slate-600">
                              ID: {app.sales_agent_employee_id}
                            </span>
                          )}
                        </div>
                      )}

                      {clientPhone && clientPhone !== '-' && (
                        <button
                          type="button"
                          onClick={() =>
                            openSmsWithCredentials({
                              phone: clientPhone,
                              customerName: clientName,
                              tempPassword: 'Sunset@123',
                              referenceNumber: app.reference_number,
                              businessCode: app.business_code || app.business?.code,
                            })
                          }
                          className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-[#008751] font-bold text-xs rounded-lg border border-emerald-200 transition-colors"
                        >
                          <Icons.MessageSquare className="w-3.5 h-3.5" />
                          <span>SMS Credentials</span>
                        </button>
                      )}

                      <div className="pt-2 flex items-center justify-between gap-2">
                        {isPending || app.is_edit_unlocked ? (
                          <Link href={`/customer/apply?application_id=${app.id}`} className="flex-1">
                            <Button
                              variant="primary"
                              size="sm"
                              className="w-full bg-[#008751] hover:bg-[#007043] text-xs font-bold justify-center flex items-center gap-1 py-2"
                            >
                              <Icons.Edit className="w-3.5 h-3.5" />
                              <span>Fill Form</span>
                            </Button>
                          </Link>
                        ) : null}
                        <Link href={`/cr/applications/${app.id}`} className={isPending ? 'flex-1' : 'w-full'}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-xs font-semibold justify-center text-slate-700 py-2"
                          >
                            Review
                          </Button>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-y border-slate-200">
                    <tr>
                      <th className="py-3 px-3 text-center w-12 font-mono">#</th>
                      <th className="py-3 px-4">Ref Number</th>
                      <th className="py-3 px-4">Customer / Applicant</th>
                      <th className="py-3 px-4">Customer Phone</th>
                      <th className="py-3 px-4">Division</th>
                      <th className="py-3 px-4">Registered by Sales</th>
                      <th className="py-3 px-4">Application Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredApps.map((app, index) => {
                      const clientName = app.customer_name || app.applicant_info?.full_name_en || 'Registered Customer';
                      const clientPhone = app.customer_phone || app.applicant_info?.mobile_number || '-';
                      const isPending = app.status === 'draft';
                      const isSubmitted = app.status === 'submitted';

                      return (
                        <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 text-center font-mono text-slate-500 font-semibold">
                            {index + 1}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">
                            {app.reference_number}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{clientName}</div>
                          </td>
                          <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                            {clientPhone}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-700">
                            <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[11px] font-bold">
                              {app.business_code || app.business?.code || 'SKH'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {app.sales_agent_name ? (
                              <div>
                                <span className="font-semibold text-slate-800">{app.sales_agent_name}</span>
                                {app.sales_agent_employee_id && (
                                  <div className="text-[10px] text-slate-500 font-mono">
                                    ID: {app.sales_agent_employee_id}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Self / Online</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {isPending ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300">
                                <Icons.Clock className="w-3.5 h-3.5 text-amber-600" />
                                Pending (CR to Fill)
                              </span>
                            ) : isSubmitted ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-300">
                                <Icons.CheckCircle className="w-3.5 h-3.5 text-blue-600" />
                                Application Submitted
                              </span>
                            ) : app.status === 'approved' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                                <Icons.CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                Approved
                              </span>
                            ) : app.status === 'under_review' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-800 border border-indigo-300">
                                Under Review
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 capitalize">
                                {app.status}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {clientPhone && clientPhone !== '-' && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    openSmsWithCredentials({
                                      phone: clientPhone,
                                      customerName: clientName,
                                      tempPassword: 'Sunset@123',
                                      referenceNumber: app.reference_number,
                                      businessCode: app.business_code || app.business?.code,
                                    })
                                  }
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#008751] bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 transition-colors"
                                  title="SMS Credentials to Customer"
                                >
                                  <Icons.MessageSquare className="w-3.5 h-3.5" />
                                  <span>SMS</span>
                                </button>
                              )}
                              {isPending || app.is_edit_unlocked ? (
                                <Link href={`/customer/apply?application_id=${app.id}`}>
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    className="bg-[#008751] hover:bg-[#007043] text-xs font-bold flex items-center gap-1"
                                  >
                                    <Icons.Edit className="w-3.5 h-3.5" />
                                    <span>Fill Form</span>
                                  </Button>
                                </Link>
                              ) : null}
                              <Link href={`/cr/applications/${app.id}`}>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-slate-700 hover:border-slate-400 text-xs font-semibold"
                                >
                                  Review
                                </Button>
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Card>
      </div>
    </DashboardShell>
  );
}
