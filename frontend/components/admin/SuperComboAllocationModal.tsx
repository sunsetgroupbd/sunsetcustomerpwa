'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Application } from '@/lib/types';

interface SuperComboAllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: Application | null;
}

export const SuperComboAllocationModal: React.FC<SuperComboAllocationModalProps> = ({
  isOpen,
  onClose,
  application,
}) => {
  if (!application) return null;

  const totalPrice = Number(application.ownership_detail?.total_price) || 0;
  const token = Number(application.payment_detail?.token_money) || 0;
  const booking = Number(application.payment_detail?.booking_money) || 0;
  const totalPaid = Math.max(token + booking, booking);
  const dues = Number(application.payment_detail?.dues_amount) || Math.max(0, totalPrice - totalPaid);
  const paidPercent = totalPrice > 0 ? Math.min(100, Math.round((totalPaid / totalPrice) * 100)) : 0;

  const applicantName =
    application.applicant_info?.full_name_en ||
    application.customer_name ||
    (application as any)?.applicant_name ||
    'Applicant';
  const applicantPhone =
    application.applicant_info?.mobile_number ||
    application.customer_phone ||
    (application as any)?.applicant_phone ||
    '';
  const packageType = application.ownership_detail?.package_type || 'Combo';

  const allocations = [
    {
      key: 'skh',
      name: 'Sunset Kuakata Hotel & Resort Ltd.',
      shortName: 'Sunset Kuakata',
      category: 'Hospitality & Luxury Resort',
      formula: '70% of 45%',
      percentage: 31.5,
      color: '#008751',
      bgLight: 'bg-emerald-50',
      borderLight: 'border-emerald-200',
      textLight: 'text-emerald-800',
      totalVal: Math.round(totalPrice * 0.315),
      paidVal: Math.round(totalPaid * 0.315),
      duesVal: Math.round(dues * 0.315),
    },
    {
      key: 'mangrove',
      name: 'Mangrove Eco Hotel & Resort Ltd.',
      shortName: 'Mangrove Resort',
      category: 'Eco Resort & Hospitality',
      formula: '30% of 45%',
      percentage: 13.5,
      color: '#059669',
      bgLight: 'bg-teal-50',
      borderLight: 'border-teal-200',
      textLight: 'text-teal-800',
      totalVal: Math.round(totalPrice * 0.135),
      paidVal: Math.round(totalPaid * 0.135),
      duesVal: Math.round(dues * 0.135),
    },
    {
      key: 'dfi',
      name: 'Dynamic Futures International (DFI)',
      shortName: 'DFI International',
      category: 'Commercial & Export Development',
      formula: 'Direct 27.5%',
      percentage: 27.5,
      color: '#2563eb',
      bgLight: 'bg-blue-50',
      borderLight: 'border-blue-200',
      textLight: 'text-blue-800',
      totalVal: Math.round(totalPrice * 0.275),
      paidVal: Math.round(totalPaid * 0.275),
      duesVal: Math.round(dues * 0.275),
    },
    {
      key: 'suncare',
      name: 'Suncare (Sunset Cancer Hospital & Diagnostic Ltd.)',
      shortName: 'Suncare Hospital',
      category: 'Healthcare & Specialized Oncology',
      formula: 'Direct 27.5%',
      percentage: 27.5,
      color: '#d97706',
      bgLight: 'bg-amber-50',
      borderLight: 'border-amber-200',
      textLight: 'text-amber-800',
      totalVal: Math.round(totalPrice * 0.275),
      paidVal: Math.round(totalPaid * 0.275),
      duesVal: Math.round(dues * 0.275),
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Super Combo (SPC) 4-in-1 Asset Allocation"
      description={`Portfolio valuation & distributed ledger breakdown for ${applicantName} (${packageType} Package)`}
      maxWidth="4xl"
    >
      <div className="space-y-4 text-xs">
        {/* Applicant Context Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800 text-xs sm:text-sm">{applicantName}</span>
            {applicantPhone && (
              <span className="text-[11px] font-mono text-slate-500">({applicantPhone})</span>
            )}
            <Badge variant="warning" className="text-[10px] uppercase font-bold tracking-wide">
              {packageType}
            </Badge>
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            Ref: <strong className="text-slate-800">{application.reference_number || application.application_number}</strong>
          </div>
        </div>

        {/* Top Summary Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">Total Portfolio Price</span>
            <div className="font-mono font-bold text-slate-900 text-base sm:text-lg">
              ৳ {totalPrice.toLocaleString('en-IN')}
            </div>
            <span className="text-[10px] text-slate-400">100% Consolidated Valuation</span>
          </div>
          <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3">
            <span className="text-[10px] uppercase font-bold text-emerald-800 block mb-0.5">Collected Credit</span>
            <div className="font-mono font-bold text-[#006B3E] text-base sm:text-lg">
              ৳ {totalPaid.toLocaleString('en-IN')}
            </div>
            <span className="text-[10px] text-emerald-700 font-medium">
              {paidPercent}% of portfolio realized
            </span>
          </div>
          <div className="bg-rose-50/60 border border-rose-200 rounded-xl p-3">
            <span className="text-[10px] uppercase font-bold text-rose-800 block mb-0.5">Remaining Balance</span>
            <div className="font-mono font-bold text-rose-700 text-base sm:text-lg">
              ৳ {dues.toLocaleString('en-IN')}
            </div>
            <span className="text-[10px] text-rose-600 font-medium">
              {100 - paidPercent}% to be settled
            </span>
          </div>
        </div>

        {/* Proportional Portfolio Distribution Bar */}
        <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
              Asset Weight Distribution
            </span>
            <span className="font-mono font-bold text-slate-600 text-[10px]">
              4 Projects = 100%
            </span>
          </div>
          {/* Multi-segment bar */}
          <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-100">
            {allocations.map((a) => (
              <div
                key={a.key}
                style={{ width: `${a.percentage}%`, backgroundColor: a.color }}
                title={`${a.shortName}: ${a.percentage}%`}
                className="h-full transition-all duration-300"
              />
            ))}
          </div>
          {/* Legend items */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
            {allocations.map((a) => (
              <div key={a.key} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: a.color }} />
                <span className="truncate text-slate-700 font-medium">{a.shortName}:</span>
                <span className="font-bold text-slate-900 font-mono ml-auto">{a.percentage}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* DESKTOP TABLE VIEW (hidden on mobile, visible on sm and up) */}
        <div className="hidden sm:block border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[640px]">
              <thead className="bg-slate-100/80 text-[11px] uppercase font-bold text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Asset / Business Entity</th>
                  <th className="py-3 px-3 text-center">Share %</th>
                  <th className="py-3 px-4 text-right">Asset Valuation</th>
                  <th className="py-3 px-4 text-right">Paid Credit</th>
                  <th className="py-3 px-4 text-right">Remaining Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium">
                {allocations.map((a) => (
                  <tr key={a.key} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-start gap-2.5">
                        <span
                          className="w-3 h-3 rounded-full mt-0.5 shrink-0"
                          style={{ backgroundColor: a.color }}
                        />
                        <div>
                          <div className="font-bold text-slate-900 leading-snug">{a.name}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                            <span>{a.category}</span>
                            <span className="text-slate-300">•</span>
                            <span className="font-medium text-slate-600 italic">{a.formula}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-bold font-mono bg-slate-100 text-slate-800 border border-slate-200">
                        {a.percentage}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      ৳ {a.totalVal.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-[#006B3E]">
                      ৳ {a.paidVal.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-rose-700">
                      ৳ {a.duesVal.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t-2 border-slate-200 font-bold text-slate-900 text-xs">
                <tr>
                  <td className="py-3 px-4">Consolidated Super Combo Total</td>
                  <td className="py-3 px-3 text-center text-[#006B3E] font-mono">100%</td>
                  <td className="py-3 px-4 text-right font-mono text-sm">৳ {totalPrice.toLocaleString('en-IN')}</td>
                  <td className="py-3 px-4 text-right font-mono text-sm text-[#006B3E]">৳ {totalPaid.toLocaleString('en-IN')}</td>
                  <td className="py-3 px-4 text-right font-mono text-sm text-rose-700">৳ {dues.toLocaleString('en-IN')}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* MOBILE CARD VIEW (visible on mobile screens, hidden on sm and up) */}
        <div className="sm:hidden space-y-3">
          <div className="text-[10px] uppercase font-bold text-slate-500 px-0.5">
            Individual Asset Share Breakdown:
          </div>
          {allocations.map((a) => (
            <div
              key={a.key}
              className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs space-y-2.5"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: a.color }} />
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs leading-tight">{a.shortName}</h4>
                    <p className="text-[10px] text-slate-500">{a.category}</p>
                  </div>
                </div>
                <span className="shrink-0 font-mono font-bold text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                  {a.percentage}%
                </span>
              </div>

              {/* Card Metrics Grid */}
              <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-100 text-center">
                <div className="bg-slate-50 rounded-lg p-1.5">
                  <span className="text-[9px] uppercase font-semibold text-slate-500 block">Valuation</span>
                  <span className="font-mono font-bold text-slate-900 text-[11px] block mt-0.5">
                    ৳ {a.totalVal.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="bg-emerald-50/70 rounded-lg p-1.5">
                  <span className="text-[9px] uppercase font-semibold text-emerald-800 block">Paid Credit</span>
                  <span className="font-mono font-bold text-[#006B3E] text-[11px] block mt-0.5">
                    ৳ {a.paidVal.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="bg-rose-50/70 rounded-lg p-1.5">
                  <span className="text-[9px] uppercase font-semibold text-rose-800 block">Remaining Due</span>
                  <span className="font-mono font-bold text-rose-700 text-[11px] block mt-0.5">
                    ৳ {a.duesVal.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Formula caption */}
              <div className="text-[9px] text-slate-400 italic text-right">
                Ratio calculation: {a.formula}
              </div>
            </div>
          ))}

          {/* Mobile Footer Total */}
          <div className="bg-slate-100 border border-slate-200 rounded-xl p-3 flex justify-between items-center text-xs">
            <span className="font-bold text-slate-800">Total (100%):</span>
            <div className="font-mono text-right">
              <span className="font-bold text-slate-900 block">৳ {totalPrice.toLocaleString('en-IN')}</span>
              <span className="text-[10px] text-[#006B3E] block">Paid: ৳ {totalPaid.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Hospitality Subtotal Note */}
        <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div className="leading-relaxed">
            <strong className="font-bold">Hospitality Combined (Kuakata + Mangrove):</strong> 45.0% of total combo
            valuing <strong className="font-mono font-bold">৳ {(Math.round(totalPrice * 0.45)).toLocaleString('en-IN')}</strong> in a 70:30 allocation.
          </div>
          <span className="shrink-0 font-bold bg-white border border-emerald-300 text-emerald-800 px-2.5 py-1 rounded-lg text-[10px] shadow-2xs">
            70 : 30 Ratio
          </span>
        </div>

        {/* Action Button */}
        <div className="pt-2 border-t border-slate-100 flex justify-end">
          <Button variant="primary" size="sm" onClick={onClose} className="px-5">
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
};
