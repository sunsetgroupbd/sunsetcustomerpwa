'use client';

import React, { useEffect } from 'react';
import { Icons } from '../ui/Icons';
import { Button } from '../ui/Button';
import { getDivisionLogo } from './ApplicationWizard';

export interface ReceiptData {
  referenceNumber: string;
  submissionDate?: string | Date | null;
  status?: string | null;
  businessName?: string | null;
  businessCode?: string | null;
  applicantInfo?: {
    full_name_en?: string | null;
    full_name_bn?: string | null;
    father_name?: string | null;
    mother_name?: string | null;
    spouse_name?: string | null;
    mobile_number?: string | null;
    phone_number?: string | null;
    personal_email?: string | null;
    nid_or_passport?: string | null;
    date_of_birth?: string | null;
    nationality?: string | null;
    religion?: string | null;
    present_address?: string | null;
    permanent_address?: string | null;
    company_name?: string | null;
    designation?: string | null;
    office_address?: string | null;
  };
  ownershipDetail?: {
    package?: string | null;
    package_type?: string | null;
    number_of_ownership?: number | null;
    price_per_ownership?: number | null;
    discount?: number | null;
    discount_amount?: number | null;
    total_price?: number | null;
    amount_in_words?: string | null;
  };
  paymentDetail?: {
    token_money?: number | null;
    booking_money?: number | null;
    booking_date?: string | null;
    installment_type?: string | null;
    number_of_installments?: number | null;
    installment_amount?: number | null;
    installment_start_date?: string | null;
    dues_amount?: number | null;
  };
  bankDetail?: {
    account_name?: string | null;
    account_number?: string | null;
    bank_name?: string | null;
    branch_name?: string | null;
  };
  nominees?: Array<{
    name?: string | null;
    full_name?: string | null;
    relationship?: string | null;
    relation?: string | null;
    cell_number?: string | null;
    nid_or_passport?: string | null;
    date_of_birth?: string | null;
  }>;
  declarationAccepted?: boolean | null;
}

interface ApplicationReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ReceiptData;
}

export const ApplicationReceiptModal: React.FC<ApplicationReceiptModalProps> = ({
  isOpen,
  onClose,
  data,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const app = data.applicantInfo || {};
  const own = data.ownershipDetail || {};
  const pay = data.paymentDetail || {};
  const bank = data.bankDetail || {};
  const nom1 = data.nominees?.[0] || {};

  const formattedDate = data.submissionDate
    ? new Date(data.submissionDate).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });

  const businessName = data.businessName || 'Sunset Bay Limited';
  const businessCode = data.businessCode || 'SKH';
  const divisionLogo = getDivisionLogo(businessCode);

  const pricePerUnit = Number(own.price_per_ownership) || 0;
  const qty = Number(own.number_of_ownership) || 1;
  const grossTotal = pricePerUnit * qty;
  const discount = Number(own.discount_amount || own.discount) || 0;
  const netTotal = Number(own.total_price) || Math.max(0, grossTotal - discount);

  return (
    <div className="fixed inset-0 z-[200] overflow-y-auto">
      {/* Print CSS Injection: Strictly Isolates #printable-receipt When Printing */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 8mm;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            color: #0f172a !important;
            height: auto !important;
            overflow: visible !important;
            font-size: 10pt !important;
          }
          /* Hide all non-receipt elements */
          .no-print,
          header,
          nav,
          footer,
          button,
          .fixed.inset-0.bg-slate-900\/70 {
            display: none !important;
          }
          /* Neutralize modal wrapper styles so the document flows naturally on page */
          .fixed.inset-0.z-\\[200\\] {
            position: static !important;
            overflow: visible !important;
            display: block !important;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .min-h-full,
          .max-h-\\[95vh\\],
          .overflow-y-auto {
            min-height: 0 !important;
            max-height: none !important;
            overflow: visible !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          #printable-receipt-container {
            position: static !important;
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 4mm 6mm !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
          }
          #printable-receipt-container * {
            visibility: visible !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* Modal Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs transition-opacity animate-in fade-in duration-200 no-print"
        onClick={onClose}
      />

      {/* Modal Dialog Container */}
      <div className="flex min-h-full items-center justify-center p-2 sm:p-4 md:p-6">
        <div
          className="relative w-full max-w-4xl bg-slate-100 rounded-2xl shadow-2xl border border-slate-300 flex flex-col max-h-[95vh] overflow-hidden transform transition-all animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Modal Action Bar */}
          <div className="bg-white border-b border-slate-200 px-4 py-3 sm:px-6 flex items-center justify-between gap-3 shrink-0 no-print">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#006B3E] flex items-center justify-center shrink-0">
                <Icons.FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                  Official Application &amp; Booking Receipt
                </h3>
                <span className="text-[11px] text-slate-500 font-mono">
                  Ref: {data.referenceNumber || 'N/A'} • {formattedDate}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="primary"
                size="sm"
                onClick={handlePrint}
                leftIcon={<Icons.Printer className="w-4 h-4" />}
                className="bg-[#006B3E] hover:bg-[#005230] text-xs sm:text-sm font-bold shadow-sm"
              >
                Print / Save PDF
              </Button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                title="Close receipt preview"
              >
                <Icons.X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick PDF Save Tip Banner */}
          <div className="bg-emerald-50/90 border-b border-emerald-200/80 px-4 py-2 sm:px-6 text-[11px] sm:text-xs text-emerald-800 flex items-center justify-between shrink-0 no-print">
            <span>
              💡 <strong>How to save as PDF:</strong> Click <strong>Print / Save PDF</strong> and select{' '}
              <strong>&quot;Save as PDF&quot;</strong> in your browser&apos;s printer destination dropdown.
            </span>
            <span className="text-emerald-700 font-medium hidden sm:inline">Official Client Copy</span>
          </div>

          {/* Scrollable Receipt Body (Screen Preview) */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-200/60">
            <div
              id="printable-receipt-container"
              className="bg-white text-slate-900 max-w-[210mm] mx-auto rounded-xl sm:rounded-2xl shadow-md border border-slate-200 p-5 sm:p-8 md:p-10"
            >
              {/* Receipt Header: Corporate Brand & Division */}
              <div className="flex items-center justify-between gap-4 pb-4 border-b-2 border-[#006B3E]">
                {/* Left: Sunset Group Master Logo */}
                <div className="flex items-center gap-3">
                  <img
                    src="/Sunset-Group-Logo.png"
                    alt="Sunset Group"
                    className="h-12 sm:h-14 w-auto object-contain"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <div>
                    <h1 className="text-lg sm:text-2xl font-black tracking-tight text-[#006B3E] uppercase font-serif">
                      SUNSET GROUP
                    </h1>
                    <p className="text-[10px] sm:text-xs font-semibold text-slate-600 tracking-wide uppercase">
                      Cox&apos;s Bazar &bull; Dhaka &bull; Bangladesh
                    </p>
                  </div>
                </div>

                {/* Right: Division Logo & Identifier */}
                <div className="flex items-center gap-2.5 text-right">
                  <div className="hidden sm:block">
                    <span className="text-[10px] font-bold tracking-widest text-[#006B3E] uppercase block">
                      DIVISION: {businessCode}
                    </span>
                    <h2 className="text-xs sm:text-sm font-bold text-slate-800">{businessName}</h2>
                  </div>
                  <img
                    src={divisionLogo}
                    alt={businessName}
                    className="h-11 sm:h-13 w-auto object-contain rounded-lg p-0.5 bg-slate-50 border border-slate-200"
                  />
                </div>
              </div>

              {/* Sub-header Address & Contact Line */}
              <div className="py-2 border-b border-slate-200/80 text-[10px] sm:text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-2">
                <span>
                  <strong>Corporate HQ:</strong> Sunset Tower, Plot #12, Block #B, Gulshan / Cox&apos;s Bazar, Bangladesh
                </span>
                <span>
                  <strong>Hotline:</strong> +880 9612-SUNSET &bull; <strong>Web:</strong> www.sunsetgroupbd.com
                </span>
              </div>

              {/* Document Title Banner */}
              <div className="my-4 py-2.5 px-4 bg-slate-900 text-white rounded-lg text-center">
                <h2 className="text-xs sm:text-sm md:text-base font-extrabold uppercase tracking-wider">
                  INVESTMENT APPLICATION &amp; BOOKING ACKNOWLEDGEMENT RECEIPT
                </h2>
                <p className="text-[10px] sm:text-[11px] text-emerald-400 font-medium tracking-wide">
                  OFFICIAL INVESTOR COPY &bull; DIGITALLY REGISTERED &bull; APPLICATION REF: {data.referenceNumber || 'N/A'}
                </p>
              </div>

              {/* Top Reference Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-lg bg-emerald-50/60 border border-emerald-200 text-xs mb-5">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Application Ref No</span>
                  <span className="text-xs sm:text-sm font-mono font-bold text-[#006B3E]">
                    {data.referenceNumber || 'SKH-2026-00001'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Submission Date</span>
                  <span className="text-xs font-semibold text-slate-900">{formattedDate}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Project / Division</span>
                  <span className="text-xs font-semibold text-slate-900 truncate block">
                    {businessName} ({businessCode})
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Registration Status</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    SUBMITTED
                  </span>
                </div>
              </div>

              {/* SECTION 1: APPLICANT PARTICULARS */}
              <div className="mb-5">
                <div className="flex items-center gap-2 pb-1.5 mb-2.5 border-b border-slate-200">
                  <span className="w-5 h-5 rounded bg-[#006B3E] text-white flex items-center justify-center text-[10px] font-bold">
                    1
                  </span>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide">
                    Applicant Particulars
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Applicant Name (EN):</span>
                    <span className="font-bold text-slate-900 uppercase">{app.full_name_en || '—'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Applicant Name (BN):</span>
                    <span className="font-semibold text-slate-900">{app.full_name_bn || '—'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Father&apos;s Name:</span>
                    <span className="font-semibold text-slate-900">{app.father_name || '—'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Mother&apos;s Name:</span>
                    <span className="font-semibold text-slate-900">{app.mother_name || '—'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Spouse&apos;s Name:</span>
                    <span className="font-semibold text-slate-900">{app.spouse_name || '—'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Mobile / Cell:</span>
                    <span className="font-bold text-slate-900">{app.mobile_number || '—'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">NID / Passport No:</span>
                    <span className="font-mono font-bold text-slate-900">{app.nid_or_passport || '—'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Date of Birth &amp; Nationality:</span>
                    <span className="font-semibold text-slate-900">
                      {app.date_of_birth || '—'} &bull; {app.nationality || 'Bangladeshi'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 sm:col-span-2">
                    <span className="text-slate-500 shrink-0">Present Address:</span>
                    <span className="font-medium text-slate-800 text-right">{app.present_address || '—'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 sm:col-span-2">
                    <span className="text-slate-500 shrink-0">Permanent Address:</span>
                    <span className="font-medium text-slate-800 text-right">{app.permanent_address || '—'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 sm:col-span-2">
                    <span className="text-slate-500 shrink-0">Occupation &amp; Organization:</span>
                    <span className="font-semibold text-slate-900 text-right">
                      {app.designation || '—'}
                      {app.company_name ? `, ${app.company_name}` : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION 2: OWNERSHIP & INVESTMENT DETAILS */}
              <div className="mb-5">
                <div className="flex items-center gap-2 pb-1.5 mb-2.5 border-b border-slate-200">
                  <span className="w-5 h-5 rounded bg-[#006B3E] text-white flex items-center justify-center text-[10px] font-bold">
                    2
                  </span>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide">
                    Investment Package &amp; Ownership Allocation
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border border-slate-200 rounded-lg overflow-hidden">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="p-2 border-b border-r border-slate-200">Division / Project</th>
                        <th className="p-2 border-b border-r border-slate-200">Package Type</th>
                        <th className="p-2 border-b border-r border-slate-200 text-center">Units</th>
                        <th className="p-2 border-b border-r border-slate-200 text-right">Rate/Unit (৳)</th>
                        <th className="p-2 border-b border-r border-slate-200 text-right">Discount (৳)</th>
                        <th className="p-2 border-b border-slate-200 text-right">Net Consideration (৳)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      <tr>
                        <td className="p-2 border-r border-slate-200 font-semibold">{businessName}</td>
                        <td className="p-2 border-r border-slate-200 font-bold text-[#006B3E]">
                          {own.package_type || own.package || 'Standard Ownership'}
                        </td>
                        <td className="p-2 border-r border-slate-200 text-center font-bold">{qty}</td>
                        <td className="p-2 border-r border-slate-200 text-right font-mono">
                          ৳ {pricePerUnit.toLocaleString('en-IN')}
                        </td>
                        <td className="p-2 border-r border-slate-200 text-right font-mono text-amber-700">
                          {discount > 0 ? `- ৳ ${discount.toLocaleString('en-IN')}` : '৳ 0'}
                        </td>
                        <td className="p-2 text-right font-mono font-bold text-slate-900 bg-emerald-50/50">
                          ৳ {netTotal.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Amount in words banner */}
                <div className="mt-2 p-2 rounded bg-slate-50 border border-slate-200 text-[11px] flex items-center justify-between gap-2">
                  <span className="text-slate-500 font-semibold">Total Net Payable (In Words):</span>
                  <span className="font-bold text-slate-900 italic text-right">
                    {own.amount_in_words ? `Taka ${own.amount_in_words} Only` : `৳ ${netTotal.toLocaleString('en-IN')}`}
                  </span>
                </div>
              </div>

              {/* SECTION 3: PAYMENT BREAKDOWN & SCHEDULE */}
              <div className="mb-5">
                <div className="flex items-center gap-2 pb-1.5 mb-2.5 border-b border-slate-200">
                  <span className="w-5 h-5 rounded bg-[#006B3E] text-white flex items-center justify-center text-[10px] font-bold">
                    3
                  </span>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide">
                    Payment Breakdown &amp; Financial Schedule
                  </h3>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/80">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">Token Money Paid</span>
                    <span className="text-xs sm:text-sm font-mono font-bold text-slate-900">
                      ৳ {(Number(pay.token_money) || 0).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg border border-emerald-200 bg-emerald-50/50">
                    <span className="text-[10px] text-emerald-800 uppercase font-semibold block">Booking Money</span>
                    <span className="text-xs sm:text-sm font-mono font-bold text-[#006B3E]">
                      ৳ {(Number(pay.booking_money) || 0).toLocaleString('en-IN')}
                    </span>
                    {pay.booking_date && (
                      <span className="text-[10px] text-slate-500 block mt-0.5">Date: {pay.booking_date}</span>
                    )}
                  </div>

                  <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/80">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">Remaining Balance</span>
                    <span className="text-xs sm:text-sm font-mono font-bold text-rose-700">
                      ৳ {(Number(pay.dues_amount) || 0).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/80">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">Installment Plan</span>
                    <span className="text-xs font-bold text-slate-900 block">
                      {pay.number_of_installments || 0} &times; ৳ {(Number(pay.installment_amount) || 0).toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] text-slate-500 capitalize">
                      {pay.installment_type || 'Monthly'}
                    </span>
                  </div>
                </div>

                {/* Bank Account Details Row */}
                <div className="mt-2.5 p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Bank Name:</span>
                    <span className="font-semibold text-slate-900">{bank.bank_name || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Account Name:</span>
                    <span className="font-semibold text-slate-900">{bank.account_name || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Account Number:</span>
                    <span className="font-mono font-semibold text-slate-900">{bank.account_number || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Branch:</span>
                    <span className="font-semibold text-slate-900">{bank.branch_name || '—'}</span>
                  </div>
                </div>
              </div>

              {/* SECTION 4: NOMINEE & DECLARATION */}
              <div className="mb-6">
                <div className="flex items-center gap-2 pb-1.5 mb-2.5 border-b border-slate-200">
                  <span className="w-5 h-5 rounded bg-[#006B3E] text-white flex items-center justify-center text-[10px] font-bold">
                    4
                  </span>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide">
                    Nominee &amp; Verification Declaration
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Primary Nominee</span>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Name:</span>
                      <span className="font-bold text-slate-900">{nom1.full_name || nom1.name || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Relationship:</span>
                      <span className="font-semibold text-slate-900">{nom1.relation || nom1.relationship || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Contact / Cell:</span>
                      <span className="font-semibold text-slate-900">{nom1.cell_number || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">NID / Passport:</span>
                      <span className="font-mono text-slate-800">{nom1.nid_or_passport || '—'}</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/50 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-emerald-900 block mb-1">
                        Legal Declaration &amp; Acceptance
                      </span>
                      <p className="text-[11px] text-slate-600 leading-relaxed italic">
                        &quot;I solemnly declare that the particulars furnished above are true and correct to the best of
                        my knowledge. I agree to abide by the rules and regulations of Sunset Group and {businessName}.&quot;
                      </p>
                    </div>

                    <div className="mt-2 pt-2 border-t border-emerald-200 flex items-center justify-between text-[11px]">
                      <span className="text-emerald-900 font-semibold flex items-center gap-1">
                        <Icons.CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        Digitally Verified
                      </span>
                      <span className="text-slate-500 font-mono text-[10px]">Timestamp: {formattedDate}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 5: SIGNATURE & OFFICIAL AUTHENTICATION BLOCKS */}
              <div className="pt-6 border-t-2 border-slate-200 grid grid-cols-3 gap-4 text-center mt-8">
                <div>
                  <div className="h-12 border-b border-dashed border-slate-400 flex items-end justify-center pb-1">
                    <span className="text-[11px] font-serif italic text-emerald-800 font-bold">
                      {app.full_name_en ? `${app.full_name_en}` : 'Digitally Signed'}
                    </span>
                  </div>
                  <span className="text-[10px] sm:text-xs font-bold text-slate-800 uppercase block mt-1.5">
                    Applicant Signature
                  </span>
                  <span className="text-[9px] text-slate-400 block">Authorized Customer</span>
                </div>

                <div>
                  <div className="h-12 border-b border-dashed border-slate-400 flex items-end justify-center pb-1">
                    <div className="w-8 h-8 rounded-full border border-emerald-400/80 bg-emerald-50/60 flex items-center justify-center text-[7px] font-black text-emerald-800 uppercase leading-none tracking-tighter text-center">
                      CR SEAL
                    </div>
                  </div>
                  <span className="text-[10px] sm:text-xs font-bold text-slate-800 uppercase block mt-1.5">
                    Customer Relations (CR)
                  </span>
                  <span className="text-[9px] text-slate-400 block">Verification Officer</span>
                </div>

                <div>
                  <div className="h-12 border-b border-dashed border-slate-400 flex items-end justify-center pb-1">
                    <span className="text-[10px] font-mono text-slate-500 uppercase font-semibold">
                      SUNSET GROUP BD
                    </span>
                  </div>
                  <span className="text-[10px] sm:text-xs font-bold text-slate-800 uppercase block mt-1.5">
                    Authorized Signatory
                  </span>
                  <span className="text-[9px] text-slate-400 block">Sunset Group Management</span>
                </div>
              </div>

              {/* SECTION 6: FOOTER SECURITY & VERIFICATION NOTICE */}
              <div className="mt-8 pt-3 border-t border-slate-200 text-center text-[9px] sm:text-[10px] text-slate-400 space-y-0.5">
                <p>
                  This official document is generated electronically via the Sunset Group Customer PWA Portal and
                  constitutes official record of application.
                </p>
                <p className="font-mono text-slate-500 font-semibold">
                  SECURITY IDENTIFIER: {data.referenceNumber || 'SKH-2026-00001'} &bull; GENERATED ON {formattedDate}
                </p>
              </div>
            </div>
          </div>

          {/* Modal Bottom Controls */}
          <div className="bg-white border-t border-slate-200 px-4 py-3 sm:px-6 flex items-center justify-between gap-3 shrink-0 no-print">
            <span className="text-xs text-slate-500">
              Receipt Reference: <strong className="text-slate-800">{data.referenceNumber || 'N/A'}</strong>
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onClose}>
                Close Preview
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handlePrint}
                leftIcon={<Icons.Printer className="w-4 h-4" />}
                className="bg-[#006B3E] hover:bg-[#005230] font-bold"
              >
                Print / Save PDF
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
