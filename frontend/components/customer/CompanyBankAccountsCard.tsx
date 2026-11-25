'use client';

import React, { useState } from 'react';
import { Icons } from '@/components/ui/Icons';

export interface CompanyBankAccount {
  bankName: string;
  shortName: string;
  accountName: string;
  accountNumber: string;
  routingNumber: string;
  branchName: string;
  accentColor: string;
  tag: string;
}

export const COMPANY_BANK_ACCOUNTS: CompanyBankAccount[] = [
  {
    bankName: 'Islami Bank Bangladesh Ltd (IBBL)',
    shortName: 'Islami Bank',
    accountName: 'Sunset Kuakata Hotel And Resort Ltd.',
    accountNumber: '20506470100011511',
    routingNumber: '125260341',
    branchName: 'Aftabnagar Sub Branch, IBBL',
    accentColor: '#008751',
    tag: 'Islamic Banking',
  },
  {
    bankName: 'NRBC Bank PLC',
    shortName: 'NRBC Bank',
    accountName: 'Sunset Kuakata Hotel And Resort Ltd.',
    accountNumber: '715114100000154',
    routingNumber: '260270812',
    branchName: 'Dhanmondi Mohila Branch, Islami Window',
    accentColor: '#0284c7',
    tag: 'Islami Window',
  },
];

export const CompanyBankAccountsCard: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  return (
    <div className={`bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm ${className}`}>
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#006B3E]/10 via-emerald-50/50 to-slate-50 p-4 sm:p-5 border-b border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#006B3E] text-white flex items-center justify-center shrink-0 shadow-sm">
              <Icons.CreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Official Bank Accounts for Payment</span>
                <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                  Verified
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Deposit Token Money, Booking Money, or Monthly EMIs via Bank Transfer, BEFTN, NPSB, or App
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap self-start sm:self-auto">
            {['NPSB', 'BEFTN', 'RTGS', 'CellFin', 'Online App'].map((method) => (
              <span
                key={method}
                className="text-[10px] font-medium text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-2xs"
              >
                {method}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Account Cards Grid */}
      <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        {COMPANY_BANK_ACCOUNTS.map((acc, index) => {
          const isCopiedAcc = copiedKey === `acc-${index}`;
          const isCopiedRouting = copiedKey === `route-${index}`;

          return (
            <div
              key={acc.accountNumber}
              className="rounded-xl border border-slate-200/90 p-4 bg-slate-50/50 hover:bg-white hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between space-y-3"
            >
              <div>
                {/* Bank Name & Tag */}
                <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-200/60">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: acc.accentColor }}
                    />
                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm">{acc.bankName}</h4>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded">
                    {acc.tag}
                  </span>
                </div>

                {/* Account Name */}
                <div className="mb-2.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Account Name
                  </span>
                  <span className="text-xs font-semibold text-slate-800">
                    {acc.accountName}
                  </span>
                </div>

                {/* Account Number Box with 1-Click Copy */}
                <div className="bg-white border border-slate-200 rounded-lg p-2.5 mb-2.5 flex items-center justify-between gap-2 shadow-2xs">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">
                      Account Number
                    </span>
                    <span className="font-mono font-bold text-slate-900 text-xs sm:text-sm tracking-wide">
                      {acc.accountNumber}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(acc.accountNumber, `acc-${index}`)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition-all flex items-center gap-1 ${
                      isCopiedAcc
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                    title="Copy Account Number"
                  >
                    {isCopiedAcc ? (
                      <>
                        <Icons.Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Routing & Branch */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white/80 border border-slate-200/80 rounded p-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Routing No</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(acc.routingNumber, `route-${index}`)}
                        className="text-[10px] text-blue-600 hover:underline font-semibold"
                      >
                        {isCopiedRouting ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <span className="font-mono font-semibold text-slate-800 text-[11px] block mt-0.5">
                      {acc.routingNumber}
                    </span>
                  </div>

                  <div className="bg-white/80 border border-slate-200/80 rounded p-2">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Branch</span>
                    <span className="font-medium text-slate-700 text-[11px] block mt-0.5 truncate" title={acc.branchName}>
                      {acc.branchName}
                    </span>
                  </div>
                </div>
              </div>

              {/* Verified badge */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Direct Cheque / Pay Order Payee:</span>
                <strong className="text-slate-800 text-[10px]">Sunset Kuakata Hotel And Resort Ltd.</strong>
              </div>
            </div>
          );
        })}
      </div>

      {/* Instructions Footer */}
      <div className="bg-slate-50 p-3 sm:px-5 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-600">
        <div className="flex items-center gap-1.5">
          <Icons.AlertCircle className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>
            <strong>Payment Advice:</strong> In the deposit/transfer remark, please enter your <strong>Customer ID</strong> or <strong>Application Ref Number</strong>.
          </span>
        </div>
        <span className="text-slate-400 text-[10px]">
          Always keep the deposit slip or transaction receipt for verification.
        </span>
      </div>
    </div>
  );
};
