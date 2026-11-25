'use client';

import React, { useEffect, useRef } from 'react';
import { Icons } from '../ui/Icons';
import { Button } from '../ui/Button';
import { getDivisionLogo } from './ApplicationWizard';
import { numberToWords } from '@/lib/number-to-words';

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
    share_percentage?: number | string | null;
    percentage?: number | string | null;
    ratio?: string | null;
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
  const validNominees = (data.nominees || []).filter(
    (n) => (n.full_name || n.name || '').trim().length > 0
  );

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

  const PROJECT_NAMES: Record<string, string> = {
    SKH: 'Sunset Kuakata Hotel & Resort',
    DFI: 'Dhaka Fantasy Island',
    SCH: 'Sun Care Hospital & Diagnostic Centre',
    SPC: 'Sunset Privilege Club',
  };

  const businessCode = (data.businessCode || 'SKH').toUpperCase().trim();
  const businessName = data.businessName || PROJECT_NAMES[businessCode] || 'Sunset Group';
  const divisionLogo = getDivisionLogo(businessCode);

  const qty = Number(own.number_of_ownership) || 1;
  const discount = Number(own.discount_amount || own.discount) || 0;
  let pricePerUnit = Number(own.price_per_ownership) || 0;
  let netTotal = Number(own.total_price) || 0;

  if (pricePerUnit > 0 && netTotal === 0) {
    netTotal = Math.max(0, pricePerUnit * qty - discount);
  } else if (netTotal > 0 && pricePerUnit === 0 && qty > 0) {
    pricePerUnit = Math.round((netTotal + discount) / qty);
  }
  const grossTotal = pricePerUnit * qty;
  if (netTotal === 0 && grossTotal > 0) {
    netTotal = Math.max(0, grossTotal - discount);
  }

  const tokenMoney = Number(pay.token_money) || 0;
  const bookingTotal = Number(pay.booking_money) || Number(pay.token_money) || 0;
  const bookingRemaining = Math.max(0, bookingTotal - tokenMoney);
  const bookingCount = Number(pay.booking_installment_count) || 1;
  const bookingEmi = Number(pay.booking_installment_amount) || (bookingCount > 1 ? Math.round(bookingRemaining / bookingCount) : bookingRemaining);
  const remainingDues = Number(pay.dues_amount) || Math.max(0, netTotal - bookingTotal);
  const refNum = data.referenceNumber || 'SKH-2026-00001';
  const amountInWords = own.amount_in_words || (netTotal > 0 ? numberToWords(netTotal) : '');

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
          border: 1.5px solid #0f172a;
          padding: 12px 16px;
          page-break-after: avoid;
          page-break-inside: avoid;
          break-inside: avoid;
        }
        .header-strip {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #0f172a;
          padding-bottom: 8px;
          margin-bottom: 8px;
        }
        .header-strip h1 {
          font-size: 16px;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .header-strip p {
          margin: 1px 0 0 0;
          font-size: 9px;
          font-weight: 600;
          color: #0f172a;
        }
        .div-title {
          text-align: right;
          font-size: 11px;
          font-weight: 800;
          color: #0f172a;
        }
        .div-sub {
          text-align: right;
          font-size: 9px;
          font-weight: 700;
          color: #0f172a;
          text-transform: uppercase;
        }
        .doc-title-bar {
          text-align: center;
          background: #f1f5f9;
          border: 1.5px solid #0f172a;
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
          border: 1.5px solid #0f172a;
          border-radius: 3px;
          padding: 6px 10px;
          margin-bottom: 10px;
          font-size: 10px;
        }
        .meta-item strong {
          color: #0f172a;
          text-transform: uppercase;
          font-size: 9px;
          font-weight: 800;
          display: block;
        }
        .meta-item span {
          font-weight: 800;
          color: #0f172a;
        }
        .sec-title {
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          color: #0f172a;
          border-bottom: 1.5px solid #0f172a;
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
          border-bottom: 1px solid #94a3b8;
        }
        .kv-label {
          color: #0f172a;
          font-weight: 700;
        }
        .kv-val {
          font-weight: 800;
          color: #0f172a;
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
          border: 1px solid #0f172a;
          padding: 4px 6px;
          text-align: left;
          color: #0f172a;
        }
        table.tbl th {
          background: #e2e8f0;
          font-weight: 800;
          color: #0f172a;
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
          border-top: 1.5px dashed #0f172a;
          margin-bottom: 3px;
        }
        .sig-title {
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
          color: #0f172a;
        }
        .footer-text {
          text-align: center;
          font-size: 8px;
          font-weight: 600;
          color: #0f172a;
          margin-top: 14px;
          border-top: 1px solid #0f172a;
          padding-top: 4px;
        }
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body, .receipt-card, .header-strip h1, .header-strip p, .div-title, .div-sub, .doc-title, .meta-item strong, .meta-item span, .sec-title, .kv-label, .kv-val, table.tbl th, table.tbl td, .sig-title, .footer-text, small {
            color: #000000 !important;
          }
          .receipt-card, table.tbl th, table.tbl td, .doc-title-bar, .meta-grid {
            border-color: #000000 !important;
          }
          table.tbl th {
            background-color: #e2e8f0 !important;
          }
          .header-strip, .sec-title {
            border-bottom-color: #000000 !important;
          }
          .sig-line {
            border-top-color: #000000 !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="receipt-card">
        <!-- Header -->
        <div class="header-strip">
          <div>
            <h1>SUNSET GROUP</h1>
            <p>Corporate Office: Level-11, Shaptak Square, Road-16 (Old 27), Dhanmondi, Dhaka-1209 &bull; Web: www.sunsetgroupbd.com</p>
          </div>
          <div>
            <div class="div-title">${businessName}</div>
            <div class="div-sub">Project: ${businessCode} &bull; Client Copy</div>
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
            <strong>Project</strong>
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
            <span class="kv-val">${app.full_name_en || '—'}${app.full_name_bn ? ` (${app.full_name_bn})` : ''}</span>
          </div>
          <div class="kv-row">
            <span class="kv-label">Mobile Number:</span>
            <span class="kv-val">${app.mobile_number || '—'}</span>
          </div>
          <div class="kv-row">
            <span class="kv-label">Father / Spouse:</span>
            <span class="kv-val">${app.father_name ? `Father: ${app.father_name}` : app.spouse_name ? `Spouse: ${app.spouse_name}` : '—'}</span>
          </div>
          <div class="kv-row">
            <span class="kv-label">NID / Passport:</span>
            <span class="kv-val">${app.nid_or_passport || '—'}</span>
          </div>
          ${
            app.personal_email
              ? `
          <div class="kv-row">
            <span class="kv-label">Email:</span>
            <span class="kv-val">${app.personal_email}</span>
          </div>
          `
              : ''
          }
          <div class="kv-row" style="${app.personal_email ? '' : 'grid-column: span 2;'}">
            <span class="kv-label">Present Address:</span>
            <span class="kv-val">${app.present_address || '—'}</span>
          </div>
        </div>

        <!-- 2. Ownership & Investment -->
        <div class="sec-title">2. Investment &amp; Package Particulars</div>
        <table class="tbl">
          <thead>
            <tr>
              <th>Project</th>
              <th>Package Tier</th>
              <th style="text-align:center;">Share Units</th>
              <th style="text-align:right;">Rate / Unit (৳)</th>
              <th style="text-align:right;">Discount (৳)</th>
              <th style="text-align:right;">Total Amount (৳)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${businessName}</td>
              <td><strong>${own.package_type || own.package || 'Ownership Unit'}</strong></td>
              <td style="text-align:center; font-weight:700;">${qty} ${qty > 1 ? 'Units' : 'Unit'}</td>
              <td style="text-align:right;">৳ ${pricePerUnit.toLocaleString('en-IN')}</td>
              <td style="text-align:right;">${discount > 0 ? `৳ ${discount.toLocaleString('en-IN')}` : '৳ 0'}</td>
              <td style="text-align:right; font-weight:800; background:#f8fafc;">৳ ${netTotal.toLocaleString('en-IN')}</td>
            </tr>
          </tbody>
        </table>
        ${
          amountInWords
            ? `<div style="font-size:9.5px; margin-bottom:6px; color:#0f172a; font-weight:700;"><strong>In Words:</strong> Taka ${amountInWords} Only</div>`
            : ''
        }

        <!-- 3. Payment Particulars -->
        <div class="sec-title">3. Payment &amp; Installment Details</div>
        <table class="tbl">
          <thead>
            <tr>
              <th>Booking Money (Phase 1)</th>
              <th>Rest Dues (Phase 2)</th>
              <th>Installment Plan (Dues)</th>
              <th>Payment Reference</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="font-weight:700; color:#006B3E;">
                ৳ ${bookingTotal.toLocaleString('en-IN')}
                <br>
                <small style="color:#0f172a; font-weight:600;">
                  ${tokenMoney > 0 ? `Token Paid: ৳ ${tokenMoney.toLocaleString('en-IN')} · ` : ''}
                  ${bookingRemaining > 0 
                    ? `Booking Due: ৳ ${bookingRemaining.toLocaleString('en-IN')}${bookingCount > 1 ? ` (${bookingCount} EMIs @ ৳ ${bookingEmi.toLocaleString('en-IN')})` : ''}` 
                    : (bookingTotal > 0 ? 'Full Booking Cleared' : 'Pending')}
                </small>
              </td>
              <td style="font-weight:700; color:#b91c1c;">৳ ${remainingDues.toLocaleString('en-IN')}</td>
              <td>
                ${
                  pay.number_of_installments
                    ? `${pay.number_of_installments} &times; ৳ ${(Number(pay.installment_amount) || 0).toLocaleString('en-IN')} (${pay.installment_type || 'Monthly'})${pay.installment_start_date ? `<br><small style="color:#0f172a; font-weight:600;">(Starts: ${pay.installment_start_date})</small>` : ''}`
                    : 'Lump Sum Payment'
                }
              </td>
              <td>${bank.bank_name ? `${bank.bank_name} (${bank.branch_name || 'Main'})` : 'Direct / Pay Order / Online'}</td>
            </tr>
          </tbody>
        </table>

        <!-- 4. Nominees (if present) -->
        ${
          validNominees.length > 0
            ? `
            <div class="sec-title">4. Nominee Particulars (${validNominees.length})</div>
            <table class="tbl" style="margin-bottom:6px;">
              <thead>
                <tr>
                  <th style="width:6%; text-align:center;">#</th>
                  <th style="width:30%;">Nominee Name</th>
                  <th style="width:20%;">Relation</th>
                  <th style="width:24%;">Contact / Mobile</th>
                  <th style="width:20%;">NID / Passport</th>
                </tr>
              </thead>
              <tbody>
                ${validNominees
                  .map(
                    (n, idx) => `
                  <tr>
                    <td style="text-align:center; font-weight:700;">${idx + 1}</td>
                    <td><strong>${n.full_name || n.name}</strong>${n.share_percentage ? ` <span style="font-size:8.5px; color:#006B3E; font-weight:700;">(${n.share_percentage}% Share)</span>` : ''}</td>
                    <td>${n.relation || n.relationship || 'Nominee'}</td>
                    <td>${n.cell_number || '—'}</td>
                    <td>${n.nid_or_passport || '—'}</td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>
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
                      Level-11, Shaptak Square, Road-16 (Old 27), Dhanmondi, Dhaka &bull; www.sunsetgroupbd.com
                    </p>
                  </div>
                </div>

                <div className="text-right flex items-center gap-2">
                  <div>
                    <h2 className="text-xs font-bold text-slate-900 leading-tight">
                      {businessName}
                    </h2>
                    <span className="text-[9px] font-bold text-[#006B3E] uppercase block">
                      Project: {businessCode} &bull; Client Copy
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50/70 border border-slate-400 rounded p-2 mb-3 text-[10px]">
                <div>
                  <span className="text-[9px] uppercase font-extrabold text-slate-800 block">Receipt / Ref No</span>
                  <span className="font-mono font-bold text-[#006B3E] text-[11px]">
                    {refNum}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-extrabold text-slate-800 block">Date</span>
                  <span className="font-bold text-slate-900">{formattedDate}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-extrabold text-slate-800 block">Project</span>
                  <span className="font-bold text-slate-900">{businessCode}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-extrabold text-slate-800 block">Status</span>
                  <span className="font-bold text-[#006B3E]">
                    {(data.status || 'SUBMITTED').toUpperCase()}
                  </span>
                </div>
              </div>

              {/* 1. Customer Details */}
              <div className="mb-3">
                <div className="text-[10px] font-bold text-[#006B3E] uppercase border-b border-slate-300 pb-0.5 mb-1.5">
                  1. Customer Particulars
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
                  <div className="flex justify-between py-0.5 border-b border-slate-200">
                    <span className="text-slate-800 font-semibold">Applicant Name:</span>
                    <span className="font-bold text-slate-900 uppercase">
                      {app.full_name_en || '—'}{app.full_name_bn ? ` (${app.full_name_bn})` : ''}
                    </span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-slate-200">
                    <span className="text-slate-800 font-semibold">Mobile Number:</span>
                    <span className="font-bold text-slate-900">{app.mobile_number || '—'}</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-slate-200">
                    <span className="text-slate-800 font-semibold">Father / Spouse:</span>
                    <span className="font-bold text-slate-900">
                      {app.father_name ? `Father: ${app.father_name}` : app.spouse_name ? `Spouse: ${app.spouse_name}` : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-slate-200">
                    <span className="text-slate-800 font-semibold">NID / Passport:</span>
                    <span className="font-mono font-bold text-slate-900">{app.nid_or_passport || '—'}</span>
                  </div>
                  {app.personal_email && (
                    <div className="flex justify-between py-0.5 border-b border-slate-200">
                      <span className="text-slate-800 font-semibold">Email:</span>
                      <span className="font-bold text-slate-900">{app.personal_email}</span>
                    </div>
                  )}
                  <div className={`flex justify-between py-0.5 border-b border-slate-200 ${app.personal_email ? '' : 'sm:col-span-2'}`}>
                    <span className="text-slate-800 font-semibold shrink-0">Present Address:</span>
                    <span className="font-bold text-slate-900 text-right">{app.present_address || '—'}</span>
                  </div>
                </div>
              </div>

              {/* 2. Investment Package */}
              <div className="mb-3">
                <div className="text-[10px] font-bold text-[#006B3E] uppercase border-b border-slate-300 pb-0.5 mb-1.5">
                  2. Investment &amp; Package Particulars
                </div>
                <table className="w-full text-[10px] border-collapse border border-slate-400 mb-1">
                  <thead className="bg-slate-100 text-slate-900 font-extrabold uppercase text-[9px]">
                    <tr>
                      <th className="p-1 border border-slate-400 text-left">Project</th>
                      <th className="p-1 border border-slate-400 text-left">Package Tier</th>
                      <th className="p-1 border border-slate-400 text-center">Share Units</th>
                      <th className="p-1 border border-slate-400 text-right">Unit Rate (৳)</th>
                      <th className="p-1 border border-slate-400 text-right">Discount (৳)</th>
                      <th className="p-1 border border-slate-400 text-right">Total Price (৳)</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    <tr>
                      <td className="p-1 border border-slate-400 font-bold text-slate-900">{businessName}</td>
                      <td className="p-1 border border-slate-400 font-bold text-[#006B3E]">
                        {own.package_type || own.package || 'Ownership Unit'}
                      </td>
                      <td className="p-1 border border-slate-400 text-center font-bold text-slate-900">
                        {qty} {qty > 1 ? 'Units' : 'Unit'}
                      </td>
                      <td className="p-1 border border-slate-400 text-right font-mono font-bold text-slate-900">
                        ৳ {pricePerUnit.toLocaleString('en-IN')}
                      </td>
                      <td className="p-1 border border-slate-400 text-right font-mono font-bold text-amber-800">
                        {discount > 0 ? `৳ ${discount.toLocaleString('en-IN')}` : '৳ 0'}
                      </td>
                      <td className="p-1 border border-slate-400 text-right font-mono font-extrabold text-slate-900 bg-slate-50">
                        ৳ {netTotal.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </tbody>
                </table>
                {amountInWords && (
                  <div className="text-[9px] text-slate-900 font-semibold">
                    <strong>In Words:</strong> Taka {amountInWords} Only
                  </div>
                )}
              </div>

              {/* 3. Payment Details */}
              <div className="mb-3">
                <div className="text-[10px] font-bold text-[#006B3E] uppercase border-b border-slate-300 pb-0.5 mb-1.5">
                  3. Payment &amp; Financial Particulars
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                  <div className="p-1.5 rounded border border-slate-400 bg-slate-50">
                    <span className="text-[8px] uppercase font-extrabold text-slate-800 block">Booking Money (Phase 1)</span>
                    <span className="font-mono font-bold text-[#006B3E] text-[11px] block">
                      ৳ {bookingTotal.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[8px] text-slate-800 font-semibold block">
                      {tokenMoney > 0 ? `Token: ৳ ${tokenMoney.toLocaleString('en-IN')} · ` : ''}
                      {bookingRemaining > 0
                        ? `Due: ৳ ${bookingRemaining.toLocaleString('en-IN')}${bookingCount > 1 ? ` (${bookingCount} EMIs)` : ''}`
                        : (bookingTotal > 0 ? 'Full Cleared' : 'Pending')}
                    </span>
                  </div>
                  <div className="p-1.5 rounded border border-slate-400 bg-slate-50">
                    <span className="text-[8px] uppercase font-extrabold text-slate-800 block">Rest Dues (Phase 2)</span>
                    <span className="font-mono font-bold text-rose-700 text-[11px]">
                      ৳ {remainingDues.toLocaleString('en-IN')}
                    </span>
                    {pay.installment_start_date ? (
                      <span className="text-[8px] text-slate-800 font-semibold block">
                        Starts: {pay.installment_start_date}
                      </span>
                    ) : null}
                  </div>
                  <div className="p-1.5 rounded border border-slate-400 bg-slate-50">
                    <span className="text-[8px] uppercase font-extrabold text-slate-800 block">Installment Plan</span>
                    <span className="font-bold text-slate-900 text-[10px] block">
                      {pay.number_of_installments ? `${pay.number_of_installments} Months` : 'Lump Sum'}
                    </span>
                    {pay.installment_amount ? (
                      <span className="text-[9px] text-slate-800 font-semibold block">
                        ৳ {(Number(pay.installment_amount) || 0).toLocaleString('en-IN')}/mo
                      </span>
                    ) : null}
                  </div>
                  <div className="p-1.5 rounded border border-slate-400 bg-slate-50">
                    <span className="text-[8px] uppercase font-extrabold text-slate-800 block">Payment Mode</span>
                    <span className="font-bold text-slate-900 text-[10px] block truncate">
                      {bank.bank_name ? bank.bank_name : 'Direct / Online'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 4. Nominees (if present) */}
              {validNominees.length > 0 && (
                <div className="mb-3">
                  <div className="text-[10px] font-bold text-[#006B3E] uppercase border-b border-slate-300 pb-0.5 mb-1.5">
                    4. Nominee Particulars ({validNominees.length})
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[10px] border-collapse border border-slate-400">
                      <thead className="bg-slate-100 text-slate-900 font-extrabold uppercase text-[9px]">
                        <tr>
                          <th className="p-1 border border-slate-400 text-center w-8">#</th>
                          <th className="p-1 border border-slate-400 text-left">Nominee Name</th>
                          <th className="p-1 border border-slate-400 text-left">Relation</th>
                          <th className="p-1 border border-slate-400 text-left">Contact / Mobile</th>
                          <th className="p-1 border border-slate-400 text-left">NID / Passport</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        {validNominees.map((n, idx) => (
                          <tr key={idx}>
                            <td className="p-1 border border-slate-400 text-center font-bold">{idx + 1}</td>
                            <td className="p-1 border border-slate-400 font-bold text-slate-900">
                              {n.full_name || n.name}
                              {n.share_percentage ? (
                                <span className="ml-1 text-[9px] text-[#006B3E] font-bold">({n.share_percentage}% Share)</span>
                              ) : null}
                            </td>
                            <td className="p-1 border border-slate-400 text-slate-800">{n.relation || n.relationship || 'Nominee'}</td>
                            <td className="p-1 border border-slate-400 font-mono text-slate-900">{n.cell_number || '—'}</td>
                            <td className="p-1 border border-slate-400 font-mono text-slate-900">{n.nid_or_passport || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Signatures */}
              <div className="pt-5 mt-5 border-t border-slate-300 flex items-end justify-between">
                <div className="text-center w-36">
                  <div className="border-b-2 border-dashed border-slate-700 pb-0.5 mb-1">
                    <span className="font-serif italic text-[11px] text-slate-900 font-bold">
                      {app.full_name_en || 'Customer'}
                    </span>
                  </div>
                  <span className="text-[9px] font-extrabold uppercase text-slate-900 block">
                    Customer Signature
                  </span>
                </div>

                <div className="text-center w-44">
                  <div className="border-b-2 border-dashed border-slate-700 pb-0.5 mb-1">
                    <span className="text-[9px] font-mono text-[#006B3E] font-bold uppercase">
                      Sunset Group Authority
                    </span>
                  </div>
                  <span className="text-[9px] font-extrabold uppercase text-slate-900 block">
                    Authorized Signatory
                  </span>
                </div>
              </div>

              {/* Footer Note */}
              <div className="mt-4 pt-1.5 border-t border-slate-300 text-center text-[9px] text-slate-700 font-medium">
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
