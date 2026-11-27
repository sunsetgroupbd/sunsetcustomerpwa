'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Icons } from '@/components/ui/Icons';
import { ShareInventorySummary } from '@/lib/types';

interface ShareInventoryTrackerProps {
  shareInventory?: ShareInventorySummary | null;
}

export const ShareInventoryTracker: React.FC<ShareInventoryTrackerProps> = ({
  shareInventory,
}) => {
  if (!shareInventory) {
    return null;
  }

  const {
    total_shares_sold,
    total_shares_pending,
    total_direct_sold = 0,
    total_combo_sold = 0,
    projects,
  } = shareInventory;

  const projectLogos: Record<string, string> = {
    SKH: '/sunsetlogo.png',
    DFI: '/dfilogo.png',
    SCH: '/suncarelogo.png',
    SPC: '/sunsetcombologo.png',
  };

  const packageColors: Record<string, { bg: string; text: string; border: string }> = {
    Bronze: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
    Silver: { bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-300' },
    Gold: { bg: 'bg-yellow-50', text: 'text-yellow-800', border: 'border-yellow-300' },
    Platinum: { bg: 'bg-indigo-50', text: 'text-indigo-800', border: 'border-indigo-200' },
  };

  return (
    <Card className="border-slate-200 shadow-xs overflow-hidden">
      {/* Header section with minimal overall summary */}
      <div className="p-4 sm:p-5 border-b border-slate-100 bg-white">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#008751]" />
              <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                Share Allocation &amp; Sold Inventory
              </h3>
              <Badge variant="success" className="text-[10px] uppercase font-bold py-0.5">
                Live Ledger
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Tracks confirmed share units sold via direct applications and 4-in-1 Super Combo bundle allocations.
            </p>
          </div>

          {/* Minimal KPI pill summary */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200/90 rounded-xl text-right">
              <span className="text-[9px] uppercase font-bold text-emerald-800 block">
                Total Shares Sold
              </span>
              <span className="text-base sm:text-lg font-black font-mono text-[#006B3E] block leading-tight">
                {total_shares_sold} <span className="text-xs font-semibold">Units</span>
              </span>
            </div>

            <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-right">
              <span className="text-[9px] uppercase font-bold text-slate-600 block">
                Direct Individual
              </span>
              <span className="text-base sm:text-lg font-black font-mono text-slate-800 block leading-tight">
                {total_direct_sold} <span className="text-xs font-semibold">Units</span>
              </span>
            </div>

            <div className="px-3 py-1.5 bg-amber-50 border border-amber-300/80 rounded-xl text-right">
              <span className="text-[9px] uppercase font-bold text-amber-800 block">
                Super Combo Pkgs
              </span>
              <span className="text-base sm:text-lg font-black font-mono text-amber-900 block leading-tight">
                {total_combo_sold} <span className="text-xs font-semibold">4-in-1</span>
              </span>
            </div>

            <div className="px-3 py-1.5 bg-blue-50 border border-blue-200/90 rounded-xl text-right">
              <span className="text-[9px] uppercase font-bold text-blue-800 block">
                In Review Pipeline
              </span>
              <span className="text-base sm:text-lg font-black font-mono text-blue-900 block leading-tight">
                {total_shares_pending} <span className="text-xs font-semibold">Units</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Project Division Cards */}
      <div className="p-4 sm:p-5 bg-slate-50/50">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {projects.map((proj) => {
            const code = proj.business_code.toUpperCase().trim();
            const logo = projectLogos[code] || '/sunsetlogo.png';
            const isCombo = proj.is_combo_engine || code === 'SPC';

            const directCount = proj.direct_shares_sold ?? proj.shares_sold;
            const comboCount = proj.combo_shares_sold ?? 0;

            return (
              <div
                key={proj.business_id}
                className={`border rounded-xl p-3.5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between ${
                  isCombo
                    ? 'bg-amber-50/30 border-amber-300'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  {/* Project Header */}
                  <div className="flex items-start justify-between gap-2.5 pb-2.5 border-b border-slate-100">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                        <img src={logo} alt={proj.business_name} className="w-full h-full object-contain" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-slate-900 leading-tight truncate" title={proj.business_name}>
                            {proj.business_name}
                          </h4>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-mono font-bold text-[#008751] uppercase">
                            {proj.business_code}
                          </span>
                          {isCombo && (
                            <span className="text-[9px] font-extrabold text-amber-800 bg-amber-100 border border-amber-300 px-1 rounded">
                              4-in-1 Engine
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Confirmed Sold metric */}
                  <div className="my-3">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                          {isCombo ? 'Packages Sold' : 'Total Confirmed Sold'}
                        </span>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                          <span className="text-2xl font-black font-mono text-slate-900">
                            {proj.shares_sold}
                          </span>
                          <span className="text-xs font-medium text-slate-500">
                            {proj.shares_sold === 1 ? (isCombo ? 'Package' : 'Share') : (isCombo ? 'Packages' : 'Shares')}
                          </span>
                        </div>
                      </div>

                      {proj.shares_pending > 0 && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-blue-50 text-blue-700 border border-blue-200">
                          +{proj.shares_pending} req
                        </span>
                      )}
                    </div>

                    {/* Breakdown tag for physical projects (Direct vs Combo) */}
                    {!isCombo ? (
                      <div className="flex items-center gap-1.5 mt-2 text-[10px]">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                          Direct: <strong>{directCount}</strong>
                        </span>
                        <span className={`px-1.5 py-0.5 rounded font-mono ${
                          comboCount > 0
                            ? 'bg-amber-100/80 text-amber-900 border border-amber-300 font-bold'
                            : 'bg-slate-50 text-slate-400 border border-slate-200'
                        }`}>
                          Combo: <strong>+{comboCount}</strong>
                        </span>
                      </div>
                    ) : (
                      <p className="text-[9.5px] text-amber-800 font-medium mt-1.5 leading-tight">
                        Each package sold distributes equal share units to SKH, DFI, and SCH.
                      </p>
                    )}
                  </div>

                  {/* Package breakdown within this project */}
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5 tracking-wider">
                      Package Sold Breakdown
                    </span>
                    <div className="grid grid-cols-2 gap-1.5 text-center">
                      {proj.packages.map((pkg) => {
                        const theme = packageColors[pkg.package_name] || {
                          bg: 'bg-slate-50',
                          text: 'text-slate-800',
                          border: 'border-slate-200',
                        };
                        const pkgDirect = pkg.direct_shares_sold ?? pkg.shares_sold;
                        const pkgCombo = pkg.combo_shares_sold ?? 0;

                        return (
                          <div
                            key={pkg.package_name}
                            className={`p-1.5 rounded-lg border ${theme.border} ${theme.bg}`}
                          >
                            <span className={`text-[9px] font-bold uppercase block ${theme.text}`}>
                              {pkg.package_name}
                            </span>
                            <div className="font-mono font-bold text-xs text-slate-900 mt-0.5">
                              {pkg.shares_sold}{' '}
                              <span className="text-[9px] font-normal text-slate-500 font-sans">
                                {isCombo ? 'pkg' : 'sold'}
                              </span>
                            </div>

                            {/* Direct vs Combo detail if physical project */}
                            {!isCombo && (
                              <div className="text-[8.5px] text-slate-500 font-mono mt-0.5 leading-tight">
                                <span>{pkgDirect}d</span>
                                {pkgCombo > 0 && (
                                  <span className="text-amber-700 font-bold ml-1">+{pkgCombo}c</span>
                                )}
                              </div>
                            )}

                            {pkg.shares_pending > 0 && (
                              <span className="text-[9px] font-mono text-blue-600 block mt-0.5 font-semibold">
                                +{pkg.shares_pending} req
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};
