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
    booking_installment_count?: number | null;
    booking_installment_amount?: number | null;
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
  const tokenMoney = Number(pay.token_money) || 0;
  const bookingTotal = Number(pay.booking_money) || Number(pay.token_money) || 0;
  const bookingPaid = bookingTotal;
  const remainingDues = Number(pay.dues_amount) || Math.max(0, netTotal - bookingPaid);
  const refNum = data.referenceNumber || 'SKH-2026-00003';

  // Minimal, ultra-clean HTML string specifically designed to fit on 1 single A4 page
  const generateMinimalPrintHtml = () => `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>Receipt - ${refNum}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 8mm 10mm;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        html, body {
          margin: 0;
          padding: 0;
          background: #ffffff;
          color: #0f172a;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          font-size: 11px;
          line-height: 1.35;
        }
        .receipt-card {
          width: 100%;
          max-width: 185mm;
          margin: 0 auto;
          border: 1px solid #cbd5e1;
          padding: 12px 16px;
          page-break-after: avoid;
          page-break-inside: avoid;
          break-inside: avoid;
        }
        .header-strip {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #006B3E;
          padding-bottom: 8px;
          margin-bottom: 8px;
        }
        .header-strip h1 {
          font-size: 16px;
          font-weight: 800;
          color: #006B3E;
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .header-strip p {
          margin: 1px 0 0 0;
          font-size: 9px;
          color: #64748b;
        }
        .div-title {
          text-align: right;
          font-size: 11px;
          font-weight: 700;
          color: #1e293b;
        }
        .div-sub {
          text-align: right;
          font-size: 9px;
          font-weight: 600;
          color: #006B3E;
          text-transform: uppercase;
        }
        .doc-title-bar {
          text-align: center;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          padding: 4px 8px;
          margin-bottom: 10px;
          border-radius: 3px;
        }
        .doc-title {
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          color: #0f172a;
          margin: 0;
          letter-spacing: 0.5px;
        }
        .meta-grid {
          display: flex;
          justify-content: space-between;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 3px;
          padding: 6px 10px;
          margin-bottom: 10px;
          font-size: 10px;
        }
        .meta-item strong {
          color: #475569;
          text-transform: uppercase;
          font-size: 9px;
          display: block;
        }
        .meta-item span {
          font-weight: 700;
          color: #0f172a;
        }
        .sec-title {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          color: #006B3E;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 2px;
          margin: 8px 0 4px 0;
        }
        .kv-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2px 14px;
          margin-bottom: 8px;
          font-size: 10px;
        }
        .kv-row {
          display: flex;
          justify-content: space-between;
          padding: 2px 0;
          border-bottom: 1px dotted #f1f5f9;
        }
        .kv-label {
          color: #64748b;
        }
        .kv-val {
          font-weight: 600;
          color: #1e293b;
          text-align: right;
        }
        table.tbl {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 8px;
          font-size: 10px;
        }
        table.tbl th,
        table.tbl td {
          border: 1px solid #cbd5e1;
          padding: 4px 6px;
          text-align: left;
        }
        table.tbl th {
          background: #f8fafc;
          font-weight: 700;
          color: #334155;
          text-transform: uppercase;
          font-size: 9px;
        }
        .sig-row {
          display: flex;
          justify-content: space-between;
          margin-top: 24px;
          padding-top: 6px;
        }
        .sig-box {
          width: 40%;
          text-align: center;
        }
        .sig-line {
          border-top: 1px dashed #64748b;
          margin-bottom: 3px;
        }
        .sig-title {
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          color: #334155;
        }
        .footer-text {
          text-align: center;
          font-size: 8px;
          color: #94a3b8;
          margin-top: 14px;
          border-top: 1px solid #f1f5f9;
          padding-top: 4px;
        }
      </style>
    </head>
    <body>
      <div class="receipt-card">
        <!-- Header -->
        <div class="header-strip">
          <div>
            <h1>SUNSET GROUP</h1>
            <p>Corporate Office: Gulshan, Dhaka / Cox's Bazar &bull; Web: www.sunsetgroupbd.com</p>
          </div>
          <div>
            <div class="div-title">${businessName}</div>
            <div class="div-sub">Division: ${businessCode} &bull; Client Copy</div>
          </div>
        </div>

        <!-- Title -->
        <div class="doc-title-bar">
          <h2 class="doc-title">MONEY RECEIPT &amp; BOOKING ACKNOWLEDGEMENT</h2>
        </div>

        <!-- Meta -->
        <div class="meta-grid">
          <div class="meta-item">
            <strong>Receipt / Ref No</strong>
            <span style="color:#006B3E; font-family:monospace; font-size:11px;">${refNum}</span>
          </div>
          <div class="meta-item">
            <strong>Date</strong>
            <span>${formattedDate}</span>
          </div>
          <div class="meta-item">
            <strong>Division</strong>
            <span>${businessCode}</span>
          </div>
          <div class="meta-item">
            <strong>Status</strong>
            <span style="color:#006B3E;">${(data.status || 'SUBMITTED').toUpperCase()}</span>
          </div>
        </div>

        <!-- 1. Customer Details -->
        <div class="sec-title">1. Customer Particulars</div>
        <div class="kv-grid">
          <div class="kv-row">
            <span class="kv-label">Applicant Name:</span>
            <span class="kv-val">${app.full_name_en || '—'}</span>
          </div>
          <div class="kv-row">
            <span class="kv-label">Mobile Number:</span>
            <span class="kv-val">${app.mobile_number || '—'}</span>
          </div>
          <div class="kv-row">
            <span class="kv-label">Father's Name:</span>
            <span class="kv-val">${app.father_name || '—'}</span>
          </div>
          <div class="kv-row">
            <span class="kv-label">NID / Passport:</span>
            <span class="kv-val">${app.nid_or_passport || '—'}</span>
          </div>
          <div class="kv-row" style="grid-column: span 2;">
            <span class="kv-label">Present Address:</span>
            <span class="kv-val">${app.present_address || '—'}</span>
          </div>
        </div>

        <!-- 2. Ownership & Investment -->
        <div class="sec-title">2. Investment &amp; Package Particulars</div>
        <table class="tbl">
          <thead>
            <tr>
              <th>Division / Project</th>
              <th>Package Type</th>
              <th style="text-align:center;">Units</th>
              <th style="text-align:right;">Rate (৳)</th>
              <th style="text-align:right;">Discount (৳)</th>
              <th style="text-align:right;">Total Amount (৳)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${businessName}</td>
              <td><strong>${own.package_type || own.package || 'Ownership Unit'}</strong></td>
              <td style="text-align:center;">${qty}</td>
              <td style="text-align:right;">৳ ${pricePerUnit.toLocaleString('en-IN')}</td>
              <td style="text-align:right;">${discount > 0 ? `৳ ${discount.toLocaleString('en-IN')}` : '৳ 0'}</td>
              <td style="text-align:right; font-weight:700; background:#f8fafc;">৳ ${netTotal.toLocaleString('en-IN')}</td>
            </tr>
          </tbody>
        </table>
        ${
          own.amount_in_words
            ? `<div style="font-size:9.5px; margin-bottom:6px; color:#475569;"><strong>In Words:</strong> Taka ${own.amount_in_words} Only</div>`
            : ''
        }

        <!-- 3. Payment Particulars -->
        <div class="sec-title">3. Payment &amp; Installment Details</div>
        <table class="tbl">
          <thead>
            <tr>
              <th>Booking / Token Money Paid</th>
              <th>Remaining Balance Dues</th>
              <th>Installment Plan (Dues)</th>
              <th>Payment Reference</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="font-weight:700; color:#006B3E;">
                ৳ ${bookingTotal.toLocaleString('en-IN')}
                ${tokenMoney > 0 ? `<br><small style="color:#64748b; font-weight:normal;">(Token: ৳ ${tokenMoney.toLocaleString('en-IN')} · Due: ৳ ${Math.max(0, bookingTotal - tokenMoney).toLocaleString('en-IN')})</small>` : ''}
              </td>
              <td style="font-weight:700; color:#b91c1c;">৳ ${remainingDues.toLocaleString('en-IN')}</td>
              <td>
                ${
                  pay.number_of_installments
                    ? `${pay.number_of_installments} &times; ৳ ${(Number(pay.installment_amount) || 0).toLocaleString('en-IN')} (${pay.installment_type || 'Monthly'})`
                    : 'Lump Sum Payment'
                }
              </td>
              <td>${bank.bank_name ? `${bank.bank_name} (${bank.branch_name || 'Main'})` : 'Online / Direct Cheque'}</td>
            </tr>
          </tbody>
        </table>

        <!-- 4. Nominee (if present) -->
        ${
          nom1.full_name || nom1.name
            ? `
            <div class="sec-title">4. Nominee Particulars</div>
            <div style="font-size:10px; margin-bottom:6px; display:flex; gap:16px;">
              <span><strong>Nominee:</strong> ${nom1.full_name || nom1.name}</span>
              <span><strong>Relation:</strong> ${nom1.relation || nom1.relationship || 'Nominee'}</span>
              ${nom1.cell_number ? `<span><strong>Contact:</strong> ${nom1.cell_number}</span>` : ''}
            </div>
          `
            : ''
        }

        <!-- 5. Signatures -->
        <div class="sig-row">
          <div class="sig-box">
            <div class="sig-line"></div>
            <div class="sig-title">Customer / Applicant Signature</div>
          </div>
          <div class="sig-box">
            <div class="sig-line"></div>
            <div class="sig-title">Authorized Signatory (Sunset Group)</div>
          </div>
        </div>

        <!-- Footer -->
        <div class="footer-text">
          Computer-generated acknowledgement receipt from Sunset Group. Valid subject to document verification &amp; cheque clearance.
        </div>
      </div>
    </body>
    </html>
  `;

  // Guaranteed single-page print: Uses an off-screen iframe (NOT visibility:hidden)
  const handlePrint = () => {
    try {
      const existing = document.getElementById('receipt-print-frame');
      if (existing) {
        document.body.removeChild(existing);
      }

      const iframe = document.createElement('iframe');
      iframe.id = 'receipt-print-frame';
      // Use off-screen absolute positioning so Chromium treats it as an active visible document
      iframe.style.position = 'absolute';
      iframe.style.left = '-9999px';
      iframe.style.top = '-9999px';
      iframe.style.width = '210mm';
      iframe.style.height = '297mm';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(generateMinimalPrintHtml());
        doc.close();

        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch {
            // Popup window fallback if iframe printing is restricted
            const win = window.open('', '_blank', 'width=800,height=900');
            if (win) {
              win.document.open();
              win.document.write(generateMinimalPrintHtml());
              win.document.close();
              win.focus();
              setTimeout(() => {
                win.print();
                win.close();
              }, 250);
            }
          } finally {
            setTimeout(() => {
              try {
                if (document.body.contains(iframe)) {
                  document.body.removeChild(iframe);
                }
              } catch {
                // ignore
              }
            }, 1500);
          }
        }, 250);
        return;
      }
    } catch {
      // ignore
    }

    // Direct window popup fallback
    const win = window.open('', '_blank', 'width=800,height=900');
    if (win) {
      win.document.open();
      win.document.write(generateMinimalPrintHtml());
      win.document.close();
      win.focus();
      setTimeout(() => {
        win.print();
        win.close();
      }, 250);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] overflow-y-auto receipt-modal-wrapper">
      {/* Neutralize position:fixed in @media print so it never repeats on multiple pages */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 10mm;
          }
          html, body {
            background: white !important;
            color: #0f172a !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            overflow: visible !important;
          }
          /* Hide all non-receipt elements */
          body > *:not(.receipt-modal-wrapper) {
            display: none !important;
          }
          .receipt-modal-wrapper {
            position: static !important;
            display: block !important;
            inset: auto !important;
            overflow: visible !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print,
          nav,
          header,
          footer,
          button {
            display: none !important;
          }
          #minimal-receipt-card {
            box-shadow: none !important;
            border: 1px solid #cbd5e1 !important;
            width: 100% !important;
            max-width: 185mm !important;
            margin: 0 auto !important;
            padding: 12px 16px !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity no-print"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="flex min-h-full items-center justify-center p-2 sm:p-4">
        <div
          className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Action Header */}
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 sm:px-6 flex items-center justify-between gap-3 shrink-0 no-print">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-[#006B3E] flex items-center justify-center shrink-0">
                <Icons.FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 leading-tight">
                  Official Receipt Preview
                </h3>
                <span className="text-[11px] text-slate-500 font-mono">
                  Ref: {refNum}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={handlePrint}
                leftIcon={<Icons.Printer className="w-4 h-4" />}
                className="bg-[#006B3E] hover:bg-[#005230] text-xs font-bold shadow-sm"
              >
                Print / Save PDF
              </Button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                title="Close"
              >
                <Icons.X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Receipt Preview Area */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-5 bg-slate-100/60">
            <div
              id="minimal-receipt-card"
              ref={printContainerRef}
              className="bg-white text-slate-800 rounded-lg shadow-sm border border-slate-300 p-4 sm:p-6 max-w-[185mm] mx-auto text-xs"
            >
              {/* Receipt Header */}
              <div className="flex items-center justify-between pb-2.5 border-b-2 border-[#006B3E] mb-2.5">
                <div className="flex items-center gap-2">
                  <img
                    src="/Sunset-Group-Logo.png"
                    alt="Sunset Group"
                    className="h-9 w-auto object-contain"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <div>
                    <h1 className="text-base font-black tracking-tight text-[#006B3E] uppercase font-serif leading-tight">
                      SUNSET GROUP
                    </h1>
                    <p className="text-[9px] text-slate-500 leading-tight">
                      Gulshan, Dhaka / Cox&apos;s Bazar &bull; www.sunsetgroupbd.com
                    </p>
                  </div>
                </div>

                <div className="text-right flex items-center gap-2">
                  <div>
                    <h2 className="text-xs font-bold text-slate-900 leading-tight">
                      {businessName}
                    </h2>
                    <span className="text-[9px] font-bold text-[#006B3E] uppercase block">
                      Division: {businessCode} &bull; Client Copy
                    </span>
                  </div>
                  <img
                    src={divisionLogo}
                    alt={businessName}
                    className="h-8 w-auto object-contain rounded p-0.5 border border-slate-200 bg-slate-50"
                  />
                </div>
              </div>

              {/* Document Title */}
              <div className="text-center bg-slate-50 border border-slate-200 rounded py-1 px-2 mb-2.5">
                <h2 className="text-xs font-extrabold uppercase tracking-wide text-slate-900">
                  MONEY RECEIPT &amp; BOOKING ACKNOWLEDGEMENT
                </h2>
              </div>

              {/* Meta Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50/70 border border-slate-200 rounded p-2 mb-3 text-[10px]">
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-500 block">Receipt / Ref No</span>
                  <span className="font-mono font-bold text-[#006B3E] text-[11px]">
                    {refNum}
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
              <div className="mb-3">
                <div className="text-[10px] font-bold text-[#006B3E] uppercase border-b border-slate-200 pb-0.5 mb-1.5">
                  1. Customer Particulars
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
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
              <div className="mb-3">
                <div className="text-[10px] font-bold text-[#006B3E] uppercase border-b border-slate-200 pb-0.5 mb-1.5">
                  2. Investment &amp; Package Particulars
                </div>
                <table className="w-full text-[10px] border-collapse border border-slate-200 mb-1">
                  <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[9px]">
                    <tr>
                      <th className="p-1 border border-slate-200 text-left">Division / Project</th>
                      <th className="p-1 border border-slate-200 text-left">Package Type</th>
                      <th className="p-1 border border-slate-200 text-center">Units</th>
                      <th className="p-1 border border-slate-200 text-right">Unit Rate (৳)</th>
                      <th className="p-1 border border-slate-200 text-right">Discount (৳)</th>
                      <th className="p-1 border border-slate-200 text-right">Total Price (৳)</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    <tr>
                      <td className="p-1 border border-slate-200 font-semibold">{businessName}</td>
                      <td className="p-1 border border-slate-200 font-bold text-[#006B3E]">
                        {own.package_type || own.package || 'Ownership Unit'}
                      </td>
                      <td className="p-1 border border-slate-200 text-center font-bold">{qty}</td>
                      <td className="p-1 border border-slate-200 text-right font-mono">
                        ৳ {pricePerUnit.toLocaleString('en-IN')}
                      </td>
                      <td className="p-1 border border-slate-200 text-right font-mono text-amber-700">
                        {discount > 0 ? `৳ ${discount.toLocaleString('en-IN')}` : '৳ 0'}
                      </td>
                      <td className="p-1 border border-slate-200 text-right font-mono font-bold text-slate-900 bg-slate-50">
                        ৳ {netTotal.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </tbody>
                </table>
                {own.amount_in_words && (
                  <div className="text-[9px] text-slate-600">
                    <strong>In Words:</strong> Taka {own.amount_in_words} Only
                  </div>
                )}
              </div>

              {/* 3. Payment Details */}
              <div className="mb-3">
                <div className="text-[10px] font-bold text-[#006B3E] uppercase border-b border-slate-200 pb-0.5 mb-1.5">
                  3. Payment &amp; Financial Particulars
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                  <div className="p-1.5 rounded border border-slate-200 bg-slate-50">
                    <span className="text-[8px] uppercase font-bold text-slate-500 block">Booking Money</span>
                    <span className="font-mono font-bold text-[#006B3E] text-[11px] block">
                      ৳ {bookingTotal.toLocaleString('en-IN')}
                    </span>
                    {tokenMoney > 0 ? (
                      <span className="text-[8px] text-slate-500 block">
                        Token: ৳ {tokenMoney.toLocaleString('en-IN')} · Due: ৳ {Math.max(0, bookingTotal - tokenMoney).toLocaleString('en-IN')}
                      </span>
                    ) : null}
                  </div>
                  <div className="p-1.5 rounded border border-slate-200 bg-slate-50">
                    <span className="text-[8px] uppercase font-bold text-slate-500 block">Remaining Balance</span>
                    <span className="font-mono font-bold text-rose-700 text-[11px]">
                      ৳ {remainingDues.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="p-1.5 rounded border border-slate-200 bg-slate-50">
                    <span className="text-[8px] uppercase font-bold text-slate-500 block">Installment Plan</span>
                    <span className="font-bold text-slate-800 text-[10px] block">
                      {pay.number_of_installments ? `${pay.number_of_installments} Months` : 'Lump Sum'}
                    </span>
                    {pay.installment_amount ? (
                      <span className="text-[9px] text-slate-500">
                        ৳ {(Number(pay.installment_amount) || 0).toLocaleString('en-IN')}/mo
                      </span>
                    ) : null}
                  </div>
                  <div className="p-1.5 rounded border border-slate-200 bg-slate-50">
                    <span className="text-[8px] uppercase font-bold text-slate-500 block">Payment Mode</span>
                    <span className="font-semibold text-slate-800 text-[10px] block truncate">
                      {bank.bank_name ? bank.bank_name : 'Direct / Online'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 4. Nominee (if present) */}
              {(nom1.name || nom1.full_name) && (
                <div className="mb-3">
                  <div className="text-[10px] font-bold text-[#006B3E] uppercase border-b border-slate-200 pb-0.5 mb-1.5">
                    4. Nominee Particulars
                  </div>
                  <div className="flex flex-wrap gap-4 text-[10px]">
                    <div>
                      <span className="text-slate-500 mr-1.5">Nominee:</span>
                      <strong className="text-slate-900">{nom1.full_name || nom1.name}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 mr-1.5">Relation:</span>
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
              <div className="pt-5 mt-5 border-t border-slate-200 flex items-end justify-between">
                <div className="text-center w-36">
                  <div className="border-b border-dashed border-slate-400 pb-0.5 mb-1">
                    <span className="font-serif italic text-[11px] text-slate-700">
                      {app.full_name_en || 'Customer'}
                    </span>
                  </div>
                  <span className="text-[9px] font-bold uppercase text-slate-600 block">
                    Customer Signature
                  </span>
                </div>

                <div className="text-center w-44">
                  <div className="border-b border-dashed border-slate-400 pb-0.5 mb-1">
                    <span className="text-[9px] font-mono text-[#006B3E] font-bold uppercase">
                      Sunset Group Authority
                    </span>
                  </div>
                  <span className="text-[9px] font-bold uppercase text-slate-600 block">
                    Authorized Signatory
                  </span>
                </div>
              </div>

              {/* Footer Note */}
              <div className="mt-4 pt-1.5 border-t border-slate-200 text-center text-[8.5px] text-slate-400">
                Computer-generated acknowledgement receipt from Sunset Group. Valid subject to document verification &amp; cheque clearance.
              </div>
            </div>
          </div>

          {/* Modal Footer Controls */}
          <div className="bg-white border-t border-slate-200 px-4 py-2.5 sm:px-6 flex items-center justify-between gap-3 shrink-0 no-print">
            <span className="text-xs text-slate-500">
              Reference: <strong className="text-slate-800">{refNum}</strong>
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
