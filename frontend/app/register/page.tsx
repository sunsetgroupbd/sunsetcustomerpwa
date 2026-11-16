'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icons } from '@/components/ui/Icons';

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex flex-col items-center gap-2 mb-4">
          <Icons.Logo className="w-14 h-14 object-contain" />
          <span className="text-xl font-bold tracking-tight text-slate-900">SUNSET GROUP</span>
        </Link>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Portal Access Notice</h2>
        <p className="mt-1 text-xs text-slate-500">Official Ownership &amp; Shareholder Portal</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <Card className="text-center p-6 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#008751]/10 text-[#008751] flex items-center justify-center mx-auto">
            <Icons.Shield className="w-7 h-7" />
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-900">Admin Provisioned Accounts</h3>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              Customer accounts and ownership registrations are managed and issued directly by the <strong>Sunset Group Administration</strong> and <strong>Customer Relations (CR)</strong> team to safeguard shareholder records and investment privacy.
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-left text-xs text-slate-600 space-y-1.5">
            <div className="flex items-start gap-2">
              <Icons.CheckCircle className="w-4 h-4 text-[#008751] shrink-0 mt-0.5" />
              <span>Already received your credentials? Sign in below with your mobile number and password.</span>
            </div>
            <div className="flex items-start gap-2">
              <Icons.CheckCircle className="w-4 h-4 text-[#008751] shrink-0 mt-0.5" />
              <span>Need access? Contact your assigned Sunset Group Relationship Manager.</span>
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <Link href="/login" className="w-full">
              <Button variant="primary" className="w-full justify-center">
                Sign In to Your Account
              </Button>
            </Link>
            <Link href="/" className="w-full">
              <Button variant="ghost" className="w-full justify-center text-xs">
                Back to Home Page
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
