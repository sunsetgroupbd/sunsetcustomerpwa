'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNavBar } from '@/components/layout/MobileNavBar';
import { Business } from '@/lib/types';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icons } from '@/components/ui/Icons';

export default function HomePage() {
  const router = useRouter();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'SKH' | 'DFI' | 'SCH' | 'SPC'>('all');
  const [trackRef, setTrackRef] = useState('');
  const [isLoading, setIsLoading] = useState(true);

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
  }, []);

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackRef.trim()) return;
    router.push(`/customer/applications/${trackRef.trim().toUpperCase()}`);
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

        {/* Division Filter Header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">Official Project Divisions</h2>
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
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shadow-sm">
                      {isSKH ? (
                        <Icons.Hotel className="w-4 h-4 text-[#008751]" size={16} />
                      ) : isDFI ? (
                        <Icons.ThemePark className="w-4 h-4 text-blue-600" size={16} />
                      ) : isSCH ? (
                        <Icons.Hospital className="w-4 h-4 text-teal-600" size={16} />
                      ) : (
                        <Icons.Layers className="w-4 h-4 text-amber-600" size={16} />
                      )}
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
      </main>

      {/* Footer */}
      <Footer />

      {/* Native Mobile Bottom Navigation Bar */}
      <MobileNavBar />
    </div>
  );
}
