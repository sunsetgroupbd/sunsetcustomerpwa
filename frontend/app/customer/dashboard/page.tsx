'use client';

import React, { useEffect, useState } from 'react';
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

export default function CustomerDashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    async function loadApps() {
      try {
        const res = await api.applications.list();
        setApplications(res.items || []);
      } catch (e) {
        console.error('Failed to load customer applications', e);
      } finally {
        setIsLoading(false);
      }
    }

    if (user) {
      loadApps();
    }
  }, [user, authLoading, router]);

  const draftApps = applications.filter((app) => app.status === 'draft');
  const actionRequiredApps = applications.filter((app) => app.status === 'action_required');
  const submittedApps = applications.filter((app) => app.status !== 'draft');

  return (
    <DashboardShell
      title={`Welcome back, ${user?.full_name || 'Customer'}`}
      subtitle="Track your Sunset Group ownership applications and investment portfolio."
      actions={
        <Link href="/customer/apply">
          <Button variant="primary" leftIcon={<Icons.Plus className="w-4 h-4" />}>
            New Application
          </Button>
        </Link>
      }
    >
      <div className="space-y-6">
        {/* Action Required Banner */}
        {actionRequiredApps.length > 0 && (
          <Alert
            type="warning"
            title="Action Required on Application"
            className="animate-in fade-in"
          >
            Our Customer Relations team has requested document or information correction for application{' '}
            <span className="font-mono font-bold">{actionRequiredApps[0].reference_number}</span>.{' '}
            <Link
              href={`/customer/applications/${actionRequiredApps[0].id}`}
              className="font-bold underline ml-1"
            >
              Click here to view instructions and upload revised documents.
            </Link>
          </Alert>
        )}

        {/* Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-slate-200">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Total Applications
            </span>
            <div className="flex items-center justify-between mt-2">
              <span className="text-2xl font-bold text-slate-900">{applications.length}</span>
              <Icons.FileText className="w-5 h-5 text-slate-400" />
            </div>
          </Card>

          <Card className="border-slate-200">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Under Review
            </span>
            <div className="flex items-center justify-between mt-2">
              <span className="text-2xl font-bold text-blue-600">
                {applications.filter((a) => a.status === 'under_review' || a.status === 'submitted').length}
              </span>
              <Icons.Clock className="w-5 h-5 text-blue-500" />
            </div>
          </Card>

          <Card className="border-slate-200">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Approved Ownerships
            </span>
            <div className="flex items-center justify-between mt-2">
              <span className="text-2xl font-bold text-[#006B3E]">
                {applications.filter((a) => a.status === 'approved').length}
              </span>
              <Icons.CheckCircle className="w-5 h-5 text-[#006B3E]" />
            </div>
          </Card>
        </div>

        {/* Incomplete Drafts Section */}
        {draftApps.length > 0 && (
          <Card
            title="Incomplete Draft Applications"
            subtitle="You have saved drafts that have not yet been submitted."
          >
            <div className="divide-y divide-slate-100">
              {draftApps.map((draft) => (
                <div
                  key={draft.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900">
                        {draft.reference_number}
                      </span>
                      <Badge status="draft">Draft (Step {draft.current_step} of 9)</Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {draft.business?.name || 'Sunset Division'} &bull; Started on{' '}
                      {new Date(draft.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Link href={`/customer/apply?application_id=${draft.id}`}>
                    <Button variant="outline" size="sm" rightIcon={<Icons.ArrowRight className="w-3.5 h-3.5" />}>
                      Continue Form
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Submitted Applications Table */}
        <Card
          title="Submitted Applications"
          subtitle="Real-time status tracking and documentation records."
        >
          {isLoading ? (
            <div className="py-8 text-center text-xs text-slate-500">
              <Icons.Spinner className="w-6 h-6 text-[#006B3E] mx-auto mb-2" />
              Loading your applications...
            </div>
          ) : submittedApps.length === 0 ? (
            <div className="text-center py-10">
              <Icons.FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h4 className="text-sm font-semibold text-slate-900">No applications submitted yet</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Begin your ownership journey by selecting a Sunset Group division and submitting your registration details.
              </p>
              <div className="mt-4">
                <Link href="/customer/apply">
                  <Button variant="primary" size="sm">
                    Create Application
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div>
              {/* Mobile Card List */}
              <div className="md:hidden divide-y divide-slate-100">
                {submittedApps.map((app) => (
                  <Link
                    key={app.id}
                    href={`/customer/applications/${app.id}`}
                    className="py-3.5 block hover:bg-slate-50 active:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono font-bold text-xs text-slate-900">
                        {app.reference_number}
                      </span>
                      <Badge status={app.status} />
                    </div>
                    <h4 className="text-sm font-semibold text-slate-800">
                      {app.business?.name || 'Sunset Division'}
                    </h4>
                    <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
                      <span>
                        {app.ownership_detail?.package_type || 'Silver'} ({app.ownership_detail?.number_of_ownership || 1} share)
                      </span>
                      <span className="text-slate-400">
                        {app.submission_date ? new Date(app.submission_date).toLocaleDateString() : '-'}
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
                      <th className="py-3 px-4">Reference No.</th>
                      <th className="py-3 px-4">Division</th>
                      <th className="py-3 px-4">Package</th>
                      <th className="py-3 px-4">Submission Date</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {submittedApps.map((app) => (
                      <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {app.reference_number}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800">
                          {app.business?.name || 'Sunset Division'}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {app.ownership_detail?.package_type || 'Silver'} ({app.ownership_detail?.number_of_ownership || 1} share)
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {app.submission_date ? new Date(app.submission_date).toLocaleDateString() : '-'}
                        </td>
                        <td className="py-3 px-4">
                          <Badge status={app.status} />
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link href={`/customer/applications/${app.id}`}>
                            <Button variant="ghost" size="sm" className="text-[#006B3E] hover:text-[#005632]">
                              View Details
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
    </DashboardShell>
  );
}

