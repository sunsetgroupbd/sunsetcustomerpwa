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
import { Icons } from '@/components/ui/Icons';

export default function AdminUsersPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const res = await api.admin.users({
        role: roleFilter || undefined,
        search: searchTerm || undefined,
      });
      setUsers(res.items || []);
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

  return (
    <DashboardShell
      title="User &amp; Permission Management"
      subtitle="Manage customer profiles, Customer Relations representatives, and system administrators."
    >
      <div className="space-y-6">
        {statusMsg && <Alert type={statusMsg.type}>{statusMsg.text}</Alert>}

        {/* Filter Bar */}
        <Card className="p-4">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search by name, phone number, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#006B3E]/30"
              />
              <Icons.Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#006B3E]/30"
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
        </Card>

        {/* Users Table */}
        <Card title="User Directory" subtitle={`Showing ${users.length} registered accounts`}>
          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-500">
              <Icons.Spinner className="w-6 h-6 text-[#006B3E] mx-auto mb-2" />
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
                      <td className="py-3 px-4 font-mono text-slate-800">{u.phone_number}</td>
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
                        {u.role !== 'admin' && (
                          <Button
                            variant={u.is_active ? 'outline' : 'primary'}
                            size="sm"
                            onClick={() => handleToggleStatus(u)}
                            className={u.is_active ? 'text-rose-600 hover:border-rose-300' : ''}
                          >
                            {u.is_active ? 'Suspend' : 'Activate'}
                          </Button>
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
    </DashboardShell>
  );
}

