'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { User } from '@/lib/types';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Icons } from '@/components/ui/Icons';

export default function AdminUsersPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Create User Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newMobile, setNewMobile] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'customer' | 'cr' | 'admin'>('customer');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [createdSuccess, setCreatedSuccess] = useState<{
    fullName: string;
    mobile: string;
    role: string;
    tempPass: string;
  } | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Delete User Modal state
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const res = await api.admin.users({
        role: roleFilter || undefined,
        search: searchTerm || undefined,
      });
      const items = Array.isArray(res) ? res : ((res as any)?.items || (res as any)?.data || []);
      setUsers(items);
    } catch (err: any) {
      console.error('Failed to load users', err);
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
      loadUsers();
    }
  }, [user, authLoading, roleFilter, router]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadUsers();
  };

  const handleToggleStatus = async (targetUser: User) => {
    try {
      await api.admin.updateUserStatus(targetUser.id, !targetUser.is_active);
      setStatusMsg({
        type: 'success',
        text: `User ${targetUser.full_name} is now ${!targetUser.is_active ? 'Active' : 'Suspended'}.`,
      });
      loadUsers();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to update user status.' });
    }
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      await api.admin.deleteUser(userToDelete.id);
      setStatusMsg({
        type: 'success',
        text: `User ${userToDelete.full_name} has been permanently deleted.`,
      });
      setUserToDelete(null);
      loadUsers();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to delete user.' });
    } finally {
      setIsDeleting(false);
    }
  };

  const generateRandomPassword = () => {
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const pass = `Sunset@${randomDigits}`;
    setNewPassword(pass);
  };

  const resetCreateForm = () => {
    setNewFullName('');
    setNewMobile('');
    setNewEmail('');
    setNewPassword('');
    setNewRole('customer');
    setModalError(null);
    setCreatedSuccess(null);
    setIsCopied(false);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!newFullName.trim()) {
      setModalError('Please enter the full name.');
      return;
    }

    const bdPhoneRegex = /^(?:\+?88)?01[3-9]\d{8}$/;
    if (!bdPhoneRegex.test(newMobile.trim())) {
      setModalError('Please enter a valid 11-digit Bangladeshi mobile number (e.g. 017XXXXXXXX).');
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      setModalError('Password must be at least 8 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.admin.createUser({
        full_name: newFullName.trim(),
        mobile: newMobile.trim(),
        email: newEmail.trim() || undefined,
        password: newPassword,
        role: newRole,
      });

      setCreatedSuccess({
        fullName: newFullName.trim(),
        mobile: newMobile.trim(),
        role: newRole,
        tempPass: newPassword,
      });

      loadUsers();
    } catch (err: any) {
      setModalError(err.message || 'Failed to create user account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!createdSuccess) return;
    const credsText = `Sunset Group Portal Credentials\nName: ${createdSuccess.fullName}\nPhone: ${createdSuccess.mobile}\nPassword: ${createdSuccess.tempPass}\nPortal URL: ${window.location.origin}/login`;
    navigator.clipboard.writeText(credsText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  return (
    <DashboardShell
      title="User &amp; Permission Management"
      subtitle="Provision customer accounts, Customer Relations officers, and administrators."
    >
      <div className="space-y-6">
        {statusMsg && <Alert type={statusMsg.type}>{statusMsg.text}</Alert>}

        {/* Filter and Action Bar */}
        <Card className="p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <form onSubmit={handleSearch} className="flex-1 flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Search by name, phone number, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#008751]/30"
                />
                <Icons.Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#008751]/30"
              >
                <option value="">All Roles</option>
                <option value="customer">Customers</option>
                <option value="cr">CR Team</option>
                <option value="admin">Administrators</option>
              </select>

              <Button type="submit" variant="secondary" size="sm">
                Search
              </Button>
            </form>

            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                resetCreateForm();
                setIsCreateModalOpen(true);
              }}
              className="flex items-center justify-center gap-1.5 shrink-0"
            >
              <Icons.Plus className="w-4 h-4" />
              <span>Create Account</span>
            </Button>
          </div>
        </Card>

        {/* Users Table */}
        <Card title="User Directory" subtitle={`Showing ${users.length} registered accounts`}>
          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-500">
              <Icons.Spinner className="w-6 h-6 text-[#008751] mx-auto mb-2" />
              Loading accounts...
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">No users found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-y border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Full Name</th>
                    <th className="py-3 px-4">Mobile Phone</th>
                    <th className="py-3 px-4">Email Address</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Account Status</th>
                    <th className="py-3 px-4">Joined Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900">{u.full_name}</td>
                      <td className="py-3 px-4 font-mono text-slate-800">{u.phone_number || (u as any).mobile}</td>
                      <td className="py-3 px-4 text-slate-500">{u.email || '-'}</td>
                      <td className="py-3 px-4">
                        <Badge variant={u.role === 'admin' ? 'purple' : u.role === 'cr' ? 'info' : 'default'}>
                          {u.role.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                            u.is_active
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {u.is_active ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {u.role !== 'admin' && (
                            <Button
                              variant={u.is_active ? 'outline' : 'primary'}
                              size="sm"
                              onClick={() => handleToggleStatus(u)}
                              className={u.is_active ? 'text-amber-700 hover:border-amber-300' : ''}
                            >
                              {u.is_active ? 'Suspend' : 'Activate'}
                            </Button>
                          )}
                          {String(u.id) !== String(user?.id) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setUserToDelete(u)}
                              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 p-1.5"
                              title="Delete User"
                            >
                              <Icons.Trash className="w-4 h-4" />
                            </Button>
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

      {/* Create Account Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          resetCreateForm();
        }}
        title="Create New Account"
        description="Provision customer investment profiles, CR officers, or administrators."
        maxWidth="md"
      >
        {createdSuccess ? (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-2">
              <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm">
                <Icons.CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                Account Created Successfully!
              </div>
              <p className="text-slate-600">
                The account has been provisioned and is ready for login. You can copy the credentials below to deliver to the user:
              </p>
              <div className="bg-white p-3 rounded-lg border border-emerald-100 font-mono text-[11px] text-slate-800 space-y-1">
                <div><span className="text-slate-400">Name:</span> {createdSuccess.fullName}</div>
                <div><span className="text-slate-400">Role:</span> {createdSuccess.role.toUpperCase()}</div>
                <div><span className="text-slate-400">Mobile:</span> {createdSuccess.mobile}</div>
                <div><span className="text-slate-400">Password:</span> {createdSuccess.tempPass}</div>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyCredentials}
                className="flex items-center gap-1.5"
              >
                {isCopied ? <Icons.Check className="w-4 h-4 text-emerald-600" /> : <Icons.Copy className="w-4 h-4" />}
                <span>{isCopied ? 'Copied to Clipboard' : 'Copy Credentials'}</span>
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  resetCreateForm();
                }}
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreateUser} className="space-y-4">
            {modalError && (
              <Alert type="error" className="mb-3">
                {modalError}
              </Alert>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Account Role <span className="text-rose-500">*</span>
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as any)}
                className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#008751]/30 font-medium"
              >
                <option value="customer">Customer (Investor / Shareholder)</option>
                <option value="cr">Customer Relations Officer (CR)</option>
                <option value="admin">System Administrator</option>
              </select>
            </div>

            <Input
              label="Full Name"
              required
              placeholder="e.g. Mohammad Rahman"
              value={newFullName}
              onChange={(e) => setNewFullName(e.target.value)}
            />

            <Input
              label="Mobile Phone Number"
              required
              type="tel"
              placeholder="017XXXXXXXX"
              helperText="11-digit Bangladeshi mobile number used as login identifier."
              value={newMobile}
              onChange={(e) => setNewMobile(e.target.value)}
            />

            <Input
              label="Email Address (Optional)"
              type="email"
              placeholder="customer@example.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Initial Password <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={generateRandomPassword}
                  className="text-[11px] font-semibold text-[#008751] hover:underline"
                >
                  Generate Password
                </button>
              </div>
              <Input
                required
                type="password"
                placeholder="Min 8 characters (e.g. Sunset@123)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  resetCreateForm();
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSubmitting}
              >
                Create Account
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete User Confirmation Modal */}
      <Modal
        isOpen={!!userToDelete}
        onClose={() => {
          if (!isDeleting) setUserToDelete(null);
        }}
        title="Delete User Account"
        description="Permanently remove this account and associated records."
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
              <Icons.Trash className="w-5 h-5" />
            </div>
            <div className="text-xs text-rose-900 leading-relaxed">
              <p className="font-semibold text-rose-800">Are you sure you want to delete this user?</p>
              <p className="mt-1 text-slate-600">
                You are about to delete <strong className="text-slate-900">{userToDelete?.full_name}</strong> (
                <span className="font-mono">{userToDelete?.phone_number || (userToDelete as any)?.mobile}</span>).
                This action cannot be undone.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setUserToDelete(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleConfirmDelete}
              isLoading={isDeleting}
              className="bg-rose-600 hover:bg-rose-700 text-white border-transparent"
            >
              Yes, Delete User
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardShell>
  );
}
