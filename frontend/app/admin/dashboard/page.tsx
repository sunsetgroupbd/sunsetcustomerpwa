'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Application, ApplicationEditRequest, Business, DashboardStats, User } from '@/lib/types';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Alert } from '@/components/ui/Alert';
import { Icons } from '@/components/ui/Icons';
import { openSmsWithCredentials } from '@/lib/sms';
import { NotificationBell } from '@/components/layout/NotificationBell';
import { SuperComboAllocationModal } from '@/components/admin/SuperComboAllocationModal';
import { ShareInventoryTracker } from '@/components/admin/ShareInventoryTracker';

function AdminDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTab = searchParams ? searchParams.get('tab') : null;
  const isApplicationsTab = currentTab === 'applications';
  const isEditRequestsTab = currentTab === 'edit-requests';

  const { user, isLoading: authLoading } = useAuth();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [crEmployees, setCrEmployees] = useState<User[]>([]);
  const [editRequests, setEditRequests] = useState<ApplicationEditRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters for Applications view
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [businessFilter, setBusinessFilter] = useState('');

  // Edit Requests State
  const [editReqStatusFilter, setEditReqStatusFilter] = useState('');
  const [reviewingReq, setReviewingReq] = useState<ApplicationEditRequest | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
  const [adminNotes, setAdminNotes] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);

  // Assign CR modal
  const [assigningApp, setAssigningApp] = useState<Application | null>(null);
  const [selectedCrId, setSelectedCrId] = useState('');

  // Super Combo Portfolio Allocation Modal
  const [selectedSuperComboApp, setSelectedSuperComboApp] = useState<Application | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      if (isEditRequestsTab) {
        const reqs = await api.admin.listEditRequests(editReqStatusFilter || undefined).catch(() => []);
        setEditRequests(Array.isArray(reqs) ? reqs : (reqs as any)?.data || []);
      } else if (isApplicationsTab) {
        const [appsData, crList, bizList] = await Promise.all([
          api.applications.list({
            search: searchTerm || undefined,
            status: statusFilter || undefined,
            business_id: businessFilter || undefined,
            limit: 100,
          }).catch(() => ({ items: [], total: 0 })),
          api.admin.crTeam().catch(() => []),
          api.businesses.list().catch(() => []),
        ]);
        const apps = Array.isArray(appsData) ? appsData : ((appsData as any)?.items || (appsData as any)?.data || []);
        setApplications(apps);
        setCrEmployees(crList);
        setBusinesses(bizList);
        if (crList.length > 0 && !selectedCrId) {
          setSelectedCrId(crList[0].id);
        }
      } else {
        const [statsData, appsData, crList, bizList] = await Promise.all([
          api.admin.stats().catch(() => null),
          api.applications.list({ limit: 10 }).catch(() => ({ items: [], total: 0 })),
          api.admin.crTeam().catch(() => []),
          api.businesses.list().catch(() => []),
        ]);

        if (statsData) setStats(statsData);
        const apps = Array.isArray(appsData) ? appsData : ((appsData as any)?.items || (appsData as any)?.data || []);
        setApplications(apps);
        setCrEmployees(crList);
        setBusinesses(bizList);
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
    if (!authLoading && (!user || (user.role !== 'admin' && user.role !== 'subadmin'))) {
      router.push('/login');
      return;
    }
    if (user) {
      loadData();
    }
  }, [user, authLoading, isApplicationsTab, isEditRequestsTab, editReqStatusFilter, statusFilter, businessFilter, router]);

  const handleConfirmReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingReq) return;
    setIsReviewing(true);
    try {
      await api.admin.reviewEditRequest(reviewingReq.id, reviewAction, adminNotes.trim() || undefined);
      setStatusMsg({
        type: 'success',
        text: `Edit request has been ${reviewAction === 'approve' ? 'approved and application unlocked for changes' : 'rejected'}.`,
      });
      setReviewingReq(null);
      setAdminNotes('');
      loadData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to review edit request.' });
    } finally {
      setIsReviewing(false);
    }
  };

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

  const renderApplicationQueue = (appsList: Application[]) => {
    return (
      <>
        {/* Mobile View: Rich Audit Cards (No horizontal overflow) */}
        <div className="md:hidden divide-y divide-slate-100">
          {appsList.map((app, index) => {
            const clientName = app.customer_name || app.applicant_info?.full_name_en || 'Registered Customer';
            const clientPhone = app.customer_phone || app.applicant_info?.mobile_number || '-';
            const bizCode = app.business_code || app.business?.code || 'SKH';
            const packageName = app.ownership_detail?.package_type || 'Standard';
            const shares = app.ownership_detail?.number_of_shares || 1;
            const salesName = app.sales_agent_name || 'Online Self / Direct';
            const salesEmpId = app.sales_agent_employee_id;
            const dateAdded = app.created_at
              ? new Date(app.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
              : '-';
            const crName = app.assigned_cr_name || (app.status === 'draft' ? 'Unassigned (Open Pool)' : 'Pending Assignment');
            const crEmpId = app.assigned_cr_employee_id;
            const dateSubmitted = (app.submitted_at || app.submission_date)
              ? new Date(app.submitted_at || app.submission_date!).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
              : (app.status === 'draft' ? 'Form Pending' : '-');

            return (
              <div key={app.id} className="py-4 hover:bg-slate-50/80 transition-colors space-y-3">
                {/* Header: Ref Number, Division, Status Badge */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-slate-400 text-xs font-semibold">#{index + 1}</span>
                    <span className="font-mono font-bold text-xs text-slate-900">{app.reference_number || (app as any).application_number}</span>
                    <span className="text-[10px] font-bold text-[#008751] bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                      {bizCode}
                    </span>
                    {bizCode === 'SPC' && (
                      <button
                        type="button"
                        onClick={() => setSelectedSuperComboApp(app)}
                        className="text-[10px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                        title="View 4-in-1 Asset Allocation"
                      >
                        4-in-1 Ratio
                      </button>
                    )}
                  </div>
                  <Badge status={app.status} />
                </div>

                {/* Customer Information & Official Investor ID */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{clientName}</h4>
                    {app.status === 'approved' || app.customer_id_number ? (
                      <div className="inline-flex items-center gap-1.5 mt-1 bg-emerald-50 border border-emerald-300 text-[#006B3E] px-2 py-0.5 rounded font-mono text-[11px] font-bold shadow-2xs">
                        <Icons.Shield className="w-3.5 h-3.5 text-[#006B3E]" />
                        <span>Cust ID: {app.customer_id_number || (app.customer_id ? `SG-CUST-2026-${String(app.customer_id).padStart(4, '0')}` : 'Approved Investor')}</span>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        Customer ID:{' '}
                        <span className="font-semibold text-slate-600">Pending Approval</span>
                      </div>
                    )}
                  </div>
                  <span className="font-mono font-semibold text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded shrink-0">
                    {clientPhone}
                  </span>
                </div>

                {/* 2-Column Full Operational Audit (Who added vs Who filled) */}
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  {/* Sales Desk (Who Added the Customer) */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">
                      Added By (Sales)
                    </span>
                    <div className="font-bold text-slate-800 truncate">{salesName}</div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {salesEmpId ? `ID: ${salesEmpId}` : 'Direct'}
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Icons.Clock className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{dateAdded}</span>
                    </div>
                  </div>

                  {/* CR Desk (Who Filled & Submitted) */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Handled By (CR)
                      </span>
                      <button
                        onClick={() => setAssigningApp(app)}
                        className="text-[#008751] hover:underline font-bold text-[10px]"
                      >
                        {app.assigned_cr_name ? 'Change' : '+Assign'}
                      </button>
                    </div>
                    <div className="font-bold text-slate-800 truncate">{crName}</div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {crEmpId ? `ID: ${crEmpId}` : (app.status === 'draft' ? 'Open Pool' : '-')}
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Icons.CheckCircle className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{dateSubmitted}</span>
                    </div>
                  </div>
                </div>

                {/* Package & Shares */}
                <div className="text-[11px] text-slate-600 bg-slate-100/70 px-2.5 py-1.5 rounded flex items-center justify-between">
                  <span>
                    Package: <strong>{packageName}</strong> ({shares} {shares > 1 ? 'Shares' : 'Share'})
                  </span>
                  <span className="text-slate-500 font-medium">Project: {bizCode}</span>
                </div>

                {/* Action Buttons */}
                <div className="pt-1 flex items-center gap-2">
                  <Link href={`/cr/applications/${app.id}`} className="flex-1">
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full bg-[#008751] hover:bg-[#007043] text-xs font-bold justify-center py-2"
                    >
                      Inspect &amp; Review
                    </Button>
                  </Link>
                  {clientPhone && clientPhone !== '-' && (
                    <button
                      type="button"
                      onClick={() =>
                        openSmsWithCredentials({
                          phone: clientPhone,
                          customerName: clientName,
                          tempPassword: 'Sunset@123',
                          referenceNumber: app.reference_number,
                          businessCode: bizCode,
                        })
                      }
                      className="p-2 text-[#008751] bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors"
                      title="SMS Credentials to Customer"
                    >
                      <Icons.MessageSquare className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop View: Comprehensive Audit Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-y border-slate-200">
              <tr>
                <th className="py-3 px-4">Customer / Ref</th>
                <th className="py-3 px-4">Investment</th>
                <th className="py-3 px-4">Added By (Sales Desk)</th>
                <th className="py-3 px-4">Handled By (CR Desk)</th>
                <th className="py-3 px-4">Status &amp; Timeline</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {appsList.map((app) => {
                const clientName = app.customer_name || app.applicant_info?.full_name_en || 'Registered Customer';
                const clientPhone = app.customer_phone || app.applicant_info?.mobile_number || '-';
                const bizCode = app.business_code || app.business?.code || 'SKH';
                const packageName = app.ownership_detail?.package_type || 'Standard';
                const shares = app.ownership_detail?.number_of_shares || 1;
                const salesName = app.sales_agent_name || 'Online Self / Direct';
                const salesEmpId = app.sales_agent_employee_id;
                const dateAdded = app.created_at
                  ? new Date(app.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                  : '-';
                const crName = app.assigned_cr_name || (app.status === 'draft' ? 'Unassigned (Open Pool)' : 'Pending Assignment');
                const crEmpId = app.assigned_cr_employee_id;
                const dateSubmitted = (app.submitted_at || app.submission_date)
                  ? new Date(app.submitted_at || app.submission_date!).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                  : (app.status === 'draft' ? 'Form Pending' : '-');

                return (
                  <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-slate-900">{app.reference_number || (app as any).application_number}</div>
                      <div className="font-bold text-slate-900">{clientName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{clientPhone}</div>
                      {app.status === 'approved' || app.customer_id_number ? (
                        <div className="inline-flex items-center gap-1 mt-1 bg-emerald-50 border border-emerald-300 text-[#006B3E] px-2 py-0.5 rounded font-mono text-[11px] font-extrabold shadow-2xs">
                          <Icons.Shield className="w-3 h-3 text-[#006B3E]" />
                          <span>Cust ID: {app.customer_id_number || (app.customer_id ? `SG-CUST-2026-${String(app.customer_id).padStart(4, '0')}` : 'Approved Investor')}</span>
                        </div>
                      ) : null}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[#008751] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[11px]">
                          {bizCode}
                        </span>
                        {bizCode === 'SPC' && (
                          <button
                            type="button"
                            onClick={() => setSelectedSuperComboApp(app)}
                            className="text-[10px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                            title="View 4-in-1 Asset Allocation"
                          >
                            4-in-1 Ratio
                          </button>
                        )}
                      </div>
                      <div className="font-semibold text-slate-800 mt-1">{packageName}</div>
                      <div className="text-[11px] text-slate-500">{shares} {shares > 1 ? 'Shares' : 'Share'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800">{salesName}</div>
                      {salesEmpId && <div className="text-[11px] text-slate-500 font-mono">ID: {salesEmpId}</div>}
                      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                        <Icons.Clock className="w-3 h-3 text-slate-400" />
                        <span>{dateAdded}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-800">{crName}</span>
                        <button
                          onClick={() => setAssigningApp(app)}
                          className="text-slate-400 hover:text-slate-700"
                          title="Change / Assign CR"
                        >
                          <Icons.Users className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {crEmpId && <div className="text-[11px] text-slate-500 font-mono">ID: {crEmpId}</div>}
                      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                        <Icons.CheckCircle className="w-3 h-3 text-slate-400" />
                        <span>{dateSubmitted}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge status={app.status} />
                      <div className="text-[10px] text-slate-400 mt-1">
                        {app.status === 'draft'
                          ? 'CR Form Pending'
                          : app.status === 'submitted'
                          ? 'Needs Admin Approval'
                          : app.status === 'approved'
                          ? 'Active Investor'
                          : app.status}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {clientPhone && clientPhone !== '-' && (
                          <button
                            type="button"
                            onClick={() =>
                              openSmsWithCredentials({
                                phone: clientPhone,
                                customerName: clientName,
                                tempPassword: 'Sunset@123',
                                referenceNumber: app.reference_number,
                                businessCode: bizCode,
                              })
                            }
                            className="p-1.5 text-slate-500 hover:text-[#008751] hover:bg-emerald-50 rounded border border-transparent hover:border-emerald-200 transition-colors"
                            title="SMS Credentials"
                          >
                            <Icons.MessageSquare className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <Link href={`/cr/applications/${app.id}`}>
                          <Button variant="ghost" size="sm" className="text-[#008751] hover:text-[#007043] font-bold">
                            Inspect
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
      </>
    );
  };

  return (
    <DashboardShell
      title={
        isEditRequestsTab
          ? "Application Edit Requests"
          : isApplicationsTab
          ? "Applications Master Directory"
          : "Executive Admin Dashboard"
      }
      subtitle={
        isEditRequestsTab
          ? "Review and approve requests from CR Officers and Customers to unlock submitted applications for editing."
          : isApplicationsTab
          ? "Search, inspect, and manage customer applications across all Sunset Group divisions."
          : "Real-time monitoring and analytics across all Sunset Group business divisions."
      }
      actions={
        <div className="flex items-center gap-2">
          {isApplicationsTab || isEditRequestsTab ? (
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

        {/* ---------------- EDIT REQUESTS TAB VIEW ---------------- */}
        {isEditRequestsTab ? (
          <div className="space-y-6">
            <Card className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-700">Filter by Status:</span>
                  <select
                    value={editReqStatusFilter}
                    onChange={(e) => setEditReqStatusFilter(e.target.value)}
                    className="px-3 py-1.5 bg-white text-slate-900 border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#008751]/30"
                  >
                    <option value="">All Statuses</option>
                    <option value="pending">Pending Review</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                <div className="text-xs text-slate-500">
                  Total Requests: <strong>{editRequests.length}</strong>
                </div>
              </div>
            </Card>

            <Card
              title="Application Edit & Information Change Requests"
              subtitle="Review permission requests from CR Officers and Customers to modify submitted applications."
            >
              {isLoading ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  <Icons.Spinner className="w-6 h-6 text-[#008751] mx-auto mb-2" />
                  Loading edit requests...
                </div>
              ) : editRequests.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-500">
                  No edit requests found matching criteria.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-y border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Application Ref</th>
                        <th className="py-3 px-4">Applicant</th>
                        <th className="py-3 px-4">Requested By</th>
                        <th className="py-3 px-4">Reason for Edit</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {editRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">
                            {req.application_number || `APP-${req.application_id}`}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900">{req.applicant_name || '-'}</div>
                            <div className="text-[11px] text-slate-500 font-mono">{req.applicant_phone || '-'}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-medium text-slate-800 block">{req.requester_name}</span>
                            <Badge variant={req.requester_role === 'cr' ? 'info' : 'success'} className="text-[10px] uppercase">
                              {req.requester_role === 'cr' ? 'CR Officer' : 'Customer'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 max-w-xs text-slate-700">
                            {req.reason.includes('[PROJECT TRANSFER]') ? (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded">
                                  Project Transfer
                                </span>
                                <p className="text-xs font-semibold text-slate-900 leading-snug">
                                  {req.reason.replace('[PROJECT TRANSFER]', '').trim()}
                                </p>
                              </div>
                            ) : (
                              <p className="line-clamp-2">{req.reason}</p>
                            )}
                            {req.admin_notes && (
                              <p className="text-[11px] text-slate-400 mt-0.5 italic">Note: {req.admin_notes}</p>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                                req.status === 'approved'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : req.status === 'rejected'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {req.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                            {req.created_at ? new Date(req.created_at).toLocaleDateString() : '-'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {req.status === 'pending' ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => {
                                    setReviewingReq(req);
                                    setReviewAction('approve');
                                    setAdminNotes('');
                                  }}
                                  className="text-xs"
                                >
                                  Approve
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setReviewingReq(req);
                                    setReviewAction('reject');
                                    setAdminNotes('');
                                  }}
                                  className="text-xs text-rose-600 hover:border-rose-300"
                                >
                                  Reject
                                </Button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400">Reviewed</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        ) : isApplicationsTab ? (
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
                  value={businessFilter}
                  onChange={(e) => setBusinessFilter(e.target.value)}
                  className="px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#008751]/30 font-medium"
                >
                  <option value="">All Projects</option>
                  {businesses.map((b) => (
                    <option key={b.id} value={b.code}>
                      {b.code} &mdash; {b.name}
                    </option>
                  ))}
                </select>

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

                <div className="flex items-center gap-2">
                  <Button type="submit" variant="primary" size="sm" className="bg-[#008751] hover:bg-[#007043]">
                    Search
                  </Button>
                  {(searchTerm || statusFilter || businessFilter) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearchTerm('');
                        setStatusFilter('');
                        setBusinessFilter('');
                      }}
                      className="text-xs border-slate-300 text-slate-600 hover:bg-slate-50"
                    >
                      Reset
                    </Button>
                  )}
                </div>
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
                renderApplicationQueue(applications)
              )}
            </Card>
          </div>
        ) : (
          /* ---------------- EXECUTIVE OVERVIEW ---------------- */
          <div className="space-y-6">
            {/* Top Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-7 gap-3 sm:gap-4">
              <Card className="border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block truncate">
                  Total Applications
                </span>
                <span className="text-2xl font-bold text-slate-900 mt-2 block">
                  {stats?.total_applications ?? applications.length}
                </span>
              </Card>

              <Card className="border-slate-200 bg-emerald-50/30">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block truncate">
                    Total Customers
                  </span>
                  <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                    Approved
                  </span>
                </div>
                <span className="text-2xl font-bold text-emerald-900 mt-2 block">
                  {stats?.total_customers ?? 0}
                </span>
              </Card>

              <Card className="border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block truncate" title="Customers who registered an account but do not have an approved application yet">
                  Registered Customers
                </span>
                <span className="text-2xl font-bold text-slate-700 mt-2 block">
                  {stats?.total_registered_users ?? 0}
                </span>
              </Card>

              <Card className="border-slate-200">
                <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider block truncate">
                  Under Review
                </span>
                <span className="text-2xl font-bold text-blue-600 mt-2 block">
                  {stats?.pending_applications ?? 0}
                </span>
              </Card>

              <Card className="border-slate-200">
                <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider block truncate">
                  Approved Apps
                </span>
                <span className="text-2xl font-bold text-emerald-600 mt-2 block">
                  {stats?.approved_applications ?? 0}
                </span>
              </Card>

              <Card className="border-slate-200">
                <span className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider block truncate">
                  Action Required
                </span>
                <span className="text-2xl font-bold text-amber-600 mt-2 block">
                  {stats?.returned_applications ?? 0}
                </span>
              </Card>

              <Card className="border-slate-200">
                <span className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider block truncate">
                  Rejected
                </span>
                <span className="text-2xl font-bold text-rose-600 mt-2 block">
                  {stats?.rejected_applications ?? 0}
                </span>
              </Card>
            </div>

            {/* Business Division Distribution */}
            {stats?.business_distribution && stats.business_distribution.length > 0 && (
              <Card title="Applications by Project">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {stats.business_distribution.map((b) => {
                    const code = (b.business_code || '').toUpperCase().trim();
                    const logoSrc =
                      code === 'SCH'
                        ? '/suncarelogo.png'
                        : code === 'DFI'
                        ? '/dfilogo.png'
                        : code === 'SPC'
                        ? '/sunsetcombologo.png'
                        : code === 'MANGROVE'
                        ? '/mangrovelogo.png'
                        : code === 'DECK'
                        ? ''
                        : '/sunsetlogo.png';

                    return (
                      <div
                        key={b.business_id}
                        className="p-4 bg-white rounded-xl border border-slate-200/80 hover:border-slate-300 hover:shadow-sm transition-all flex flex-col justify-between"
                      >
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="w-12 h-12 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center p-1.5 shrink-0 overflow-hidden">
                            {logoSrc ? (
                              <img
                                src={logoSrc}
                                alt={b.business_name}
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <span className="font-mono font-bold text-xs text-[#008751]">{code}</span>
                            )}
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#008751] bg-[#008751]/10 px-2 py-0.5 rounded-full">
                            {b.business_code}
                          </span>
                        </div>

                        <div>
                          <h4 className="text-xs font-bold text-slate-900 truncate" title={b.business_name}>
                            {b.business_name}
                          </h4>
                          <div className="flex items-baseline gap-1.5 mt-1.5 pt-2 border-t border-slate-100">
                            <span className="text-2xl font-extrabold text-slate-900">{b.count}</span>
                            <span className="text-xs font-medium text-slate-500">applications</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Recent Applications Table */}
            <Card
              title="Recent Applications"
              subtitle="Latest submissions across all projects."
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
                renderApplicationQueue(applications)
              )}
            </Card>

            {/* Share Inventory & Sold Allocation Tracker */}
            <ShareInventoryTracker shareInventory={stats?.share_inventory} />
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

      {/* Modal: Review Edit Request */}
      <Modal
        isOpen={!!reviewingReq}
        onClose={() => setReviewingReq(null)}
        title={reviewAction === 'approve' ? 'Approve Application Edit Permission' : 'Reject Edit Request'}
        description={
          reviewAction === 'approve'
            ? `Grant permission to edit application ${reviewingReq?.application_number}. The application form will be unlocked for updates.`
            : `Reject edit permission for application ${reviewingReq?.application_number}.`
        }
      >
        <form onSubmit={handleConfirmReview} className="space-y-4">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
            <div><strong>Requested By:</strong> {reviewingReq?.requester_name} ({reviewingReq?.requester_role.toUpperCase()})</div>
            <div><strong>Reason:</strong> {reviewingReq?.reason}</div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Admin Notes / Instructions (Optional)
            </label>
            <textarea
              rows={3}
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="e.g. Please update the permanent address and notify when completed."
              className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#008751]/30"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => setReviewingReq(null)} disabled={isReviewing}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              isLoading={isReviewing}
              className={reviewAction === 'reject' ? 'bg-rose-600 hover:bg-rose-700 text-white border-transparent' : ''}
            >
              {reviewAction === 'approve' ? 'Confirm & Unlock Application' : 'Confirm Rejection'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Super Combo 4-in-1 Asset Allocation Breakdown Modal */}
      <SuperComboAllocationModal
        isOpen={!!selectedSuperComboApp}
        onClose={() => setSelectedSuperComboApp(null)}
        application={selectedSuperComboApp}
      />
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
