'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Application, DashboardStats, User } from '@/lib/types';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Alert } from '@/components/ui/Alert';
import { Icons } from '@/components/ui/Icons';

function AdminDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTab = searchParams ? searchParams.get('tab') : null;
  const isApplicationsTab = currentTab === 'applications';

  const { user, isLoading: authLoading } = useAuth();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [crEmployees, setCrEmployees] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters for Applications view
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [businessFilter, setBusinessFilter] = useState('');

  // Assign CR modal
  const [assigningApp, setAssigningApp] = useState<Application | null>(null);
  const [selectedCrId, setSelectedCrId] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      if (isApplicationsTab) {
        const [appsData, crList] = await Promise.all([
          api.applications.list({
            search: searchTerm || undefined,
            status: statusFilter || undefined,
            business_id: businessFilter || undefined,
            limit: 50,
          }).catch(() => ({ items: [], total: 0 })),
          api.admin.crTeam().catch(() => []),
        ]);
        const apps = Array.isArray(appsData) ? appsData : ((appsData as any)?.items || (appsData as any)?.data || []);
        setApplications(apps);
        setCrEmployees(crList);
        if (crList.length > 0 && !selectedCrId) {
          setSelectedCrId(crList[0].id);
        }
      } else {
        const [statsData, appsData, crList] = await Promise.all([
          api.admin.stats().catch(() => null),
          api.applications.list({ limit: 10 }).catch(() => ({ items: [], total: 0 })),
          api.admin.crTeam().catch(() => []),
        ]);

        if (statsData) setStats(statsData);
        const apps = Array.isArray(appsData) ? appsData : ((appsData as any)?.items || (appsData as any)?.data || []);
        setApplications(apps);
        setCrEmployees(crList);
        if (crList.length > 0 && !selectedCrId) {
          setSelectedCrId(crList[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load admin data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
      return;
    }
    if (user) {
      loadData();
    }
  }, [user, authLoading, isApplicationsTab, statusFilter, businessFilter, router]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleAssignCr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningApp || !selectedCrId) return;

    setIsAssigning(true);
    try {
      await api.applications.assignCr(assigningApp.id, selectedCrId);
      setAssigningApp(null);
      setStatusMsg({ type: 'success', text: `Assigned officer to ${assigningApp.reference_number}` });
      loadData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to assign CR officer' });
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <DashboardShell
      title={isApplicationsTab ? "Applications Master Directory" : "Executive Admin Dashboard"}
      subtitle={
        isApplicationsTab
          ? "Search, inspect, and manage customer applications across all Sunset Group divisions."
          : "Real-time monitoring and analytics across all Sunset Group business divisions."
      }
      actions={
        <div className="flex items-center gap-2">
          {isApplicationsTab ? (
            <Link href="/admin/dashboard">
              <Button variant="outline" size="sm" className="flex items-center gap-1.5">
                <Icons.Building className="w-4 h-4" />
                <span>Overview Dashboard</span>
              </Button>
            </Link>
          ) : (
            <Link href="/admin/dashboard?tab=applications">
              <Button variant="outline" size="sm" className="flex items-center gap-1.5">
                <Icons.FileText className="w-4 h-4" />
                <span>All Applications</span>
              </Button>
            </Link>
          )}
          <Link href="/admin/exports">
            <Button variant="outline" size="sm" className="flex items-center gap-1.5">
              <Icons.Download className="w-4 h-4" />
              <span>Export Center</span>
            </Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {statusMsg && <Alert type={statusMsg.type}>{statusMsg.text}</Alert>}

        {/* ---------------- APPLICATIONS MASTER VIEW ---------------- */}
        {isApplicationsTab ? (
          <div className="space-y-6">
            {/* Filter and Search Bar */}
            <Card className="p-4">
              <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="Search by reference number, applicant name, or mobile..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#008751]/30"
                  />
                  <Icons.Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#008751]/30 font-medium"
                >
                  <option value="">All Statuses</option>
                  <option value="under_review">Under Review</option>
                  <option value="submitted">Submitted</option>
                  <option value="action_required">Action / Documents Required</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="draft">Draft</option>
                </select>

                <Button type="submit" variant="primary" size="sm">
                  Search
                </Button>
              </form>
            </Card>

            {/* Applications Table */}
            <Card
              title="All Registered Applications"
              subtitle={`Showing ${applications.length} applications matching current filters`}
              action={
                <Button variant="ghost" size="sm" onClick={loadData}>
                  <Icons.Clock className="w-4 h-4 mr-1.5" /> Refresh
                </Button>
              }
            >
              {isLoading ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  <Icons.Spinner className="w-6 h-6 text-[#008751] mx-auto mb-2" />
                  Loading applications...
                </div>
              ) : applications.length === 0 ? (
                <div className="text-center py-12 text-xs text-slate-500">
                  <Icons.FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  No applications found matching your criteria.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-y border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Reference No.</th>
                        <th className="py-3 px-4">Applicant</th>
                        <th className="py-3 px-4">Division</th>
                        <th className="py-3 px-4">Package</th>
                        <th className="py-3 px-4">Assigned CR</th>
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
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900">
                              {app.applicant_info?.full_name_en || 'Pending Name'}
                            </div>
                            <div className="text-[11px] font-mono text-slate-500">
                              {app.applicant_info?.mobile_number || (app as any).customer_phone || '-'}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-700">
                            {app.business?.code || (app as any).business_code || 'SKH'}
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {app.ownership_detail?.package_type || 'Standard'}
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {app.assigned_cr_name ? (
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-slate-800">{app.assigned_cr_name}</span>
                                <button
                                  onClick={() => setAssigningApp(app)}
                                  className="text-slate-400 hover:text-slate-700"
                                  title="Change CR"
                                >
                                  <Icons.Users className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setAssigningApp(app)}
                                className="text-xs text-[#008751] hover:underline font-semibold"
                              >
                                + Assign CR
                              </button>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <Badge status={app.status} />
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Link href={`/cr/applications/${app.id}`}>
                              <Button variant="ghost" size="sm" className="text-[#008751] hover:text-[#007043]">
                                Inspect
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        ) : (
          /* ---------------- EXECUTIVE OVERVIEW ---------------- */
          <div className="space-y-6">
            {/* Top Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
              <Card className="border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Total Applications
                </span>
                <span className="text-2xl font-bold text-slate-900 mt-2 block">
                  {stats?.total_applications ?? applications.length}
                </span>
              </Card>

              <Card className="border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Total Customers
                </span>
                <span className="text-2xl font-bold text-slate-900 mt-2 block">
                  {stats?.total_customers ?? '-'}
                </span>
              </Card>

              <Card className="border-slate-200">
                <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider block">
                  Under Review
                </span>
                <span className="text-2xl font-bold text-blue-600 mt-2 block">
                  {stats?.pending_applications ?? 0}
                </span>
              </Card>

              <Card className="border-slate-200">
                <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider block">
                  Approved
                </span>
                <span className="text-2xl font-bold text-emerald-600 mt-2 block">
                  {stats?.approved_applications ?? 0}
                </span>
              </Card>

              <Card className="border-slate-200">
                <span className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider block">
                  Action Required
                </span>
                <span className="text-2xl font-bold text-amber-600 mt-2 block">
                  {stats?.returned_applications ?? 0}
                </span>
              </Card>

              <Card className="border-slate-200">
                <span className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider block">
                  Rejected
                </span>
                <span className="text-2xl font-bold text-rose-600 mt-2 block">
                  {stats?.rejected_applications ?? 0}
                </span>
              </Card>
            </div>

            {/* Business Division Distribution */}
            {stats?.business_distribution && stats.business_distribution.length > 0 && (
              <Card title="Applications by Business Division">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {stats.business_distribution.map((b) => (
                    <div key={b.business_id} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#008751] bg-[#008751]/10 px-2 py-0.5 rounded">
                        {b.business_code}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 mt-2 truncate">{b.business_name}</h4>
                      <div className="flex items-baseline gap-1.5 mt-1">
                        <span className="text-xl font-bold text-slate-900">{b.count}</span>
                        <span className="text-xs text-slate-500">applications</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Recent Applications Table */}
            <Card
              title="Recent Applications"
              subtitle="Latest submissions across all business divisions."
              action={
                <Link href="/admin/dashboard?tab=applications">
                  <Button variant="secondary" size="sm" className="flex items-center gap-1.5 text-xs">
                    <span>View All Applications</span>
                    <Icons.ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              }
            >
              {isLoading ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  <Icons.Spinner className="w-6 h-6 text-[#008751] mx-auto mb-2" />
                  Loading records...
                </div>
              ) : applications.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">No applications registered yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-y border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Reference No.</th>
                        <th className="py-3 px-4">Applicant</th>
                        <th className="py-3 px-4">Division</th>
                        <th className="py-3 px-4">Package</th>
                        <th className="py-3 px-4">Assigned CR</th>
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
                            {app.applicant_info?.full_name_en || 'Pending'}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-700">
                            {app.business?.code || 'SKH'}
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {app.ownership_detail?.package_type || 'Silver'}
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {app.assigned_cr_name ? (
                              <span className="font-semibold text-slate-800">{app.assigned_cr_name}</span>
                            ) : (
                              <button
                                onClick={() => setAssigningApp(app)}
                                className="text-xs text-[#008751] hover:underline font-semibold"
                              >
                                + Assign CR
                              </button>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <Badge status={app.status} />
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setAssigningApp(app)}
                                className="p-1 text-slate-500 hover:text-slate-800 rounded"
                                title="Reassign CR"
                              >
                                <Icons.Users className="w-4 h-4" />
                              </button>
                              <Link href={`/cr/applications/${app.id}`}>
                                <Button variant="ghost" size="sm" className="text-[#008751]">
                                  Inspect
                                </Button>
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}
      </div>

      {/* Modal: Assign CR Employee */}
      <Modal
        isOpen={!!assigningApp}
        onClose={() => setAssigningApp(null)}
        title="Assign Application to CR Officer"
        description={`Assign reference ${assigningApp?.reference_number} to a customer relations representative.`}
      >
        <form onSubmit={handleAssignCr} className="space-y-4">
          <Select
            label="Select CR Employee"
            required
            value={selectedCrId}
            onChange={(e) => setSelectedCrId(e.target.value)}
            options={
              crEmployees.length > 0
                ? crEmployees.map((cr) => ({ value: cr.id, label: `${cr.full_name} (${cr.phone_number || (cr as any).mobile})` }))
                : [{ value: '', label: 'No CR officers available' }]
            }
          />

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => setAssigningApp(null)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isAssigning}>
              Save Assignment
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardShell>
  );
}

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Icons.Spinner className="w-8 h-8 text-[#008751]" />
      </div>
    }>
      <AdminDashboardContent />
    </Suspense>
  );
}
