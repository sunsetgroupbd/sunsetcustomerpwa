'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { IncomingLeadItem, Business } from '@/lib/types';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Icons } from '@/components/ui/Icons';
import { openSmsWithCredentials } from '@/lib/sms';

export default function CrLeadsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [leads, setLeads] = useState<IncomingLeadItem[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'activated'>('pending');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Lead Details Modal
  const [selectedLead, setSelectedLead] = useState<IncomingLeadItem | null>(null);

  // Lead Activation Modal
  const [activatingLead, setActivatingLead] = useState<IncomingLeadItem | null>(null);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('');
  const [tempPassword, setTempPassword] = useState('Sunset@123');
  const [sendSms, setSendSms] = useState(true);
  const [customNotes, setCustomNotes] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [activatedResult, setActivatedResult] = useState<{
    customerName: string;
    phone: string;
    tempPassword: string;
    applicationId: number;
    referenceNumber: string;
    smsSent: boolean;
  } | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [leadsRes, bizRes] = await Promise.all([
        api.leads.list({
          status: statusFilter === 'all' ? undefined : statusFilter,
          search: search.trim() || undefined,
          limit: 100,
        }),
        api.businesses.list().catch(() => []),
      ]);
      setLeads(leadsRes.items || []);
      setBusinesses(bizRes || []);
      if (bizRes && bizRes.length > 0 && !selectedBusinessId) {
        setSelectedBusinessId(String(bizRes[0].id));
      }
    } catch (err: any) {
      console.error('Failed to load incoming leads', err);
      setStatusMsg({ type: 'error', text: err.message || 'Failed to fetch incoming leads.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && (!user || (user.role !== 'cr' && user.role !== 'admin' && user.role !== 'subadmin'))) {
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

  const handleOpenActivateModal = (lead: IncomingLeadItem) => {
    setActivatingLead(lead);
    setTempPassword('Sunset@123');
    setSendSms(true);
    setCustomNotes('');
    setActivatedResult(null);
  };

  const handleConfirmActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activatingLead) return;

    setIsActivating(true);
    setStatusMsg(null);
    try {
      const res = await api.leads.activate({
        lead_id: activatingLead.id,
        business_id: selectedBusinessId ? Number(selectedBusinessId) : undefined,
        temp_password: tempPassword.trim() || 'Sunset@123',
        send_sms: sendSms,
        custom_notes: customNotes.trim() || undefined,
      });

      setActivatedResult({
        customerName: res.customer_name,
        phone: res.phone_number,
        tempPassword: res.temp_password,
        applicationId: res.application_id,
        referenceNumber: res.reference_number,
        smsSent: res.sms_sent,
      });

      setStatusMsg({
        type: 'success',
        text: `Lead "${activatingLead.name}" activated! Customer Account and Application ${res.reference_number} created.`,
      });

      // Reload list
      loadData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to activate lead.' });
    } finally {
      setIsActivating(false);
    }
  };

  return (
    <DashboardShell
      title="Onboarded Leads"
      subtitle="Leads received via Webhook API integration from your sales & marketing CRM platform."
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => loadData()} isLoading={isLoading}>
            <Icons.Refresh className="w-3.5 h-3.5 mr-1" />
            Refresh
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {statusMsg && <Alert type={statusMsg.type}>{statusMsg.text}</Alert>}

        {/* Filter and Search Bar */}
        <Card className="p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Search by customer name, mobile phone, or external lead ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#008751]/30"
                />
                <Icons.Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
              <Button type="submit" variant="primary" size="sm">
                Search
              </Button>
            </form>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setStatusFilter('pending')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  statusFilter === 'pending'
                    ? 'bg-white text-amber-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pending Activation
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('activated')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  statusFilter === 'activated'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Activated
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  statusFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Leads
              </button>
            </div>
          </div>
        </Card>

        {/* Leads Table */}
        <Card
          title="Onboarded Lead Roster"
          subtitle={leads.length > 0 ? `Showing ${leads.length} lead records` : 'No leads matching current criteria'}
        >
          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-500">
              <Icons.Spinner className="w-6 h-6 text-[#008751] mx-auto mb-2" />
              Loading onboarded leads...
            </div>
          ) : leads.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-500">
              No onboarded leads found in this queue.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-y border-slate-200">
                  <tr>
                    <th className="py-3 px-3 text-center w-12 font-mono">#</th>
                    <th className="py-3 px-4">Lead Particulars</th>
                    <th className="py-3 px-4">Phone / Contact</th>
                    <th className="py-3 px-4">Sales Owner</th>
                    <th className="py-3 px-4">Lead Source</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Received Time</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leads.map((l, index) => (
                    <tr key={l.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 text-center font-mono text-slate-500 font-semibold">{index + 1}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{l.name}</div>
                        {l.email && <div className="text-[11px] text-slate-500 truncate max-w-[170px]">{l.email}</div>}
                        {l.external_lead_id && (
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1 py-0.2 rounded inline-block mt-0.5">
                            EXT ID: #{l.external_lead_id}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold font-mono text-[#008751] text-xs">{l.phone}</div>
                      </td>
                      <td className="py-3 px-4">
                        {l.owner_info?.name ? (
                          <div className="space-y-0.5">
                            <div className="font-bold text-slate-800">{l.owner_info.name}</div>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
                              {l.owner_info.employee_id && (
                                <span className="bg-slate-100 border border-slate-200 px-1 py-0.2 rounded font-semibold text-slate-700">
                                  ID: {l.owner_info.employee_id}
                                </span>
                              )}
                              {l.owner_info.phone && <span>{l.owner_info.phone}</span>}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Not Assigned</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200 capitalize">
                          {l.source?.replace('_', ' ') || 'External'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {l.activation_status === 'activated' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                            <Icons.Check className="w-3 h-3" /> Activated
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full">
                            <Icons.Clock className="w-3 h-3" /> Pending Activation
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {new Date(l.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedLead(l)}
                            className="text-slate-600 hover:text-slate-900"
                          >
                            Details
                          </Button>

                          {l.activation_status === 'pending' ? (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleOpenActivateModal(l)}
                              className="bg-[#008751] hover:bg-[#006B3E] text-white font-bold"
                            >
                              Activate Lead
                            </Button>
                          ) : (
                            l.application_id && (
                              <Link href={`/cr/applications/${l.application_id}`}>
                                <Button variant="outline" size="sm" className="text-emerald-700 border-emerald-300 hover:bg-emerald-50">
                                  View App
                                </Button>
                              </Link>
                            )
                          )}
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

      {/* Modal: View Full Lead Particulars & Call History */}
      <Modal
        isOpen={!!selectedLead}
        onClose={() => setSelectedLead(null)}
        title={selectedLead ? `Lead Particulars: ${selectedLead.name}` : 'Lead Details'}
        description="Complete information ingested from external CRM webhook."
      >
        {selectedLead && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <span className="text-slate-500 block">Customer Name</span>
                <span className="font-bold text-slate-900 text-sm">{selectedLead.name}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Mobile Phone</span>
                <span className="font-bold text-[#008751] text-sm">{selectedLead.phone}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Email Address</span>
                <span className="font-semibold text-slate-800">{selectedLead.email || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Lead Source</span>
                <span className="font-semibold text-slate-800 capitalize">{selectedLead.source?.replace('_', ' ') || 'External'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Sales Owner</span>
                <span className="font-semibold text-slate-800">{selectedLead.owner_info?.name || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">External Lead ID</span>
                <span className="font-mono text-slate-800">#{selectedLead.external_lead_id || 'N/A'}</span>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <Button variant="ghost" size="sm" onClick={() => setSelectedLead(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Activate Lead -> Create Account & Credential */}
      <Modal
        isOpen={!!activatingLead}
        onClose={() => {
          setActivatingLead(null);
          setActivatedResult(null);
        }}
        title="Activate Onboarded Lead"
        description="Provision customer portal credentials and initiate official application review."
      >
        {activatedResult ? (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 font-bold text-emerald-900">
                <Icons.Check className="w-5 h-5 text-emerald-600" />
                <span>Customer Credential Successfully Created!</span>
              </div>
              <p className="text-xs text-emerald-800">
                Application <strong>{activatedResult.referenceNumber}</strong> has been created in <em>Under Review</em> state.
              </p>

              <div className="p-3 bg-white border border-emerald-300 rounded-lg font-mono text-xs space-y-1 mt-2">
                <div>Customer Name: <strong>{activatedResult.customerName}</strong></div>
                <div>Login Phone: <strong>{activatedResult.phone}</strong></div>
                <div>Portal Password: <strong>{activatedResult.tempPassword}</strong></div>
                <div>Application Ref: <strong>{activatedResult.referenceNumber}</strong></div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  openSmsWithCredentials({
                    phone: activatedResult.phone,
                    tempPassword: activatedResult.tempPassword,
                    customerName: activatedResult.customerName,
                    referenceNumber: activatedResult.referenceNumber,
                  })
                }
                leftIcon={<Icons.Phone className="w-3.5 h-3.5 text-[#008751]" />}
              >
                Send SMS to Customer
              </Button>

              <Link href={`/cr/applications/${activatedResult.applicationId}`}>
                <Button variant="primary" size="sm">
                  Go to Application Review
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          activatingLead && (
            <form onSubmit={handleConfirmActivate} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                <div>Customer: <strong>{activatingLead.name}</strong></div>
                <div>Mobile: <strong className="font-mono text-[#008751]">{activatingLead.phone}</strong></div>
                {activatingLead.owner_info?.name && (
                  <div>Sales Executive: <strong>{activatingLead.owner_info.name}</strong></div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assign to Business Project <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedBusinessId}
                  onChange={(e) => setSelectedBusinessId(e.target.value)}
                  className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#008751]/30 font-medium"
                >
                  {businesses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Customer Portal Password"
                required
                value={tempPassword}
                onChange={(e) => setTempPassword(e.target.value)}
                helperText="Temporary login password sent to customer for self-service portal access."
              />

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">CR Internal Notes (Optional)</label>
                <textarea
                  rows={2}
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder="Notes about onboarding source, priority, or client preferences..."
                  className="w-full p-2.5 bg-white text-slate-900 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#008751]/30"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={sendSms}
                  onChange={(e) => setSendSms(e.target.checked)}
                  className="rounded border-slate-300 text-[#008751] focus:ring-[#008751]"
                />
                <span className="text-slate-700 font-medium">Trigger automated SMS credentials to customer mobile</span>
              </label>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <Button variant="ghost" size="sm" type="button" onClick={() => setActivatingLead(null)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  isLoading={isActivating}
                  className="bg-[#008751] hover:bg-[#006B3E] text-white font-bold"
                >
                  Activate &amp; Create Credential
                </Button>
              </div>
            </form>
          )
        )}
      </Modal>
    </DashboardShell>
  );
}
