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
import { openSmsWithCredentials } from '@/lib/sms';
import { NotificationBell } from '@/components/layout/NotificationBell';

export default function SalesDashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [applications, setApplications] = useState<Application[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [bizFilter, setBizFilter] = useState('');

  // Register on Behalf modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [businessId, setBusinessId] = useState('');
  const [packageType, setPackageType] = useState('Standard Ownership');
  const [numberOfShares, setNumberOfShares] = useState(1);
  const [totalAmount, setTotalAmount] = useState<string>('');
  const [tempPassword, setTempPassword] = useState('Sunset@123');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Success credentials state
  const [createdResult, setCreatedResult] = useState<{
    customerName: string;
    customerPhone: string;
    temporaryPassword: string;
    referenceNumber: string;
    businessCode: string;
  } | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const generateRandomPassword = () => {
    return 'Sunset@123';
  };

  const resetModal = () => {
    setFullName('');
    setPhone('');
    setEmail('');
    setPackageType('Standard Ownership');
    setNumberOfShares(1);
    setTotalAmount('');
    setTempPassword('Sunset@123');
    setModalError(null);
    setCreatedResult(null);
    setIsCopied(false);
    if (businesses.length > 0 && !businessId) {
      setBusinessId(businesses[0].id);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [appRes, bizRes] = await Promise.all([
        api.applications.list({
          business_id: bizFilter || undefined,
          status: statusFilter || undefined,
          search: search || undefined,
        }),
        api.businesses.list().catch(() => []),
      ]);
      const apps = Array.isArray(appRes) ? appRes : ((appRes as any)?.items || (appRes as any)?.data || []);
      setApplications(apps);
      setBusinesses(bizRes);
      if (bizRes.length > 0 && !businessId) {
        setBusinessId(bizRes[0].id);
      }
    } catch (err) {
      console.error('Failed to load sales applications', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && (!user || (user.role !== 'sales' && user.role !== 'admin'))) {
      router.push('/login');
      return;
    }
    if (user) {
      loadData();
    }
  }, [user, authLoading, statusFilter, bizFilter, router]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleCreateOnBehalf = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!fullName.trim()) {
      setModalError('Please enter the customer full name.');
      return;
    }

    const bdPhoneRegex = /^(?:\+?88)?01[3-9]\d{8}$/;
    if (!bdPhoneRegex.test(phone.trim())) {
      setModalError('Please enter a valid 11-digit Bangladeshi mobile number (e.g. 017XXXXXXXX).');
      return;
    }

    if (!businessId) {
      setModalError('Please select a business division.');
      return;
    }

    setIsSubmitting(true);
    try {
      const passwordToUse = tempPassword.trim() || generateRandomPassword();
      const res = await api.sales.createOnBehalf({
        customer_name: fullName.trim(),
        customer_phone: phone.trim(),
        customer_email: email.trim() || undefined,
        business_id: businessId,
        package_type: packageType,
        number_of_shares: Number(numberOfShares) || 1,
        total_amount: totalAmount ? Number(totalAmount) : undefined,
        temporary_password: passwordToUse,
      });

      setCreatedResult({
        customerName: fullName.trim(),
        customerPhone: phone.trim(),
        temporaryPassword: passwordToUse,
        referenceNumber: res.reference_number || (res as any).application_number || 'REF-NEW',
        businessCode: res.business?.code || (res as any).business_code || businesses.find((b) => b.id === businessId)?.code || 'SKH',
      });

      // Reload list in background safely without blocking
      loadData().catch(() => {});
    } catch (err: any) {
      setModalError(err.message || 'Failed to register customer on behalf.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!createdResult) return;
    const text = `Sunset Group Customer Credentials
Customer: ${createdResult.customerName}
Mobile / User ID: ${createdResult.customerPhone}
Temporary Password: ${createdResult.temporaryPassword}
Application Ref: ${createdResult.referenceNumber}
Investor Portal: ${window.location.origin}/login`;

    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 3000);
  };

  // Metrics
  const totalCount = applications.length;
  const inReviewCount = applications.filter((a) => a.status === 'submitted' || a.status === 'under_review').length;
  const approvedCount = applications.filter((a) => a.status === 'approved').length;
  const actionNeededCount = applications.filter((a) => a.status === 'action_required' || a.status === 'returned').length;

  return (
    <DashboardShell
      title="Sales Executive Desk"
      subtitle="Register prospective investors on behalf, track ownership applications, and monitor onboarding pipeline."
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            onClick={() => {
              resetModal();
              setIsModalOpen(true);
            }}
            leftIcon={<Icons.Plus className="w-4 h-4" />}
          >
            Register Customer on Behalf
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Metric Cards - Architectural SVG Geometric Accented */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Total Managed */}
          <div
            onClick={() => setStatusFilter('')}
            className={`cursor-pointer group relative overflow-hidden rounded-2xl bg-white p-4 sm:p-5 border transition-all duration-200 hover:shadow-md ${
              statusFilter === ''
                ? 'border-[#008751] ring-2 ring-[#008751]/15 shadow-sm'
                : 'border-slate-200/90 hover:border-slate-300'
            }`}
          >
            {/* Architectural SVG Background Accent */}
            <div className="absolute -top-6 -right-6 w-24 h-24 overflow-hidden pointer-events-none rounded-tr-2xl opacity-60 group-hover:opacity-100 transition-opacity">
              <svg viewBox="0 0 100 100" className="w-full h-full text-emerald-800/[0.08]" fill="currentColor">
                <path d="M0,0 L100,0 L100,100 C65,100 45,80 35,55 C25,30 15,15 0,0 Z" />
              </svg>
            </div>

            <div className="relative z-10 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Total Managed
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50/80 border border-emerald-100 flex items-center justify-center text-[#008751] shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                  <Icons.Users className="w-4 h-4 text-[#008751]" size={16} />
                </div>
              </div>

              <div className="mt-2.5">
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-none">
                  {totalCount}
                </div>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                  <span className="text-[11px] font-medium text-slate-500 truncate">Initiated applications</span>
                </div>
              </div>
            </div>
          </div>

          {/* In Review / Processing */}
          <div
            onClick={() => setStatusFilter(statusFilter === 'submitted' ? '' : 'submitted')}
            className={`cursor-pointer group relative overflow-hidden rounded-2xl bg-white p-4 sm:p-5 border transition-all duration-200 hover:shadow-md ${
              statusFilter === 'submitted' || statusFilter === 'under_review'
                ? 'border-blue-500 ring-2 ring-blue-500/15 shadow-sm'
                : 'border-slate-200/90 hover:border-slate-300'
            }`}
          >
            {/* Concentric Geometric Rings SVG Accent */}
            <div className="absolute -top-6 -right-6 w-24 h-24 overflow-hidden pointer-events-none rounded-tr-2xl opacity-60 group-hover:opacity-100 transition-opacity">
              <svg viewBox="0 0 100 100" className="w-full h-full text-blue-600/[0.08]" fill="currentColor">
                <circle cx="100" cy="0" r="90" fill="none" stroke="currentColor" strokeWidth="12" />
                <circle cx="100" cy="0" r="60" fill="none" stroke="currentColor" strokeWidth="12" />
                <circle cx="100" cy="0" r="30" fill="currentColor" />
              </svg>
            </div>

            <div className="relative z-10 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] sm:text-[11px] font-bold text-blue-700 uppercase tracking-wider">
                  In Review
                </span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                  <Icons.Clock className="w-4 h-4 text-blue-600" size={16} />
                </div>
              </div>

              <div className="mt-2.5">
                <div className="text-2xl sm:text-3xl font-extrabold text-blue-950 tracking-tight leading-none">
                  {inReviewCount}
                </div>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                  <span className="text-[11px] font-medium text-blue-600/90 truncate">Under CR verification</span>
                </div>
              </div>
            </div>
          </div>

          {/* Approved */}
          <div
            onClick={() => setStatusFilter(statusFilter === 'approved' ? '' : 'approved')}
            className={`cursor-pointer group relative overflow-hidden rounded-2xl bg-white p-4 sm:p-5 border transition-all duration-200 hover:shadow-md ${
              statusFilter === 'approved'
                ? 'border-emerald-600 ring-2 ring-emerald-600/15 shadow-sm'
                : 'border-slate-200/90 hover:border-slate-300'
            }`}
          >
            {/* Diamond Shield Facet SVG Accent */}
            <div className="absolute -top-6 -right-6 w-24 h-24 overflow-hidden pointer-events-none rounded-tr-2xl opacity-70 group-hover:opacity-100 transition-opacity">
              <svg viewBox="0 0 100 100" className="w-full h-full text-emerald-600/[0.09]" fill="currentColor">
                <polygon points="100,0 20,0 100,80" />
                <polygon points="100,30 50,0 100,80" fillOpacity="0.5" />
                <circle cx="80" cy="20" r="6" fill="#008751" fillOpacity="0.4" />
              </svg>
            </div>

            <div className="relative z-10 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] sm:text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
                  Approved
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#008751] shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                  <Icons.CheckCircle className="w-4 h-4 text-[#008751]" size={16} />
                </div>
              </div>

              <div className="mt-2.5">
                <div className="text-2xl sm:text-3xl font-extrabold text-emerald-950 tracking-tight leading-none">
                  {approvedCount}
                </div>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span className="text-[11px] font-medium text-emerald-600/90 truncate">Fully verified investors</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Required */}
          <div
            onClick={() => setStatusFilter(statusFilter === 'action_required' ? '' : 'action_required')}
            className={`cursor-pointer group relative overflow-hidden rounded-2xl bg-white p-4 sm:p-5 border transition-all duration-200 hover:shadow-md ${
              statusFilter === 'action_required'
                ? 'border-amber-500 ring-2 ring-amber-500/15 shadow-sm'
                : 'border-slate-200/90 hover:border-slate-300'
            }`}
          >
            {/* Warning Diagonal Geometric Chevron SVG Accent */}
            <div className="absolute -top-6 -right-6 w-24 h-24 overflow-hidden pointer-events-none rounded-tr-2xl opacity-70 group-hover:opacity-100 transition-opacity">
              <svg viewBox="0 0 100 100" className="w-full h-full text-amber-500/[0.09]" fill="currentColor">
                <polygon points="100,0 40,0 100,60" />
                <polygon points="100,20 60,0 100,60" fillOpacity="0.4" />
                <circle cx="82" cy="18" r="5" fill="#f59e0b" fillOpacity="0.6" />
              </svg>
            </div>

            <div className="relative z-10 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] sm:text-[11px] font-bold text-amber-700 uppercase tracking-wider">
                  Action Req.
                </span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                  <Icons.AlertCircle className="w-4 h-4 text-amber-600" size={16} />
                </div>
              </div>

              <div className="mt-2.5">
                <div className="text-2xl sm:text-3xl font-extrabold text-amber-950 tracking-tight leading-none">
                  {actionNeededCount}
                </div>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  <span className="text-[11px] font-medium text-amber-600/90 truncate">Pending corrections</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <Card className="p-4">
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search by reference, applicant name, or phone number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#008751]/30"
              />
              <Icons.Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>

            <select
              value={bizFilter}
              onChange={(e) => setBizFilter(e.target.value)}
              className="px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#008751]/30"
            >
              <option value="">All Divisions</option>
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code} — {b.name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#008751]/30"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="under_review">Under Review</option>
              <option value="action_required">Action Required</option>
              <option value="approved">Approved</option>
              <option value="returned">Returned</option>
              <option value="rejected">Rejected</option>
            </select>

            <Button type="submit" variant="secondary" size="sm">
              Search
            </Button>
          </form>
        </Card>

        {/* Applications Directory */}
        <Card
          title="Initiated Applications"
          subtitle={`Showing ${applications.length} applications registered by your sales desk`}
        >
          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-500">
              <Icons.Spinner className="w-6 h-6 text-[#008751] mx-auto mb-2" />
              Loading applications...
            </div>
          ) : applications.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-500 space-y-3">
              <p>No customer applications found registered under your account.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  resetModal();
                  setIsModalOpen(true);
                }}
              >
                + Register First Customer
              </Button>
            </div>
          ) : (
            <div>
              {/* Mobile View */}
              <div className="md:hidden divide-y divide-slate-100">
                {applications.map((app) => (
                  <div key={app.id} className="py-3.5 block hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-slate-900">
                          {app.reference_number || (app as any).application_number}
                        </span>
                        <span className="text-[10px] font-bold text-[#008751] bg-[#008751]/10 px-1.5 py-0.5 rounded">
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
                    {app.applicant_info?.mobile_number && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openSmsWithCredentials({
                            phone: app.applicant_info?.mobile_number || '',
                            customerName: app.applicant_info?.full_name_en,
                            tempPassword: 'Sunset@123',
                            referenceNumber: app.reference_number,
                            businessCode: app.business?.code,
                          });
                        }}
                        className="mt-2.5 w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-[#008751] font-bold text-xs rounded-lg border border-emerald-200 transition-colors"
                      >
                        <Icons.MessageSquare className="w-3.5 h-3.5" />
                        <span>SMS Credentials</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-y border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Ref Number</th>
                      <th className="py-3 px-4">Customer Name</th>
                      <th className="py-3 px-4">Mobile Phone</th>
                      <th className="py-3 px-4">Division</th>
                      <th className="py-3 px-4">Package</th>
                      <th className="py-3 px-4">Shares</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {applications.map((app) => (
                      <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {app.reference_number || (app as any).application_number}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800">
                          {app.applicant_info?.full_name_en || 'Pending Draft'}
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-mono">
                          {app.applicant_info?.mobile_number || '-'}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-700">
                          {app.business?.code || 'SKH'}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {app.ownership_detail?.package_type || 'Standard'}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {app.ownership_detail?.number_of_shares || app.ownership_detail?.number_of_ownership || 1}
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {app.submission_date ? new Date(app.submission_date).toLocaleDateString() : 'Draft'}
                        </td>
                        <td className="py-3 px-4">
                          <Badge status={app.status} />
                        </td>
                        <td className="py-3 px-4 text-right">
                          {app.applicant_info?.mobile_number ? (
                            <button
                              type="button"
                              onClick={() =>
                                openSmsWithCredentials({
                                  phone: app.applicant_info?.mobile_number || '',
                                  customerName: app.applicant_info?.full_name_en,
                                  tempPassword: 'Sunset@123',
                                  referenceNumber: app.reference_number,
                                  businessCode: app.business?.code,
                                })
                              }
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-[#008751] bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 transition-colors"
                              title="Open SMS app with credentials"
                            >
                              <Icons.MessageSquare className="w-3.5 h-3.5" />
                              <span>SMS</span>
                            </button>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
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

      {/* Modal: Register on Behalf */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          if (!isSubmitting) {
            setIsModalOpen(false);
          }
        }}
        title="Register Customer on Behalf"
        description="Register a prospective investor or walk-in client, generate their portal access credentials, and initialize their ownership application."
      >
        {createdResult ? (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900">
              <div className="flex items-center gap-2 mb-1">
                <Icons.CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                <h4 className="font-bold text-sm">Customer Account & Application Created!</h4>
              </div>
              <p className="text-xs text-emerald-800">
                The customer account has been created. Share these credentials with the customer so they can log in to review their application, upload documents, and complete verification.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5 font-mono text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-200">
                <span className="text-slate-500 font-sans">Full Name:</span>
                <span className="font-bold text-slate-900">{createdResult.customerName}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200">
                <span className="text-slate-500 font-sans">Login Mobile Number:</span>
                <span className="font-bold text-[#008751]">{createdResult.customerPhone}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200">
                <span className="text-slate-500 font-sans">Temporary Password:</span>
                <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-300">
                  {createdResult.temporaryPassword}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 font-sans">Application Reference:</span>
                <span className="font-bold text-slate-900">{createdResult.referenceNumber}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Button
                variant="primary"
                className="w-full flex items-center justify-center gap-2 text-xs bg-[#008751] hover:bg-[#007043] text-white font-bold py-2.5"
                onClick={() =>
                  openSmsWithCredentials({
                    phone: createdResult.customerPhone,
                    customerName: createdResult.customerName,
                    tempPassword: createdResult.temporaryPassword,
                    referenceNumber: createdResult.referenceNumber,
                    businessCode: createdResult.businessCode,
                  })
                }
              >
                <Icons.MessageSquare className="w-4 h-4" />
                <span>SMS Credentials to Customer</span>
              </Button>
              <Button
                variant="outline"
                className="w-full flex items-center justify-center gap-2 text-xs"
                onClick={handleCopyCredentials}
              >
                {isCopied ? (
                  <>
                    <Icons.CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>Credentials Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Icons.Copy className="w-4 h-4" />
                    <span>Copy Login Credentials</span>
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                className="w-full text-xs text-slate-600"
                onClick={() => {
                  setIsModalOpen(false);
                  resetModal();
                }}
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreateOnBehalf} className="space-y-3.5">
            {modalError && <Alert type="error">{modalError}</Alert>}

            <Input
              label="Customer Full Name"
              required
              placeholder="e.g. Mohammad Rahim"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />

            <Input
              label="Customer Mobile Phone"
              required
              type="tel"
              placeholder="017XXXXXXXX"
              helperText="11-digit Bangladeshi mobile number used as the customer login ID."
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            <Input
              label="Customer Email (Optional)"
              type="email"
              placeholder="investor@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <Select
              label="Target Business Division"
              required
              value={businessId}
              onChange={(e) => setBusinessId(e.target.value)}
              options={businesses.map((b) => ({ value: b.id, label: `${b.code} — ${b.name}` }))}
            />

            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Package Type"
                value={packageType}
                onChange={(e) => setPackageType(e.target.value)}
                options={[
                  { value: 'Standard Ownership', label: 'Standard Ownership' },
                  { value: 'Silver Suite', label: 'Silver Suite' },
                  { value: 'Gold Suite', label: 'Gold Suite' },
                  { value: 'Platinum Ownership', label: 'Platinum Ownership' },
                  { value: 'Diamond Executive', label: 'Diamond Executive' },
                  { value: 'Custom Package', label: 'Custom Package' },
                ]}
              />

              <Input
                label="Number of Shares"
                type="number"
                min={1}
                value={numberOfShares}
                onChange={(e) => setNumberOfShares(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>

            <Input
              label="Total Investment Amount (BDT, Optional)"
              type="number"
              placeholder="e.g. 500000"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
            />

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Initial Portal Password <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setTempPassword('Sunset@123')}
                  className="text-[11px] font-semibold text-[#008751] hover:underline"
                >
                  Reset (Sunset@123)
                </button>
              </div>
              <Input
                required
                type="text"
                placeholder="Sunset@123"
                value={tempPassword}
                onChange={(e) => setTempPassword(e.target.value)}
              />
            </div>

            <div className="pt-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row justify-end gap-2.5 pb-6 sm:pb-0">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
                className="w-full sm:w-auto text-xs py-2.5 sm:py-2"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                isLoading={isSubmitting}
                className="w-full sm:w-auto bg-[#008751] hover:bg-[#007043] font-bold py-2.5 sm:py-2 text-xs"
              >
                Register &amp; Issue Credentials
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </DashboardShell>
  );
}
