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

  const isAdmin = user?.role === 'admin';
  const isCr = user?.role === 'cr';

  if (!isAdmin && !isCr) return null;

  const adminNav = [
    { label: 'Overview', href: '/admin/dashboard', icon: Icons.Building },
    { label: 'Applications', href: '/admin/dashboard?tab=applications', icon: Icons.FileText },
    { label: 'Users & Permissions', href: '/admin/users', icon: Icons.Users },
    { label: 'Export Center', href: '/admin/exports', icon: Icons.Download },
  ];

  const crNav = [
    { label: 'Assigned Applications', href: '/cr/dashboard', icon: Icons.FileText },
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

  return (
    <div className="mb-6 flex border-b border-slate-200 overflow-x-auto no-scrollbar">
      {(isAdmin ? adminNav : crNav).map((item) => {
        const isActive = checkIsActive(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2 py-2.5 px-3.5 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
              isActive
                ? 'border-[#008751] text-[#008751] bg-[#008751]/5 font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <Icon className="w-4 h-4" />
            {item.label}
          </Link>
        );
      })}
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
