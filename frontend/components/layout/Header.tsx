'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Icons } from '@/components/ui/Icons';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export const Header: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();

  const getDashboardLink = () => {
    if (!user) return '/login';
    if (user.role === 'admin') return '/admin/dashboard';
    if (user.role === 'cr') return '/cr/dashboard';
    return '/customer/dashboard';
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5">
          <Icons.Logo className="w-9 h-9 sm:w-10 sm:h-10 object-contain" />
          <div>
            <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900 block leading-tight">
              SUNSET GROUP
            </span>
            <span className="text-[9px] sm:text-[10px] tracking-wider uppercase font-semibold text-slate-500 block">
              Customer Application Platform
            </span>
          </div>
        </Link>

        {/* Navigation & User actions */}
        <div className="flex items-center gap-3">
          {isAuthenticated && user ? (
            <>
              {/* Desktop Only Nav Links */}
              <div className="hidden md:flex items-center gap-4">
                <Link
                  href={getDashboardLink()}
                  className="text-sm font-medium text-slate-700 hover:text-[#008751] transition-colors"
                >
                  Dashboard
                </Link>

                {user.role === 'customer' && (
                  <Link
                    href="/customer/apply"
                    className="text-sm font-medium text-slate-700 hover:text-[#008751] transition-colors"
                  >
                    New Application
                  </Link>
                )}

                {user.role === 'admin' && (
                  <>
                    <Link
                      href="/admin/users"
                      className="text-sm font-medium text-slate-700 hover:text-[#008751] transition-colors"
                    >
                      User Management
                    </Link>
                    <Link
                      href="/admin/exports"
                      className="text-sm font-medium text-slate-700 hover:text-[#008751] transition-colors"
                    >
                      Export Center
                    </Link>
                  </>
                )}

                <div className="h-5 w-px bg-slate-200" />
              </div>

              {/* User profile / badge */}
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="text-right">
                  <div className="text-xs font-semibold text-slate-900 leading-tight hidden sm:block">
                    {user.full_name || user.phone_number}
                  </div>
                  <Badge variant={user.role === 'admin' ? 'purple' : user.role === 'cr' ? 'info' : 'success'}>
                    {user.role.toUpperCase()}
                  </Badge>
                </div>

                {/* Desktop Signout button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                  title="Sign out"
                  className="hidden md:inline-flex text-slate-500 hover:text-rose-600"
                >
                  <Icons.LogOut className="w-4 h-4" />
                </Button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="primary" size="sm">
                  Sign In
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
