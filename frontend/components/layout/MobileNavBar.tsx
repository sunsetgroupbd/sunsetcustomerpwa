'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { InAppNotification } from '@/lib/types';
import { Icons } from '@/components/ui/Icons';

export const MobileNavBar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const fetchNotifications = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await api.notifications.list(false, 30, 0);
      if (res && res.items) {
        setNotifications(res.items);
        setUnreadCount(res.unread_count || 0);
      }
    } catch {
      // silently ignore background fetch errors
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const handleMarkAllRead = async () => {
    try {
      await api.notifications.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleNotificationClick = async (notif: InAppNotification) => {
    if (!notif.is_read) {
      try {
        await api.notifications.markRead(notif.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.error('Failed to mark notification as read:', err);
      }
    }
    setIsNotifOpen(false);
    if (notif.link_url) {
      router.push(notif.link_url);
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'approval':
        return (
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <Icons.CheckCircle className="w-4 h-4" />
          </div>
        );
      case 'rejection':
      case 'correction_required':
        return (
          <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
            <Icons.AlertCircle className="w-4 h-4" />
          </div>
        );
      case 'documents_required':
      case 'edit_request':
        return (
          <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <Icons.AlertTriangle className="w-4 h-4" />
          </div>
        );
      case 'assignment':
        return (
          <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
            <Icons.Shield className="w-4 h-4" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
            <Icons.FileText className="w-4 h-4" />
          </div>
        );
    }
  };

  // Navigation items based on role
  const getNavItems = () => {
    if (!isAuthenticated || !user) {
      return [
        { label: 'Home', href: '/', icon: Icons.Home },
        { label: 'Projects', href: '/#projects', icon: Icons.Building },
        { label: 'Sign In', href: '/login', icon: Icons.User },
      ];
    }

    if (user.role === 'customer') {
      return [
        { label: 'Dashboard', href: '/customer/dashboard', icon: Icons.FileText },
        { label: 'Notifications', isNotif: true, icon: Icons.Bell, badge: unreadCount },
        { label: 'My Profile', href: '/profile', icon: Icons.User },
      ];
    }

    if (user.role === 'cr') {
      return [
        { label: 'CR Queue', href: '/cr/dashboard', icon: Icons.FileText },
        { label: 'Notifications', isNotif: true, icon: Icons.Bell, badge: unreadCount },
        { label: 'Profile', href: '/profile', icon: Icons.User },
      ];
    }

    if (user.role === 'sales') {
      return [
        { label: 'Sales Desk', href: '/sales/dashboard', icon: Icons.FileText },
        { label: 'Notifications', isNotif: true, icon: Icons.Bell, badge: unreadCount },
        { label: 'Profile', href: '/profile', icon: Icons.User },
      ];
    }

    // Admin & Subadmin
    return [
      { label: 'Overview', href: '/admin/dashboard', icon: Icons.Building },
      { label: 'Notifications', isNotif: true, icon: Icons.Bell, badge: unreadCount },
      { label: 'Users', href: '/admin/users', icon: Icons.Users },
      { label: 'Profile', href: '/profile', icon: Icons.User },
    ];
  };

  const navItems = getNavItems();

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href?: string) => {
    if (href === '/#projects') {
      if (pathname === '/') {
        e.preventDefault();
        const el = document.getElementById('projects');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    } else if (href === '/' && pathname === '/') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <>
      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1 shadow-lg no-print">
        <div className="flex items-center justify-around h-14 max-w-md mx-auto">
          {navItems.map((item, idx) => {
            if (item.isNotif) {
              const hasUnread = (item.badge || 0) > 0;
              return (
                <button
                  key={`notif-${idx}`}
                  type="button"
                  onClick={() => {
                    setIsNotifOpen(!isNotifOpen);
                    if (!isNotifOpen) fetchNotifications();
                  }}
                  className={`relative flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
                    isNotifOpen ? 'text-[#008751]' : 'text-slate-500 hover:text-slate-900'
                  }`}
                  aria-label="Toggle notifications"
                >
                  <div
                    className={`relative p-1 rounded-full transition-all ${
                      isNotifOpen ? 'bg-[#008751]/10 scale-105' : ''
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    {hasUnread && (
                      <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-4 px-1 text-[9px] font-bold text-white bg-rose-600 rounded-full border border-white ring-1 ring-rose-600/30 animate-pulse">
                        {(item.badge || 0) > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] tracking-tight mt-0.5 ${isNotifOpen ? 'font-bold' : 'font-medium'}`}>
                    {item.label}
                  </span>
                </button>
              );
            }

            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href || '#'}
                onClick={(e) => handleNavClick(e, item.href)}
                className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
                  isActive ? 'text-[#008751]' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <div
                  className={`p-1 rounded-full transition-all ${
                    isActive ? 'bg-[#008751]/10 scale-105' : ''
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className={`text-[10px] tracking-tight mt-0.5 ${isActive ? 'font-bold' : 'font-medium'}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Mobile Bottom Notification Drawer / Sheet */}
      {isNotifOpen && (
        <div className="md:hidden fixed inset-0 z-[100] flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setIsNotifOpen(false)}
          />

          {/* Bottom Sheet Card */}
          <div className="relative bg-white w-full rounded-t-2xl shadow-2xl border-t border-slate-200 z-10 max-h-[80vh] flex flex-col transform transition-all animate-in slide-in-from-bottom duration-200">
            {/* Sheet Handle */}
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto my-2 shrink-0" />

            {/* Header */}
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 text-sm">Notifications</span>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 text-xs font-semibold bg-rose-100 text-rose-700 rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs font-semibold text-[#008751] hover:underline"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setIsNotifOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
                  aria-label="Close notifications sheet"
                >
                  <Icons.X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Notifications Scroll List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 pb-16">
              {notifications.length === 0 ? (
                <div className="py-12 px-4 text-center">
                  <div className="w-12 h-12 mx-auto mb-2 text-slate-300 flex items-center justify-center">
                    <Icons.Bell className="w-8 h-8 opacity-40" />
                  </div>
                  <p className="text-xs text-slate-600 font-semibold">You&apos;re all caught up!</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">No notifications at this time.</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`px-4 py-3 hover:bg-slate-50 active:bg-slate-100 cursor-pointer transition-colors flex gap-3 text-left ${
                      !notif.is_read ? 'bg-emerald-50/50' : ''
                    }`}
                  >
                    {getNotificationIcon(notif.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <p className={`text-xs ${!notif.is_read ? 'font-bold text-slate-900' : 'font-medium text-slate-800'} line-clamp-1`}>
                          {notif.title}
                        </p>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap shrink-0">
                          {formatTimeAgo(notif.created_at)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2 leading-relaxed">
                        {notif.message}
                      </p>
                    </div>
                    {!notif.is_read && (
                      <div className="w-2 h-2 rounded-full bg-[#008751] self-center shrink-0" />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
