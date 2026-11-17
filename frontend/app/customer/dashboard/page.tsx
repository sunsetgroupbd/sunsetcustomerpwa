'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Application, CustomerProfileData } from '@/lib/types';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Icons } from '@/components/ui/Icons';

// Colorful Floating Balloon Celebration Component
interface BalloonProps {
  color: string;
  leftPercent: number;
  delaySec: number;
  durationSec: number;
  sizePx: number;
}

const BALLOON_COLORS = [
  '#E11D48', // Ruby
  '#008751', // Sunset Emerald
  '#F59E0B', // Rich Amber/Gold
  '#2563EB', // Sapphire Blue
  '#9333EA', // Vivid Purple
  '#EA580C', // Tangerine
  '#06B6D4', // Sky Cyan
  '#EC4899', // Rose Pink
];

const BALLOONS_CONFIG: BalloonProps[] = [
  { color: '#008751', leftPercent: 6, delaySec: 0, durationSec: 8.5, sizePx: 52 },
  { color: '#E11D48', leftPercent: 14, delaySec: 1.2, durationSec: 9.2, sizePx: 60 },
  { color: '#F59E0B', leftPercent: 24, delaySec: 0.5, durationSec: 7.8, sizePx: 46 },
  { color: '#2563EB', leftPercent: 35, delaySec: 2.1, durationSec: 8.8, sizePx: 56 },
  { color: '#9333EA', leftPercent: 46, delaySec: 0.8, durationSec: 9.5, sizePx: 64 },
  { color: '#EA580C', leftPercent: 55, delaySec: 1.8, durationSec: 8.2, sizePx: 48 },
  { color: '#06B6D4', leftPercent: 65, delaySec: 0.3, durationSec: 7.9, sizePx: 54 },
  { color: '#EC4899', leftPercent: 74, delaySec: 2.5, durationSec: 9.0, sizePx: 58 },
  { color: '#008751', leftPercent: 83, delaySec: 1.0, durationSec: 8.4, sizePx: 50 },
  { color: '#F59E0B', leftPercent: 92, delaySec: 1.6, durationSec: 8.0, sizePx: 62 },
];

export default function CustomerDashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [profileData, setProfileData] = useState<CustomerProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showBirthdayModal, setShowBirthdayModal] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    async function loadDashboardData() {
      try {
        const [appsRes, profRes] = await Promise.all([
          api.applications.list().catch(() => ({ items: [] })),
          api.profile.get().catch(() => null),
        ]);

        const items: Application[] = Array.isArray(appsRes)
          ? appsRes
          : ((appsRes as any)?.items || (appsRes as any)?.data || []);
        setApplications(items);

        if (profRes) {
          setProfileData(profRes);

          // Check if today is the customer's birthday
          const dob = profRes.profile?.date_of_birth;
          if (dob) {
            try {
              const parts = dob.split('T')[0].split('-');
              if (parts.length >= 3) {
                const bMonth = parseInt(parts[1], 10);
                const bDay = parseInt(parts[2], 10);
                const now = new Date();
                const isBirthday = (now.getMonth() + 1 === bMonth) && (now.getDate() === bDay);

                if (isBirthday) {
                  const seenKey = `sunset_bday_seen_${user?.id || 'user'}_${now.getFullYear()}_${bMonth}_${bDay}`;
                  if (!sessionStorage.getItem(seenKey)) {
                    setShowBirthdayModal(true);
                  }
                }
              }
            } catch (err) {
              console.error('Error calculating birthday', err);
            }
          }
        }
      } catch (e) {
        console.error('Failed to load customer dashboard data', e);
      } finally {
        setIsLoading(false);
      }
    }

    if (user) {
      loadDashboardData();
    }
  }, [user, authLoading, router]);

  const handleDismissBirthday = () => {
    if (user) {
      const now = new Date();
      const seenKey = `sunset_bday_seen_${user.id}_${now.getFullYear()}_${now.getMonth() + 1}_${now.getDate()}`;
      try {
        sessionStorage.setItem(seenKey, 'true');
      } catch {}
    }
    setShowBirthdayModal(false);
  };

  const draftApps = applications.filter((app) => app.status === 'draft');
  const actionRequiredApps = applications.filter((app) => app.status === 'action_required');
  const submittedApps = applications.filter((app) => app.status !== 'draft');

  // Customer ID resolution
  const resolvedCustomerId =
    user?.customer_id_number ||
    profileData?.customer_id_number ||
    applications.find((a) => a.customer_id_number)?.customer_id_number ||
    null;

  return (
    <DashboardShell
      title={`Welcome back, ${user?.full_name || 'Customer'}`}
      subtitle="Track your Sunset Group ownership applications and investment portfolio."
      actions={
        <div className="flex items-center gap-2">
          <Link href="/customer/profile">
            <Button variant="outline" size="sm" className="flex items-center gap-1.5">
              <Icons.User className="w-4 h-4" />
              <span>My Profile</span>
            </Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Customer ID / Ownership Identification Card */}
        <div className="relative overflow-hidden bg-[#008751] text-white rounded-2xl p-4 sm:p-5 shadow-sm border border-emerald-800">
          {/* Subtle SVG Corner Accent Shape - Matching Home Page Ownership Cards */}
          <div className="absolute top-0 right-0 w-36 h-36 overflow-hidden pointer-events-none rounded-tr-2xl">
            <svg viewBox="0 0 100 100" className="w-full h-full text-white/10" fill="currentColor">
              <path d="M0,0 L100,0 L100,100 C70,100 50,80 40,60 C30,40 15,20 0,0 Z" />
            </svg>
          </div>
          <div className="absolute -bottom-8 -left-8 w-28 h-28 overflow-hidden pointer-events-none opacity-40">
            <svg viewBox="0 0 100 100" className="w-full h-full text-white/10" fill="currentColor">
              <path d="M100,100 L0,100 L0,0 C30,0 50,20 60,40 C70,60 85,80 100,100 Z" />
            </svg>
          </div>

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0 border border-white/25">
                <Icons.Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-100">
                    Investor ID
                  </span>
                  {resolvedCustomerId ? (
                    <span className="bg-emerald-400/25 text-white border border-emerald-300/40 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Icons.CheckCircle className="w-3 h-3 text-emerald-200" />
                      Verified
                    </span>
                  ) : (
                    <span className="bg-amber-400/20 text-amber-100 border border-amber-300/30 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                      Pending Admin Approval
                    </span>
                  )}
                </div>
                <div className="text-xl sm:text-2xl font-black font-mono tracking-wider text-white mt-0.5">
                  {resolvedCustomerId || 'SG-PENDING'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <Link href="/customer/profile">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white/10 hover:bg-white/20 text-white border-white/30 text-xs font-semibold px-3 py-1.5"
                >
                  View Profile
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Action Required Banner */}
        {actionRequiredApps.length > 0 && (
          <Alert
            type="warning"
            title="Action Required on Application"
            className="animate-in fade-in"
          >
            Our Customer Relations team has requested document or information correction for application{' '}
            <span className="font-mono font-bold">{actionRequiredApps[0].reference_number}</span>.{' '}
            <Link
              href={`/customer/applications/${actionRequiredApps[0].id}`}
              className="font-bold underline ml-1"
            >
              Click here to view instructions and uploaded records.
            </Link>
          </Alert>
        )}

        {/* Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-slate-200">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Total Applications
            </span>
            <div className="flex items-center justify-between mt-2">
              <span className="text-2xl font-bold text-slate-900">{applications.length}</span>
              <Icons.FileText className="w-5 h-5 text-slate-400" />
            </div>
          </Card>

          <Card className="border-slate-200">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Under Review / CR Processing
            </span>
            <div className="flex items-center justify-between mt-2">
              <span className="text-2xl font-bold text-blue-600">
                {applications.filter((a) => a.status === 'under_review' || a.status === 'submitted' || a.status === 'draft').length}
              </span>
              <Icons.Clock className="w-5 h-5 text-blue-500" />
            </div>
          </Card>

          <Card className="border-slate-200">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Approved Ownerships
            </span>
            <div className="flex items-center justify-between mt-2">
              <span className="text-2xl font-bold text-[#008751]">
                {applications.filter((a) => a.status === 'approved').length}
              </span>
              <Icons.CheckCircle className="w-5 h-5 text-[#008751]" />
            </div>
          </Card>
        </div>

        {/* Incomplete / In-Progress Draft Applications Section */}
        {draftApps.length > 0 && (
          <Card
            title="In-Progress Applications (CR Team Processing)"
            subtitle="These ownership files have been registered and are being prepared by Customer Relations."
          >
            <div className="divide-y divide-slate-100">
              {draftApps.map((draft) => (
                <div
                  key={draft.id}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900">
                        {draft.reference_number}
                      </span>
                      <Badge status="draft">CR Processing (Step {draft.current_step} of 9)</Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {draft.business?.name || 'Sunset Division'} &bull; Registered on{' '}
                      {new Date(draft.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Link href={`/customer/applications/${draft.id}`}>
                    <Button variant="outline" size="sm" rightIcon={<Icons.ArrowRight className="w-3.5 h-3.5" />}>
                      View Application Details
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Submitted Applications Table */}
        <Card
          title="Submitted &amp; Approved Applications"
          subtitle="Real-time status tracking, verified valuation, and documentation records."
        >
          {isLoading ? (
            <div className="py-8 text-center text-xs text-slate-500">
              <Icons.Spinner className="w-6 h-6 text-[#008751] mx-auto mb-2" />
              Loading your applications...
            </div>
          ) : submittedApps.length === 0 && draftApps.length === 0 ? (
            <div className="text-center py-10">
              <Icons.FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h4 className="text-sm font-semibold text-slate-900">No applications registered yet</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
                Your ownership application is registered by your assigned Sunset Group Sales Executive and processed by our Customer Relations (CR) team. Once registered, your application details and real-time status will appear here.
              </p>
            </div>
          ) : (
            <div>
              {/* Mobile Card List */}
              <div className="md:hidden divide-y divide-slate-100">
                {submittedApps.map((app) => (
                  <Link
                    key={app.id}
                    href={`/customer/applications/${app.id}`}
                    className="py-3.5 block hover:bg-slate-50 active:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono font-bold text-xs text-slate-900">
                        {app.reference_number}
                      </span>
                      <Badge status={app.status} />
                    </div>
                    <h4 className="text-sm font-semibold text-slate-800">
                      {app.business?.name || 'Sunset Division'}
                    </h4>
                    <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
                      <span>
                        {app.ownership_detail?.package_type || 'Ownership'} ({app.ownership_detail?.number_of_ownership || 1} share)
                      </span>
                      <span className="text-slate-400">
                        {app.submission_date ? new Date(app.submission_date).toLocaleDateString() : '-'}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-y border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Reference No.</th>
                      <th className="py-3 px-4">Division</th>
                      <th className="py-3 px-4">Package</th>
                      <th className="py-3 px-4">Submission Date</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {submittedApps.map((app) => (
                      <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {app.reference_number}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800">
                          {app.business?.name || 'Sunset Division'}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {app.ownership_detail?.package_type || 'Ownership'} ({app.ownership_detail?.number_of_ownership || 1} share)
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {app.submission_date ? new Date(app.submission_date).toLocaleDateString() : '-'}
                        </td>
                        <td className="py-3 px-4">
                          <Badge status={app.status} />
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link href={`/customer/applications/${app.id}`}>
                            <Button variant="ghost" size="sm" className="text-[#008751] hover:text-[#007043] font-semibold">
                              View Details
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Animated Birthday Celebration Overlay */}
      {showBirthdayModal && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-300">
          {/* Floating Balloons Canvas */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {BALLOONS_CONFIG.map((b, i) => (
              <div
                key={i}
                className="absolute balloon-floating"
                style={{
                  left: `${b.leftPercent}%`,
                  bottom: '-80px',
                  animationDelay: `${b.delaySec}s`,
                  animationDuration: `${b.durationSec}s`,
                }}
              >
                {/* SVG Balloon */}
                <svg
                  width={b.sizePx}
                  height={b.sizePx * 1.5}
                  viewBox="0 0 60 90"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="filter drop-shadow-md"
                >
                  {/* Balloon Oval */}
                  <ellipse cx="30" cy="32" rx="26" ry="30" fill={b.color} />
                  {/* Shiny Highlight */}
                  <ellipse
                    cx="22"
                    cy="20"
                    rx="6"
                    ry="10"
                    fill="white"
                    fillOpacity="0.4"
                    transform="rotate(-25 22 20)"
                  />
                  {/* Tie Knot */}
                  <polygon points="26,62 34,62 30,66" fill={b.color} />
                  {/* Dangling String */}
                  <path
                    d="M30 66 Q26 74 34 82 T30 90"
                    stroke="#cbd5e1"
                    strokeWidth="1.5"
                    fill="none"
                  />
                </svg>
              </div>
            ))}
          </div>

          {/* Celebratory Card */}
          <div className="relative z-10 max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 text-center shadow-2xl border-2 border-amber-300 animate-in zoom-in-95 duration-300">
            {/* Top Confetti & Balloon Icon */}
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-tr from-amber-400 via-rose-400 to-[#008751] p-1 shadow-lg shadow-amber-400/30 mb-4 animate-bounce">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-3xl">
                🎈
              </div>
            </div>

            <span className="inline-block px-3 py-1 bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold uppercase tracking-wider rounded-full mb-2">
              🎉 Happy Birthday! 🎉
            </span>

            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
              Wishing You a Joyous Birthday,
              <br />
              <span className="text-[#008751]">{user?.full_name || 'Valued Partner'}</span>!
            </h2>

            <p className="text-xs sm:text-sm text-slate-600 mt-3 leading-relaxed">
              On this wonderful day, the entire Sunset Group family extends our warmest greetings and best wishes. May your upcoming year be blessed with great health, boundless joy, and extraordinary prosperity!
            </p>

            <div className="mt-5 py-2.5 px-3 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-500 font-medium leading-tight">
              Sunset Kuakata Hotel &amp; Resort &bull; Dhaka Fantasy Island &bull; Sun Care Hospital &bull; Super Combo
            </div>

            <div className="mt-6">
              <Button
                variant="primary"
                size="lg"
                onClick={handleDismissBirthday}
                className="w-full bg-[#008751] hover:bg-[#007043] text-white shadow-lg shadow-[#008751]/25 text-sm font-bold py-3"
              >
                Thank You So Much! 🎈
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Balloon CSS Animation */}
      <style jsx global>{`
        @keyframes floatBalloon {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 0.95;
          }
          50% {
            transform: translateY(-55vh) rotate(8deg);
          }
          85% {
            opacity: 0.95;
          }
          100% {
            transform: translateY(-115vh) rotate(-10deg);
            opacity: 0;
          }
        }
        .balloon-floating {
          animation: floatBalloon linear infinite;
        }
      `}</style>
    </DashboardShell>
  );
}
