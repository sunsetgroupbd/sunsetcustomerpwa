'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Header } from './Header';
import { Footer } from './Footer';
import { MobileNavBar } from './MobileNavBar';
import { Icons } from '@/components/ui/Icons';

interface DashboardShellProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

function NavTabs() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams ? searchParams.get('tab') : null;
  const { user } = useAuth();

  const isAdmin = user?.role === 'admin' || user?.role === 'subadmin';
  const isCr = user?.role === 'cr';
  const isSales = user?.role === 'sales';

  if (!isAdmin && !isCr && !isSales) return null;

  const adminNav = [
    { label: 'Overview', href: '/admin/dashboard', icon: Icons.Building },
    { label: 'Applications', href: '/admin/dashboard?tab=applications', icon: Icons.FileText },
    { label: 'Edit Requests', href: '/admin/dashboard?tab=edit-requests', icon: Icons.Shield },
    { label: 'Users & Permissions', href: '/admin/users', icon: Icons.Users },
    { label: 'Export Center', href: '/admin/exports', icon: Icons.Download },
  ];

  const crNav = [
    { label: 'Assigned Applications', href: '/cr/dashboard', icon: Icons.FileText },
    { label: 'Onboarded Leads', href: '/cr/leads', icon: Icons.Users },
  ];

  const salesNav = [
    { label: 'Sales Desk', href: '/sales/dashboard', icon: Icons.FileText },
  ];

  const checkIsActive = (href: string) => {
    if (href.includes('?tab=')) {
      const tabName = href.split('?tab=')[1];
      return pathname === '/admin/dashboard' && currentTab === tabName;
    }
    if (href === '/admin/dashboard') {
      return pathname === '/admin/dashboard' && !currentTab;
    }
    return pathname === href;
  };

  const currentNav = isAdmin ? adminNav : isCr ? crNav : salesNav;

  return (
    <div className="mb-6 relative">
      {/* Outer wrapper with clean rounded container & touch-friendly scroll */}
      <div className="flex items-center gap-1.5 sm:gap-2 p-1 sm:p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200/80 overflow-x-auto no-scrollbar scroll-smooth">
        {currentNav.map((item) => {
          const isActive = checkIsActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1.5 sm:gap-2 py-2 px-3 sm:px-3.5 rounded-xl font-medium text-xs sm:text-sm whitespace-nowrap transition-all duration-150 select-none ${
                isActive
                  ? 'bg-white text-[#008751] font-bold shadow-xs border border-slate-200/60 ring-1 ring-black/5'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${isActive ? 'text-[#008751]' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export const DashboardShell: React.FC<DashboardShellProps> = ({
  children,
  title,
  subtitle,
  actions,
}) => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8 pb-24 md:pb-8">
        {/* Secondary navigation for Admin/CR wrapped in Suspense for searchParams */}
        <Suspense fallback={null}>
          <NavTabs />
        </Suspense>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
            {subtitle && <p className="text-xs sm:text-sm text-slate-500 mt-1">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>

        {/* Main Content */}
        <main>{children}</main>
      </div>

      <Footer />
      <MobileNavBar />
    </div>
  );
};
