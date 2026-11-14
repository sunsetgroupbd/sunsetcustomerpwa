'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Business, Application } from '@/lib/types';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { ApplicationWizard } from '@/components/application-form/ApplicationWizard';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icons';

function ApplyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();

  const businessIdParam = searchParams.get('business_id');
  const appIdParam = searchParams.get('application_id');

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [existingApp, setExistingApp] = useState<Application | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    async function init() {
      try {
        const bizList = await api.businesses.list().catch(() => [
          { id: '1', code: 'SKH', name: 'Sunset Kuakata Hotel & Resort', slug: 'sunset-kuakata', description: null, logo_url: null, is_active: true },
          { id: '2', code: 'DFI', name: 'Dhaka Fantasy Island', slug: 'dhaka-fantasy-island', description: null, logo_url: null, is_active: true },
          { id: '3', code: 'SCH', name: 'Sun Care Hospital & Diagnostic Centre', slug: 'sun-care-hospital', description: null, logo_url: null, is_active: true },
          { id: '4', code: 'SPC', name: 'Super Combo', slug: 'super-combo', description: null, logo_url: null, is_active: true },
        ]);
        setBusinesses(bizList);

        if (appIdParam) {
          const app = await api.applications.get(appIdParam);
          if (app) {
            setExistingApp(app);
            const matchedBiz = bizList.find((b) => b.id === app.business_id);
            if (matchedBiz) setSelectedBusiness(matchedBiz);
          }
        } else if (businessIdParam) {
          const matchedBiz = bizList.find((b) => b.id === businessIdParam || b.code === businessIdParam);
          if (matchedBiz) setSelectedBusiness(matchedBiz);
        }
      } catch (err) {
        console.error('Failed to initialize application apply form', err);
      } finally {
        setIsLoading(false);
      }
    }

    if (user) {
      init();
    }
  }, [user, authLoading, businessIdParam, appIdParam, router]);

  if (isLoading) {
    return (
      <DashboardShell title="Application Registration" subtitle="Loading form...">
        <div className="py-16 text-center text-xs text-slate-500">
          <Icons.Spinner className="w-8 h-8 text-[#006B3E] mx-auto mb-3" />
          Initializing registration wizard...
        </div>
      </DashboardShell>
    );
  }

  // If no business selected yet, show clean business selection grid
  if (!selectedBusiness) {
    return (
      <DashboardShell
        title="Start Ownership Application"
        subtitle="Step 1: Choose the Sunset Group business division you wish to apply for."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {businesses.map((biz) => (
            <Card
              key={biz.id}
              className="hover:border-[#006B3E] hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#006B3E] bg-[#006B3E]/10 px-2 py-0.5 rounded">
                  {biz.code}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-3 mb-2">{biz.name}</h3>
                <p className="text-xs text-slate-500 mb-6">
                  {biz.description || 'Shared ownership with quarterly dividend distribution.'}
                </p>
              </div>

              <Button
                variant="primary"
                size="sm"
                className="w-full"
                onClick={() => setSelectedBusiness(biz)}
              >
                Select &amp; Continue
              </Button>
            </Card>
          ))}
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      title="Customer Ownership Application Form"
      subtitle={`Registering for ${selectedBusiness.name}`}
      actions={
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedBusiness(null)}
          leftIcon={<Icons.ArrowLeft className="w-4 h-4" />}
        >
          Change Division
        </Button>
      }
    >
      <ApplicationWizard
        business={selectedBusiness}
        existingApplication={existingApp}
        onSuccess={() => {
          // Success handled in step 9 of wizard
        }}
      />
    </DashboardShell>
  );
}

export default function ApplyPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs">Loading application form...</div>}>
      <ApplyContent />
    </Suspense>
  );
}

