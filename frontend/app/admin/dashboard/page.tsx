'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [crEmployees, setCrEmployees] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Assign CR modal
  const [assigningApp, setAssigningApp] = useState<Application | null>(null);
  const [selectedCrId, setSelectedCrId] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadDashboard = async () => {
    setIsLoading(true);
    try {
      const [statsData, appsData, crList] = await Promise.all([
        api.admin.stats().catch(() => null),
        api.applications.list({ limit: 10 }).catch(() => ({ items: [], total: 0 })),
        api.admin.crTeam().catch(() => []),
      ]);

      if (statsData) setStats(statsData);
      setApplications(appsData.items || []);
      setCrEmployees(crList);
      if (crList.length > 0 && !selectedCrId) {
        setSelectedCrId(crList[0].id);
      }
    } catch (err) {
      console.error('Failed to load admin stats', err);
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
      loadDashboard();
    }
  }, [user, authLoading, router]);

  const handleAssignCr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningApp || !selectedCrId) return;

    setIsAssigning(true);
    try {
      await api.applications.assignCr(assigningApp.id, selectedCrId);
      setAssigningApp(null);
      setStatusMsg({ type: 'success', text: `Assigned officer to ${assigningApp.reference_number}` });
      loadDashboard();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to assign CR officer' });
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <DashboardShell
      title="Executive Admin Dashboard"
      subtitle="Real-time monitoring across all Sunset Group business divisions."
      actions={
        <Link href="/admin/exports">
          <Button variant="outline" size="sm" leftIcon={<Icons.Download className="w-4 h-4" />}>
            Export Center
          </Button>
        </Link>
      }
    >
      <div className="space-y-6">
        {statusMsg && <Alert type={statusMsg.type}>{statusMsg.text}</Alert>}

        {/* Top Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          <Card className="border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Total Applications
            </span>
            <span className="text-2xl font-bold text-slate-900 mt-2 block">
              {stats?.total_applications || applications.length}
            </span>
          </Card>

          <Card className="border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Total Customers
            </span>
            <span className="text-2xl font-bold text-slate-900 mt-2 block">
              {stats?.total_customers || 0}
            </span>
          </Card>

          <Card className="border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Pending / Review
            </span>
            <span className="text-2xl font-bold text-blue-600 mt-2 block">
              {stats?.pending_applications || 0}
            </span>
          </Card>

          <Card className="border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Approved
            </span>
            <span className="text-2xl font-bold text-[#006B3E] mt-2 block">
              {stats?.approved_applications || 0}
            </span>
          </Card>

          <Card className="border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Rejected
            </span>
            <span className="text-2xl font-bold text-rose-600 mt-2 block">
              {stats?.rejected_applications || 0}
            </span>
          </Card>

          <Card className="border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Returned
            </span>
            <span className="text-2xl font-bold text-orange-600 mt-2 block">
              {stats?.returned_applications || 0}
            </span>
          </Card>
        </div>

        {/* Business Division Distribution */}
        {stats?.business_distribution && stats.business_distribution.length > 0 && (
          <Card title="Applications by Business Division">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.business_distribution.map((b) => (
                <div key={b.business_id} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#006B3E] bg-[#006B3E]/10 px-2 py-0.5 rounded">
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
          subtitle="Showing recent customer applications across all divisions."
          action={
            <Button variant="ghost" size="sm" onClick={loadDashboard}>
              <Icons.Clock className="w-4 h-4 mr-1.5" /> Refresh
            </Button>
          }
        >
          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-500">
              <Icons.Spinner className="w-6 h-6 text-[#006B3E] mx-auto mb-2" />
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
                            className="text-xs text-blue-600 hover:underline font-semibold"
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
                            <Button variant="ghost" size="sm" className="text-[#006B3E]">
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
                ? crEmployees.map((cr) => ({ value: cr.id, label: `${cr.full_name} (${cr.phone_number})` }))
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

