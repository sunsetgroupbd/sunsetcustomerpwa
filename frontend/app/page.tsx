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
        setBusinesses(data);
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
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#005a36] via-[#008751] to-[#046A38] text-white p-5 sm:p-10 shadow-xl shadow-[#008751]/20 border border-[#008751]/40 mb-6">
          {/* SVG Background Shapes */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Ambient Radial Color Gradients */}
            <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-emerald-300/20 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-amber-300/15 blur-2xl" />

            {/* Modern Fluid Curved Wave SVG */}
            <svg
              className="absolute -right-20 -bottom-24 w-[480px] h-[320px] text-white/[0.08]"
              viewBox="0 0 500 340"
              fill="currentColor"
            >
              <path d="M0,160 C120,80 240,240 380,180 C440,150 480,90 500,60 L500,340 L0,340 Z" />
              <path
                d="M50,190 C160,130 280,260 410,210 C460,190 490,140 500,120 L500,340 L50,340 Z"
                fill="currentColor"
                opacity="0.5"
              />
            </svg>

            {/* Concentric Modern Tech Rings SVG */}
            <svg
              className="absolute -right-10 -top-10 w-72 h-72 text-white/[0.1]"
              viewBox="0 0 300 300"
              fill="none"
              stroke="currentColor"
            >
              <circle cx="150" cy="150" r="55" strokeWidth="1" strokeDasharray="4 4" />
              <circle cx="150" cy="150" r="90" strokeWidth="1.2" />
              <circle cx="150" cy="150" r="125" strokeWidth="1" strokeDasharray="6 6" />
              <circle cx="150" cy="150" r="140" strokeWidth="0.8" opacity="0.6" />
            </svg>

            {/* Subtle Corner Dot Grid SVG */}
            <svg
              className="absolute -left-6 -bottom-6 w-40 h-40 text-white/[0.08]"
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
              <circle cx="20" cy="110" r="3" />
              <circle cx="50" cy="110" r="3" />
              <circle cx="80" cy="110" r="3" />
              <circle cx="110" cy="110" r="3" />
            </svg>
          </div>

          <div className="relative z-10 max-w-3xl">
            {/* Official Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold bg-white/20 backdrop-blur-md text-white border border-white/30 mb-4 shadow-sm">
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
                  <span className="font-bold text-[#007043]">Access Client Portal</span>
                </Button>
              </Link>
              <a href="#projects" className="flex-1 sm:flex-initial">
                <Button
                  variant="glass"
                  size="lg"
                  className="w-full sm:w-auto rounded-xl flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  <Icons.Building className="w-4 h-4 text-emerald-100" size={16} />
                  <span className="font-semibold text-white">Explore Projects</span>
                </Button>
              </a>
            </div>
          </div>
        </section>

        {/* Mobile Quick Action Tiles with SVG Accents */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <Link
            href="/login"
            className="group relative overflow-hidden flex items-center gap-3 p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md hover:border-[#008751]/40 transition-all active:scale-[0.98]"
          >
            <div className="w-10 h-10 rounded-xl bg-[#008751]/10 text-[#008751] group-hover:bg-[#008751] group-hover:text-white transition-colors flex items-center justify-center shrink-0">
              <Icons.PlusCircle className="w-5 h-5" size={20} />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-slate-900 block truncate">Client Login</span>
              <span className="text-[10px] text-slate-500 block truncate">Investor portal</span>
            </div>
          </Link>

          <a
            href="#track-section"
            className="group relative overflow-hidden flex items-center gap-3 p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md hover:border-blue-400/40 transition-all active:scale-[0.98]"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors flex items-center justify-center shrink-0">
              <Icons.Search className="w-5 h-5" size={20} />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-slate-900 block truncate">Track Status</span>
              <span className="text-[10px] text-slate-500 block truncate">Real-time audit</span>
            </div>
          </a>

          <Link
            href="/customer/apply"
            className="group relative overflow-hidden flex items-center gap-3 p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md hover:border-amber-400/40 transition-all active:scale-[0.98]"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-colors flex items-center justify-center shrink-0">
              <Icons.Star className="w-5 h-5" size={20} />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-slate-900 block truncate">Packages</span>
              <span className="text-[10px] text-slate-500 block truncate">Bronze to Platinum</span>
            </div>
          </Link>

          <Link
            href="/login"
            className="group relative overflow-hidden flex items-center gap-3 p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md hover:border-purple-400/40 transition-all active:scale-[0.98]"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors flex items-center justify-center shrink-0">
              <Icons.User className="w-5 h-5" size={20} />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-slate-900 block truncate">My Account</span>
              <span className="text-[10px] text-slate-500 block truncate">View portfolio</span>
            </div>
          </Link>
        </div>

        {/* Division Filter Header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">Explore Business Divisions</h2>
            <p className="text-xs text-slate-500">Tap a division to view details and apply directly</p>
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

        {/* Division Cards Grid with Decorative SVG Corner Geometries */}
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
                        <Icons.Building className="w-4 h-4 text-[#008751]" size={16} />
                      ) : isDFI ? (
                        <Icons.Star className="w-4 h-4 text-blue-600" size={16} />
                      ) : isSCH ? (
                        <Icons.CheckCircle className="w-4 h-4 text-teal-600" size={16} />
                      ) : (
                        <Icons.Sparkles className="w-4 h-4 text-amber-600" size={16} />
                      )}
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 leading-snug mb-1.5">{biz.name}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed mb-4">
                    {biz.description || 'Premier commercial development offering secure shared ownership.'}
                  </p>

                  <div className="space-y-1.5 mb-5 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
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

                <div className="relative z-10">
                  <Link href={`/customer/apply?business_id=${biz.id}`} className="block">
                    <Button variant="primary" size="md" className="w-full font-semibold rounded-xl flex items-center justify-center gap-1.5">
                      <span>Apply for Ownership</span>
                      <Icons.ArrowRight className="w-4 h-4" size={16} />
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Quick Application Tracker Section with Decorative SVG Grid Mesh */}
        <section
          id="track-section"
          className="relative overflow-hidden bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-8 shadow-sm mb-8 scroll-mt-20"
        >
          {/* Decorative Mesh Background */}
          <div className="absolute top-0 right-0 h-full w-1/3 overflow-hidden pointer-events-none opacity-[0.05]">
            <svg className="w-full h-full" viewBox="0 0 200 120" fill="currentColor">
              <circle cx="20" cy="20" r="3" />
              <circle cx="50" cy="20" r="3" />
              <circle cx="80" cy="20" r="3" />
              <circle cx="110" cy="20" r="3" />
              <circle cx="140" cy="20" r="3" />
              <circle cx="170" cy="20" r="3" />
              <circle cx="20" cy="50" r="3" />
              <circle cx="50" cy="50" r="3" />
              <circle cx="80" cy="50" r="3" />
              <circle cx="110" cy="50" r="3" />
              <circle cx="140" cy="50" r="3" />
              <circle cx="170" cy="50" r="3" />
              <circle cx="20" cy="80" r="3" />
              <circle cx="50" cy="80" r="3" />
              <circle cx="80" cy="80" r="3" />
              <circle cx="110" cy="80" r="3" />
              <circle cx="140" cy="80" r="3" />
              <circle cx="170" cy="80" r="3" />
            </svg>
          </div>

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#008751]/10 text-[#008751] flex items-center justify-center shrink-0">
                <Icons.Search className="w-6 h-6" size={24} />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">Track Your Application</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Enter your assigned application reference number (e.g. SKH-2026-00001) for real-time audit status.
                </p>
              </div>
            </div>

            <form onSubmit={handleTrack} className="flex items-center gap-2 w-full md:w-auto">
              <input
                type="text"
                placeholder="Enter Reference (e.g. SKH-...)"
                value={trackRef}
                onChange={(e) => setTrackRef(e.target.value)}
                className="px-4 py-2.5 bg-slate-50 border border-slate-300 text-slate-900 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#008751] w-full md:w-64"
              />
              <Button type="submit" variant="primary" size="md" className="rounded-xl shrink-0">
                Track
              </Button>
            </form>
          </div>
        </section>

        {/* Enterprise Assurance Pillars */}
        <section className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 mb-6">
          <div className="text-center max-w-xl mx-auto mb-6">
            <h3 className="text-base sm:text-lg font-bold text-slate-900">Enterprise Security &amp; Trust</h3>
            <p className="text-xs text-slate-500 mt-1">Guaranteed governance standards for all registered owners</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-slate-50/80 border border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-[#008751]/10 text-[#008751] flex items-center justify-center shrink-0">
                <Icons.Shield className="w-5 h-5" size={20} />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900">Official Ownership Deed</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Legally verified registered sub-kabala and shareholder deeds for each asset.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-slate-50/80 border border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                <Icons.CheckCircle className="w-5 h-5" size={20} />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900">Seamless Digital Verification</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Upload NID, photograph, and nominee certificates directly with real-time audit.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-slate-50/80 border border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Icons.Users className="w-5 h-5" size={20} />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900">Dedicated CR Support</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Assigned Customer Relations officers guide and verify every single application.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <Footer />

      {/* Native Mobile Bottom Navigation Bar */}
      <MobileNavBar />
    </div>
  );
}
