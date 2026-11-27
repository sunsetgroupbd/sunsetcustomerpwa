'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNavBar } from '@/components/layout/MobileNavBar';
import { Business, ApplicationTrackStatus } from '@/lib/types';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Icons } from '@/components/ui/Icons';

export default function HomePage() {
  const router = useRouter();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'SKH' | 'DECK' | 'DFI' | 'SCH' | 'SPC'>('all');
  const [trackRef, setTrackRef] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Quick Tracker Modal & State
  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);
  const [isSearchingTrack, setIsSearchingTrack] = useState(false);
  const [trackResult, setTrackResult] = useState<ApplicationTrackStatus | null>(null);
  const [trackError, setTrackError] = useState<string | null>(null);

  useEffect(() => {
    async function loadBusinesses() {
      try {
        const data = await api.businesses.list();
        const list = Array.isArray(data) ? data : ((data as any)?.items || (data as any)?.data || []);
        setBusinesses(list);
      } catch (e) {
        // Fallback default divisions if backend is initializing
        setBusinesses([
          {
            id: '1',
            code: 'SKH',
            name: 'Sunset Kuakata Hotel & Resort',
            slug: 'sunset-kuakata',
            description: 'Luxury seaside hospitality suites & beachfront ownership at Kuakata Beach.',
            logo_url: null,
            is_active: true,
          },
          {
            id: '5',
            code: 'DECK',
            name: "The Deck – Cox's Bazar",
            slug: 'the-deck-coxs-bazar',
            description: "5-Star Standard Luxury Hotel and Resort at Inani Beach, Cox's Bazar with Saf-Kabala deed ownership.",
            logo_url: null,
            is_active: true,
          },
          {
            id: '2',
            code: 'DFI',
            name: 'Dhaka Fantasy Island',
            slug: 'dhaka-fantasy-island',
            description: 'Premier amusement theme park & family entertainment resort in Dhaka.',
            logo_url: null,
            is_active: true,
          },
          {
            id: '3',
            code: 'SCH',
            name: 'Sun Care Hospital & Diagnostic Centre',
            slug: 'sun-care-hospital',
            description: 'State-of-the-art multi-specialty healthcare, pathology, and diagnostic services.',
            logo_url: null,
            is_active: true,
          },
          {
            id: '4',
            code: 'SPC',
            name: 'Super Combo',
            slug: 'super-combo',
            description: 'Integrated multi-division commercial privileges and shared ownership bundle.',
            logo_url: null,
            is_active: true,
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    }
    loadBusinesses();

    if (typeof window !== 'undefined' && window.location.hash === '#projects') {
      setTimeout(() => {
        const el = document.getElementById('projects');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 200);
    }
  }, []);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanRef = trackRef.trim().toUpperCase();
    if (!cleanRef) return;

    setIsSearchingTrack(true);
    setTrackError(null);
    setTrackResult(null);
    setIsTrackModalOpen(true);

    try {
      const data = await api.applications.track(cleanRef);
      setTrackResult(data);
    } catch (err: any) {
      setTrackError(err.message || `Application reference "${cleanRef}" could not be located.`);
    } finally {
      setIsSearchingTrack(false);
    }
  };

  const filteredBusinesses =
    selectedFilter === 'all'
      ? businesses
      : businesses.filter((b) => b.code.toUpperCase() === selectedFilter);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 pb-20 md:pb-0">
      {/* Top Header */}
      <Header />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 pt-3 sm:pt-6 pb-12">
        {/* Mobile App Style Hero Card with Decorative SVG Shapes */}
        <section className="relative overflow-hidden rounded-3xl bg-[#008751] text-white p-5 sm:p-10 shadow-lg border border-emerald-800 mb-6">
          {/* SVG Background Shapes - Solid with Architectural Geometry */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Corner Geometric Shape (Matching division cards) */}
            <div className="absolute top-0 right-0 w-64 h-64 overflow-hidden pointer-events-none">
              <svg viewBox="0 0 100 100" className="w-full h-full text-white/[0.08]" fill="currentColor">
                <path d="M0,0 L100,0 L100,100 C70,100 50,80 40,60 C30,40 15,20 0,0 Z" />
              </svg>
            </div>
            <div className="absolute -bottom-10 -left-10 w-48 h-48 overflow-hidden pointer-events-none opacity-40">
              <svg viewBox="0 0 100 100" className="w-full h-full text-white/[0.08]" fill="currentColor">
                <path d="M100,100 L0,100 L0,0 C30,0 50,20 60,40 C70,60 85,80 100,100 Z" />
              </svg>
            </div>

            {/* Concentric Modern Tech Rings SVG */}
            <svg
              className="absolute -right-8 -bottom-12 w-80 h-80 text-white/[0.09]"
              viewBox="0 0 300 300"
              fill="none"
              stroke="currentColor"
            >
              <circle cx="150" cy="150" r="50" strokeWidth="1.5" strokeDasharray="4 4" />
              <circle cx="150" cy="150" r="85" strokeWidth="1.5" />
              <circle cx="150" cy="150" r="120" strokeWidth="1.5" strokeDasharray="6 6" />
              <circle cx="150" cy="150" r="145" strokeWidth="1" opacity="0.6" />
            </svg>

            {/* Subtle Corner Dot Grid SVG */}
            <svg
              className="absolute left-4 top-4 w-32 h-32 text-white/[0.07]"
              viewBox="0 0 200 200"
              fill="currentColor"
            >
              <circle cx="20" cy="20" r="3" />
              <circle cx="50" cy="20" r="3" />
              <circle cx="80" cy="20" r="3" />
              <circle cx="110" cy="20" r="3" />
              <circle cx="20" cy="50" r="3" />
              <circle cx="50" cy="50" r="3" />
              <circle cx="80" cy="50" r="3" />
              <circle cx="110" cy="50" r="3" />
              <circle cx="20" cy="80" r="3" />
              <circle cx="50" cy="80" r="3" />
              <circle cx="80" cy="80" r="3" />
              <circle cx="110" cy="80" r="3" />
            </svg>
          </div>

          <div className="relative z-10 max-w-3xl">
            {/* Official Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold bg-white/15 text-white border border-white/25 mb-4 shadow-xs">
              <Icons.Shield className="w-3.5 h-3.5 text-amber-300 shrink-0" size={14} />
              <span className="truncate">Official Sunset Group Ownership &amp; Registration Portal</span>
            </div>

            {/* Headline */}
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight mb-3 drop-shadow-sm">
              Invest in Bangladesh&apos;s Leading Hospitality &amp; Healthcare Projects
            </h1>

            {/* Subtitle */}
            <p className="text-xs sm:text-base text-emerald-50 leading-relaxed max-w-2xl mb-6 font-normal">
              Unified digital platform for customer application, shareholding ownership, and automated document verification across all Sunset Group divisions.
            </p>

            {/* Mobile App Native CTAs - Crystal Clear Text Visibility */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Link href="/login" className="flex-1 sm:flex-initial">
                <Button
                  variant="white"
                  size="lg"
                  className="w-full sm:w-auto rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-black/10 active:scale-[0.98]"
                >
                  <Icons.User className="w-5 h-5 text-[#008751]" size={20} />
                  <span className="font-bold text-[#007043]">Access Portal / Login</span>
                </Button>
              </Link>
              <a href="#track-section" className="flex-1 sm:flex-initial">
                <Button
                  variant="glass"
                  size="lg"
                  className="w-full sm:w-auto rounded-xl flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  <Icons.Search className="w-4 h-4 text-emerald-100" size={16} />
                  <span className="font-semibold text-white">Track Application</span>
                </Button>
              </a>
            </div>
          </div>
        </section>

        {/* Quick Application Tracker Section */}
        <section
          id="track-section"
          className="relative overflow-hidden bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-7 shadow-xs mb-8 scroll-mt-20"
        >
          {/* Subtle SVG Corner Accent */}
          <div className="absolute top-0 right-0 w-28 h-28 overflow-hidden pointer-events-none rounded-tr-3xl">
            <svg viewBox="0 0 100 100" className="w-full h-full text-slate-100/60" fill="currentColor">
              <path d="M0,0 L100,0 L100,100 C70,100 50,80 40,60 C30,40 15,20 0,0 Z" />
            </svg>
          </div>

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-5">
            <div className="flex items-center gap-3.5 w-full md:w-auto">
              <div className="w-12 h-12 rounded-2xl bg-[#008751]/10 text-[#008751] flex items-center justify-center shrink-0">
                <Icons.Search className="w-6 h-6 text-[#008751]" size={24} />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">Track Application Status</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Enter your application reference number from SMS (e.g. SKH-2026-00001) for real-time audit.
                </p>
              </div>
            </div>

            <form onSubmit={handleTrack} className="flex items-center gap-2 w-full md:w-auto">
              <input
                type="text"
                placeholder="Reference No. (e.g. SKH-2026-...)"
                value={trackRef}
                onChange={(e) => setTrackRef(e.target.value)}
                className="px-4 py-2.5 bg-slate-50 border border-slate-300 text-slate-900 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#008751] w-full md:w-64 font-mono font-medium"
              />
              <Button type="submit" variant="primary" size="md" className="rounded-xl shrink-0 font-bold bg-[#008751] hover:bg-[#007043]">
                Check Status
              </Button>
            </form>
          </div>
        </section>

        {/* Official Project Divisions Section */}
        <section id="projects" className="scroll-mt-20">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">Official Projects</h2>
              <p className="text-xs text-slate-500">Commercial projects managed under Sunset Group ownership</p>
            </div>
          </div>

        {/* Horizontal Scroll Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-3 mb-4">
          <button
            onClick={() => setSelectedFilter('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              selectedFilter === 'all'
                ? 'bg-[#008751] text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            All Projects
          </button>
          <button
            onClick={() => setSelectedFilter('SKH')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              selectedFilter === 'SKH'
                ? 'bg-[#008751] text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            Sunset Kuakata (SKH)
          </button>
          <button
            onClick={() => setSelectedFilter('DECK')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              selectedFilter === 'DECK'
                ? 'bg-[#008751] text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            The Deck (DECK)
          </button>
          <button
            onClick={() => setSelectedFilter('DFI')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              selectedFilter === 'DFI'
                ? 'bg-[#008751] text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            Fantasy Island (DFI)
          </button>
          <button
            onClick={() => setSelectedFilter('SCH')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              selectedFilter === 'SCH'
                ? 'bg-[#008751] text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            Sun Care Hospital (SCH)
          </button>
          <button
            onClick={() => setSelectedFilter('SPC')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              selectedFilter === 'SPC'
                ? 'bg-[#008751] text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            Super Combo (SPC)
          </button>
        </div>

        {/* Division Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {filteredBusinesses.map((biz) => {
            const isSKH = biz.code === 'SKH';
            const isDFI = biz.code === 'DFI';
            const isSCH = biz.code === 'SCH';

            const badgeColor = isSKH
              ? 'bg-emerald-50 text-[#008751] border-emerald-200'
              : isDFI
              ? 'bg-blue-50 text-blue-700 border-blue-200'
              : isSCH
              ? 'bg-teal-50 text-teal-700 border-teal-200'
              : 'bg-amber-50 text-amber-700 border-amber-200';

            return (
              <Card
                key={biz.id}
                className="relative overflow-hidden flex flex-col justify-between border-slate-200/90 rounded-2xl hover:border-[#008751]/40 hover:shadow-md transition-all p-5"
              >
                {/* Subtle SVG Corner Accent Shape */}
                <div className="absolute top-0 right-0 w-24 h-24 overflow-hidden pointer-events-none rounded-tr-2xl">
                  <svg viewBox="0 0 100 100" className="w-full h-full text-slate-100/70" fill="currentColor">
                    <path d="M0,0 L100,0 L100,100 C70,100 50,80 40,60 C30,40 15,20 0,0 Z" />
                  </svg>
                </div>

                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${badgeColor}`}>
                      {biz.code}
                    </span>
                    <div className="w-10 h-10 rounded-lg bg-white border border-slate-200/80 p-1 flex items-center justify-center shadow-2xs">
                      <img
                        src={
                          biz.code === 'SCH'
                            ? '/suncarelogo.png'
                            : biz.code === 'DFI'
                            ? '/dfilogo.png'
                            : biz.code === 'SPC'
                            ? '/sunsetcombologo.png'
                            : biz.code === 'DECK'
                            ? '/thedecklogo.png'
                            : '/sunsetlogo.png'
                        }
                        alt={biz.name}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 leading-snug mb-1.5">{biz.name}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed mb-4">
                    {biz.description || 'Premier commercial development offering secure shared ownership.'}
                  </p>

                  <div className="space-y-1.5 mb-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
                    <div className="flex items-center justify-between">
                      <span>Ownership Deed:</span>
                      <span className="font-semibold text-slate-700">Sub-Kabala</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Dividend:</span>
                      <span className="font-semibold text-emerald-600">Quarterly Yield</span>
                    </div>
                  </div>
                </div>

                <div className="relative z-10 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-500 font-medium">Registration:</span>
                  <span className="font-bold text-[#008751] bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded text-[11px]">
                    Sales Desk Managed
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
        </section>
      </main>

      {/* Footer */}
      <Footer />

      {/* Native Mobile Bottom Navigation Bar */}
      <MobileNavBar />

      {/* Track Status Lightbox Modal */}
      <Modal
        isOpen={isTrackModalOpen}
        onClose={() => {
          setIsTrackModalOpen(false);
          setTrackResult(null);
          setTrackError(null);
        }}
        title="Application Status Tracking"
      >
        <div className="space-y-4">
          {isSearchingTrack && (
            <div className="py-12 text-center text-xs text-slate-500">
              <Icons.Spinner className="w-7 h-7 text-[#008751] animate-spin mx-auto mb-3" />
              Verifying reference number and retrieving live records...
            </div>
          )}

          {trackError && !isSearchingTrack && (
            <div className="py-8 text-center space-y-3">
              <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
                <Icons.AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Application Not Found</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">{trackError}</p>
              </div>
              <p className="text-[11px] text-slate-400">
                Please double-check the reference ID received in your SMS (e.g. <span className="font-mono font-bold text-slate-600">SKH-2026-00001</span>).
              </p>
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsTrackModalOpen(false)}
                  className="rounded-xl"
                >
                  Close &amp; Re-check
                </Button>
              </div>
            </div>
          )}

          {trackResult && !isSearchingTrack && (
            <div className="space-y-4">
              {/* Header Box */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-mono font-bold text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                    {trackResult.application_number}
                  </span>
                  <Badge variant={
                    trackResult.status === 'approved'
                      ? 'success'
                      : trackResult.status === 'rejected'
                      ? 'danger'
                      : trackResult.status === 'correction_required' || trackResult.status === 'documents_required'
                      ? 'warning'
                      : 'info'
                  }>
                    {trackResult.status.replace(/_/g, ' ').toUpperCase()}
                  </Badge>
                </div>
                <h3 className="text-sm font-bold text-slate-900">{trackResult.business_name}</h3>
                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-200/80 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Applicant</span>
                    <span className="font-semibold text-slate-800">{trackResult.applicant_name || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Mobile</span>
                    <span className="font-mono text-slate-700">{trackResult.customer_phone_masked || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Progress Milestones */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                  Processing Lifecycle
                </span>
                <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                      ✓
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-bold text-slate-900">Application Submitted</div>
                      <div className="text-[11px] text-slate-500">
                        Received on {trackResult.submission_date || new Date(trackResult.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold ${
                      trackResult.status !== 'draft' && trackResult.status !== 'submitted'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {trackResult.status !== 'draft' && trackResult.status !== 'submitted' ? '✓' : '•'}
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-bold text-slate-900">CR Document Verification</div>
                      <div className="text-[11px] text-slate-500">
                        {trackResult.status === 'under_review'
                          ? 'Currently under review by Customer Relations'
                          : trackResult.status === 'documents_required' || trackResult.status === 'correction_required'
                          ? 'Action required: Document or information correction requested'
                          : trackResult.status === 'approved'
                          ? 'All documents and eligibility verified'
                          : 'Pending initial audit'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold ${
                      trackResult.status === 'approved'
                        ? 'bg-emerald-100 text-emerald-700'
                        : trackResult.status === 'rejected'
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-slate-100 text-slate-400'
                    }`}>
                      {trackResult.status === 'approved' ? '✓' : trackResult.status === 'rejected' ? '✕' : '3'}
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-bold text-slate-900">Final Executive Approval</div>
                      <div className="text-[11px] text-slate-500">
                        {trackResult.status === 'approved'
                          ? 'Approved! Official ownership allotment generated.'
                          : trackResult.status === 'rejected'
                          ? 'Application rejected by administration.'
                          : 'Pending final executive sign-off.'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status History (if any) */}
              {trackResult.status_history && trackResult.status_history.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    Audit Activity Log
                  </span>
                  <div className="max-h-36 overflow-y-auto space-y-1.5 border border-slate-100 rounded-xl p-2.5 bg-slate-50/50 text-[11px]">
                    {trackResult.status_history.map((h) => (
                      <div key={h.id} className="flex items-baseline justify-between gap-2 border-b border-slate-100 last:border-0 pb-1 last:pb-0">
                        <div>
                          <span className="font-semibold text-slate-800 capitalize">{h.new_status.replace(/_/g, ' ')}</span>
                          {h.reason && <p className="text-[10px] text-slate-500">{h.reason}</p>}
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                          {new Date(h.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <Link
                  href={`/customer/applications/${trackResult.application_number}`}
                  className="flex-1"
                >
                  <Button variant="primary" size="md" className="w-full rounded-xl font-bold bg-[#008751] hover:bg-[#007043]">
                    <span>View Full Details &amp; Documents</span>
                    <Icons.ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => setIsTrackModalOpen(false)}
                  className="rounded-xl"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
