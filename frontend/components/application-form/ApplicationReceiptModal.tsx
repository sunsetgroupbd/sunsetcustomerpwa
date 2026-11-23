'use client';

import React, { useEffect, useRef } from 'react';
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
  const printContainerRef = useRef<HTMLDivElement>(null);

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
  const bookingPaid = Number(pay.booking_money || pay.token_money) || 0;
  const remainingDues = Number(pay.dues_amount) || Math.max(0, netTotal - bookingPaid);

  // Standalone, isolated print function to guarantee NO blank white page
  const handlePrint = () => {
    // 1. Temporarily restore body overflow so browsers won't clip printing
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'visible';

    // 2. Build isolated clean printable HTML
    const printableHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>Receipt - ${data.referenceNumber || 'Application'}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm 12mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #1e293b;
            background: #ffffff;
            margin: 0;
            padding: 0;
            font-size: 12px;
            line-height: 1.4;
          }
          .receipt-box {
            max-width: 190mm;
            margin: 0 auto;
            border: 1px solid #cbd5e1;
            padding: 16px 20px;
            background: #ffffff;
          }
          .header-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #006B3E;
            padding-bottom: 12px;
            margin-bottom: 12px;
          }
          .company-info h1 {
            font-size: 20px;
            font-weight: 800;
            color: #006B3E;
            margin: 0 0 2px 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .company-info p {
            margin: 0;
            font-size: 10px;
            color: #64748b;
          }
          .division-info {
            text-align: right;
          }
          .division-info .div-name {
            font-size: 12px;
            font-weight: 700;
            color: #1e293b;
          }
          .division-info .div-code {
            font-size: 10px;
            font-weight: 600;
            color: #006B3E;
            text-transform: uppercase;
          }
          .receipt-title-box {
            text-align: center;
            background: #f1f5f9;
            border: 1px solid #e2e8f0;
            padding: 6px 10px;
            margin-bottom: 14px;
            border-radius: 4px;
          }
          .receipt-title {
            font-size: 13px;
            font-weight: 800;
            text-transform: uppercase;
            color: #0f172a;
            margin: 0;
            letter-spacing: 0.5px;
          }
          .receipt-meta {
            display: flex;
            justify-content: space-between;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            padding: 8px 12px;
            margin-bottom: 14px;
            font-size: 11px;
          }
          .receipt-meta-item strong {
            color: #475569;
            text-transform: uppercase;
            font-size: 10px;
            display: block;
          }
          .receipt-meta-item span {
            font-weight: 700;
            color: #0f172a;
          }
          .ref-highlight {
            color: #006B3E !important;
            font-family: monospace;
            font-size: 12px;
          }
          .section-heading {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            color: #006B3E;
            border-bottom: 1px solid #cbd5e1;
            padding-bottom: 3px;
            margin: 12px 0 6px 0;
            letter-spacing: 0.3px;
          }
          table.data-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
          }
          table.data-table th,
          table.data-table td {
            border: 1px solid #cbd5e1;
            padding: 6px 8px;
            font-size: 11px;
            text-align: left;
          }
          table.data-table th {
            background-color: #f8fafc;
            font-weight: 700;
            color: #334155;
            text-transform: uppercase;
            font-size: 10px;
          }
          .text-right {
            text-align: right !important;
          }
          .text-center {
            text-align: center !important;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 4px 16px;
            margin-bottom: 10px;
            font-size: 11px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            padding: 2px 0;
            border-bottom: 1px dotted #e2e8f0;
          }
          .info-label {
            color: #64748b;
          }
          .info-val {
            font-weight: 600;
            color: #1e293b;
            text-align: right;
          }
          .signatures-row {
            display: flex;
            justify-content: space-between;
            margin-top: 32px;
            padding-top: 8px;
          }
          .signature-box {
            width: 38%;
            text-align: center;
          }
          .sig-line {
            border-top: 1px dashed #64748b;
            margin-bottom: 4px;
            height: 1px;
          }
          .sig-title {
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            color: #334155;
          }
          .footer-note {
            text-align: center;
            font-size: 9px;
            color: #94a3b8;
            margin-top: 20px;
            border-top: 1px solid #e2e8f0;
            padding-top: 6px;
          }
        </style>
      </head>
      <body>
        <div class="receipt-box">
          <!-- Header -->
          <div class="header-row">
            <div class="company-info">
              <h1>SUNSET GROUP</h1>
              <p>Corporate Office: Gulshan, Dhaka / Cox's Bazar, Bangladesh</p>
              <p>Hotline: +880 9612-SUNSET &bull; Web: www.sunsetgroupbd.com</p>
            </div>
            <div class="division-info">
              <div class="div-name">${businessName}</div>
              <div class="div-code">Division: ${businessCode}</div>
              <p style="margin:2px 0 0 0; font-size:10px; color:#64748b;">Official Client Copy</p>
            </div>
          </div>

          <!-- Document Title -->
          <div class="receipt-title-box">
            <h2 class="receipt-title">MONEY RECEIPT &amp; APPLICATION ACKNOWLEDGEMENT</h2>
          </div>

          <!-- Reference Meta Bar -->
          <div class="receipt-meta">
            <div class="receipt-meta-item">
              <strong>Receipt / Ref No</strong>
              <span class="ref-highlight">${data.referenceNumber || 'SKH-2026-00001'}</span>
            </div>
            <div class="receipt-meta-item">
              <strong>Date</strong>
              <span>${formattedDate}</span>
            </div>
            <div class="receipt-meta-item">
              <strong>Division</strong>
              <span>${businessCode}</span>
            </div>
            <div class="receipt-meta-item">
              <strong>Status</strong>
              <span style="color:#006B3E;">${(data.status || 'SUBMITTED').toUpperCase()}</span>
            </div>
          </div>

          <!-- Section 1: Customer Details -->
          <div class="section-heading">1. Customer Particulars</div>
          <div class="info-grid">
            <div class="info-row">
              <span class="info-label">Applicant Name:</span>
              <span class="info-val">${app.full_name_en || '—'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Mobile Number:</span>
              <span class="info-val">${app.mobile_number || '—'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Father's Name:</span>
              <span class="info-val">${app.father_name || '—'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">NID / Passport No:</span>
              <span class="info-val">${app.nid_or_passport || '—'}</span>
            </div>
            <div class="info-row" style="grid-column: span 2;">
              <span class="info-label">Present Address:</span>
              <span class="info-val">${app.present_address || '—'}</span>
            </div>
          </div>

          <!-- Section 2: Ownership & Investment Details -->
          <div class="section-heading">2. Investment &amp; Package Particulars</div>
          <table class="data-table">
            <thead>
              <tr>
                <th>Project / Division</th>
                <th>Package Type</th>
                <th class="text-center">Units</th>
                <th class="text-right">Unit Rate (৳)</th>
                <th class="text-right">Discount (৳)</th>
                <th class="text-right">Total Price (৳)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${businessName}</td>
                <td><strong>${own.package_type || own.package || 'Ownership Unit'}</strong></td>
                <td class="text-center">${qty}</td>
                <td class="text-right">৳ ${pricePerUnit.toLocaleString('en-IN')}</td>
                <td class="text-right">${discount > 0 ? `৳ ${discount.toLocaleString('en-IN')}` : '৳ 0'}</td>
                <td class="text-right" style="font-weight:700; background:#f8fafc;">৳ ${netTotal.toLocaleString('en-IN')}</td>
              </tr>
            </tbody>
          </table>
          ${
            own.amount_in_words
              ? `<div style="font-size:11px; margin-bottom:10px; color:#334155;"><strong>Amount in words:</strong> Taka ${own.amount_in_words} Only</div>`
              : ''
          }

          <!-- Section 3: Payment Particulars -->
          <div class="section-heading">3. Payment &amp; Installment Details</div>
          <table class="data-table">
            <thead>
              <tr>
                <th>Booking / Token Money Paid</th>
                <th>Remaining Balance</th>
                <th>Installment Schedule</th>
                <th>Bank / Payment Mode</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="font-weight:700; color:#006B3E;">৳ ${bookingPaid.toLocaleString('en-IN')}</td>
                <td style="font-weight:700; color:#b91c1c;">৳ ${remainingDues.toLocaleString('en-IN')}</td>
                <td>
                  ${
                    pay.number_of_installments
                      ? `${pay.number_of_installments} &times; ৳ ${(Number(pay.installment_amount) || 0).toLocaleString('en-IN')} (${pay.installment_type || 'Monthly'})`
                      : 'Full Payment / Lump Sum'
                  }
                </td>
                <td>${bank.bank_name ? `${bank.bank_name} (${bank.branch_name || 'Main'})` : 'Cash / Direct Cheque'}</td>
              </tr>
            </tbody>
          </table>

          <!-- Section 4: Nominee (if any) -->
          ${
            nom1.name || nom1.full_name
              ? `
              <div class="section-heading">4. Nominee Particulars</div>
              <div class="info-grid" style="margin-bottom:8px;">
                <div class="info-row">
                  <span class="info-label">Nominee Name:</span>
                  <span class="info-val">${nom1.full_name || nom1.name}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Relationship:</span>
                  <span class="info-val">${nom1.relation || nom1.relationship || 'Nominee'}</span>
                </div>
              </div>
            `
              : ''
          }

          <!-- Section 5: Signatures -->
          <div class="signatures-row">
            <div class="signature-box">
              <div class="sig-line"></div>
              <div class="sig-title">Customer / Applicant Signature</div>
            </div>
            <div class="signature-box">
              <div class="sig-line"></div>
              <div class="sig-title">Authorized Signatory (Sunset Group)</div>
            </div>
          </div>

          <!-- Footer -->
          <div class="footer-note">
            This is a computer-generated official acknowledgement receipt from Sunset Group. Valid subject to document verification &amp; cheque clearance.
          </div>
        </div>
      </body>
      </html>
    `;

    // 3. Isolated invisible iframe printing technique (100% reliable)
    try {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.visibility = 'hidden';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(printableHtml);
        doc.close();

        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch {
            window.print();
          } finally {
            setTimeout(() => {
              try {
                document.body.removeChild(iframe);
              } catch {
                // ignore cleanup if already detached
              }
              document.body.style.overflow = prevOverflow;
            }, 1000);
          }
        }, 300);
        return;
      }
    } catch {
      // Fallback to normal window print if iframe blocked
    }

    // Fallback: standard print
    window.print();
    document.body.style.overflow = prevOverflow;
  };

  return (
    <div className="fixed inset-0 z-[200] overflow-y-auto">
      {/* Print CSS Injection for Fallback */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
          html, body {
            background: white !important;
            color: #1e293b !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            overflow: visible !important;
          }
          .no-print,
          nav,
          header,
          footer,
          button {
            display: none !important;
          }
          #simple-receipt-card {
            box-shadow: none !important;
            border: 1px solid #cbd5e1 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 12px 16px !important;
          }
        }
      `}</style>

      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity no-print"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="flex min-h-full items-center justify-center p-2 sm:p-4 md:p-6">
        <div
          className="relative w-full max-w-3xl bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Action Header */}
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 sm:px-6 flex items-center justify-between gap-3 shrink-0 no-print">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-[#006B3E] flex items-center justify-center shrink-0">
                <Icons.FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  Application &amp; Booking Receipt
                </h3>
                <span className="text-xs text-slate-500 font-mono">
                  Ref: {data.referenceNumber || 'SKH-2026-00001'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
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
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                title="Close receipt preview"
              >
                <Icons.X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Receipt Preview Area */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-100/70">
            <div
              id="simple-receipt-card"
              ref={printContainerRef}
              className="bg-white text-slate-800 rounded-lg shadow-sm border border-slate-300 p-5 sm:p-7 max-w-[190mm] mx-auto text-xs"
            >
              {/* Receipt Header */}
              <div className="flex items-center justify-between pb-3 border-b-2 border-[#006B3E] mb-3">
                <div className="flex items-center gap-2.5">
                  <img
                    src="/Sunset-Group-Logo.png"
                    alt="Sunset Group"
                    className="h-10 sm:h-12 w-auto object-contain"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <div>
                    <h1 className="text-base sm:text-lg font-black tracking-tight text-[#006B3E] uppercase font-serif leading-tight">
                      SUNSET GROUP
                    </h1>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      Corporate Office: Gulshan, Dhaka / Cox&apos;s Bazar, Bangladesh
                    </p>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      Hotline: +880 9612-SUNSET &bull; Web: www.sunsetgroupbd.com
                    </p>
                  </div>
                </div>

                <div className="text-right flex items-center gap-2">
                  <div>
                    <h2 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                      {businessName}
                    </h2>
                    <span className="text-[10px] font-bold text-[#006B3E] uppercase block">
                      Division: {businessCode}
                    </span>
                    <span className="text-[10px] text-slate-400 block">Official Client Copy</span>
                  </div>
                  <img
                    src={divisionLogo}
                    alt={businessName}
                    className="h-9 sm:h-11 w-auto object-contain rounded p-0.5 border border-slate-200 bg-slate-50"
                  />
                </div>
              </div>

              {/* Document Title */}
              <div className="text-center bg-slate-100 border border-slate-200 rounded py-1.5 px-3 mb-3">
                <h2 className="text-xs sm:text-sm font-extrabold uppercase tracking-wide text-slate-900">
                  MONEY RECEIPT &amp; APPLICATION ACKNOWLEDGEMENT
                </h2>
              </div>

              {/* Meta Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 border border-slate-200 rounded p-2.5 mb-4 text-[11px]">
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-500 block">Receipt / Ref No</span>
                  <span className="font-mono font-bold text-[#006B3E]">
                    {data.referenceNumber || 'SKH-2026-00001'}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-500 block">Date</span>
                  <span className="font-semibold text-slate-800">{formattedDate}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-500 block">Division</span>
                  <span className="font-semibold text-slate-800">{businessCode}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-500 block">Status</span>
                  <span className="font-bold text-[#006B3E]">
                    {(data.status || 'SUBMITTED').toUpperCase()}
                  </span>
                </div>
              </div>

              {/* 1. Customer Details */}
              <div className="mb-4">
                <div className="text-[11px] font-bold text-[#006B3E] uppercase border-b border-slate-200 pb-1 mb-2">
                  1. Customer Particulars
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
                  <div className="flex justify-between py-0.5 border-b border-slate-100">
                    <span className="text-slate-500">Applicant Name:</span>
                    <span className="font-bold text-slate-900 uppercase">{app.full_name_en || '—'}</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-slate-100">
                    <span className="text-slate-500">Mobile Number:</span>
                    <span className="font-bold text-slate-900">{app.mobile_number || '—'}</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-slate-100">
                    <span className="text-slate-500">Father&apos;s Name:</span>
                    <span className="font-semibold text-slate-800">{app.father_name || '—'}</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-slate-100">
                    <span className="text-slate-500">NID / Passport:</span>
                    <span className="font-mono font-semibold text-slate-800">{app.nid_or_passport || '—'}</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-slate-100 sm:col-span-2">
                    <span className="text-slate-500 shrink-0">Present Address:</span>
                    <span className="font-medium text-slate-800 text-right">{app.present_address || '—'}</span>
                  </div>
                </div>
              </div>

              {/* 2. Investment Package */}
              <div className="mb-4">
                <div className="text-[11px] font-bold text-[#006B3E] uppercase border-b border-slate-200 pb-1 mb-2">
                  2. Investment &amp; Package Particulars
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px] border-collapse border border-slate-200">
                    <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="p-1.5 border border-slate-200 text-left">Project / Division</th>
                        <th className="p-1.5 border border-slate-200 text-left">Package Type</th>
                        <th className="p-1.5 border border-slate-200 text-center">Units</th>
                        <th className="p-1.5 border border-slate-200 text-right">Unit Rate (৳)</th>
                        <th className="p-1.5 border border-slate-200 text-right">Discount (৳)</th>
                        <th className="p-1.5 border border-slate-200 text-right">Total Price (৳)</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      <tr>
                        <td className="p-1.5 border border-slate-200 font-semibold">{businessName}</td>
                        <td className="p-1.5 border border-slate-200 font-bold text-[#006B3E]">
                          {own.package_type || own.package || 'Ownership Unit'}
                        </td>
                        <td className="p-1.5 border border-slate-200 text-center font-bold">{qty}</td>
                        <td className="p-1.5 border border-slate-200 text-right font-mono">
                          ৳ {pricePerUnit.toLocaleString('en-IN')}
                        </td>
                        <td className="p-1.5 border border-slate-200 text-right font-mono text-amber-700">
                          {discount > 0 ? `৳ ${discount.toLocaleString('en-IN')}` : '৳ 0'}
                        </td>
                        <td className="p-1.5 border border-slate-200 text-right font-mono font-bold text-slate-900 bg-slate-50">
                          ৳ {netTotal.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                {own.amount_in_words && (
                  <div className="mt-1 text-[10px] text-slate-600">
                    <strong>In Words:</strong> Taka {own.amount_in_words} Only
                  </div>
                )}
              </div>

              {/* 3. Payment Details */}
              <div className="mb-4">
                <div className="text-[11px] font-bold text-[#006B3E] uppercase border-b border-slate-200 pb-1 mb-2">
                  3. Payment &amp; Financial Particulars
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div className="p-2 rounded border border-slate-200 bg-slate-50">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">Booking Money Paid</span>
                    <span className="font-mono font-bold text-[#006B3E] text-xs">
                      ৳ {bookingPaid.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="p-2 rounded border border-slate-200 bg-slate-50">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">Remaining Balance</span>
                    <span className="font-mono font-bold text-rose-700 text-xs">
                      ৳ {remainingDues.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="p-2 rounded border border-slate-200 bg-slate-50">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">Installment Plan</span>
                    <span className="font-bold text-slate-800 text-[11px] block">
                      {pay.number_of_installments ? `${pay.number_of_installments} Months` : 'Lump Sum'}
                    </span>
                    {pay.installment_amount ? (
                      <span className="text-[10px] text-slate-500">
                        ৳ {(Number(pay.installment_amount) || 0).toLocaleString('en-IN')}/mo
                      </span>
                    ) : null}
                  </div>
                  <div className="p-2 rounded border border-slate-200 bg-slate-50">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">Payment Mode</span>
                    <span className="font-semibold text-slate-800 text-[11px] block truncate">
                      {bank.bank_name ? bank.bank_name : 'Direct / Online'}
                    </span>
                    {bank.account_number && (
                      <span className="text-[9px] text-slate-500 font-mono block truncate">
                        A/C: {bank.account_number}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 4. Nominee (if present) */}
              {(nom1.name || nom1.full_name) && (
                <div className="mb-4">
                  <div className="text-[11px] font-bold text-[#006B3E] uppercase border-b border-slate-200 pb-1 mb-2">
                    4. Nominee Particulars
                  </div>
                  <div className="flex flex-wrap gap-4 text-[11px]">
                    <div>
                      <span className="text-slate-500 mr-1.5">Nominee Name:</span>
                      <strong className="text-slate-900">{nom1.full_name || nom1.name}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 mr-1.5">Relationship:</span>
                      <span className="text-slate-800 font-semibold">{nom1.relation || nom1.relationship || 'Nominee'}</span>
                    </div>
                    {nom1.cell_number && (
                      <div>
                        <span className="text-slate-500 mr-1.5">Contact:</span>
                        <span className="text-slate-800">{nom1.cell_number}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Signatures */}
              <div className="pt-6 mt-6 border-t border-slate-200 flex items-end justify-between">
                <div className="text-center w-40">
                  <div className="border-b border-dashed border-slate-400 pb-1 mb-1">
                    <span className="font-serif italic text-xs text-slate-700">
                      {app.full_name_en || 'Customer'}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold uppercase text-slate-600 block">
                    Customer Signature
                  </span>
                </div>

                <div className="text-center w-48">
                  <div className="border-b border-dashed border-slate-400 pb-1 mb-1">
                    <span className="text-[10px] font-mono text-[#006B3E] font-bold uppercase">
                      Sunset Group Authority
                    </span>
                  </div>
                  <span className="text-[10px] font-bold uppercase text-slate-600 block">
                    Authorized Signatory
                  </span>
                </div>
              </div>

              {/* Footer Note */}
              <div className="mt-6 pt-2 border-t border-slate-200 text-center text-[9px] text-slate-400">
                This is a computer-generated official acknowledgement receipt from Sunset Group. Valid subject to document verification &amp; cheque clearance.
              </div>
            </div>
          </div>

          {/* Modal Footer Controls */}
          <div className="bg-white border-t border-slate-200 px-4 py-3 sm:px-6 flex items-center justify-between gap-3 shrink-0 no-print">
            <span className="text-xs text-slate-500">
              Reference: <strong className="text-slate-800">{data.referenceNumber || 'SKH-2026-00001'}</strong>
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
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
