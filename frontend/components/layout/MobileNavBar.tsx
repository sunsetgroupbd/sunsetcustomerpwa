'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Icons } from '@/components/ui/Icons';

export const MobileNavBar: React.FC = () => {
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuth();

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
        { label: 'My Profile', href: '/customer/profile', icon: Icons.User },
      ];
    }

    if (user.role === 'cr') {
      return [
        { label: 'CR Queue', href: '/cr/dashboard', icon: Icons.FileText },
        { label: 'Home', href: '/', icon: Icons.Home },
      ];
    }

    if (user.role === 'sales') {
      return [
        { label: 'Sales Desk', href: '/sales/dashboard', icon: Icons.FileText },
        { label: 'Home', href: '/', icon: Icons.Home },
      ];
    }

    // Admin
    return [
      { label: 'Overview', href: '/admin/dashboard', icon: Icons.Building },
      { label: 'Users', href: '/admin/users', icon: Icons.Users },
      { label: 'Exports', href: '/admin/exports', icon: Icons.Download },
    ];
  };

  const navItems = getNavItems();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1 shadow-lg">
      <div className="flex items-center justify-around h-14 max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
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
  );
};
