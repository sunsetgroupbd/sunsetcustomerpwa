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
    MANGROVE: '/mangrovelogo.png',
    DFI: '/dfilogo.png',
    SCH: '/suncarelogo.png',
    SPC: '/sunsetcombologo.png',
    DECK: '',
  };

  const packageColors: Record<string, { bg: string; text: string; border: string }> = {
    Bronze: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
    Silver: { bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-300' },
    Gold: { bg: 'bg-yellow-50', text: 'text-yellow-800', border: 'border-yellow-300' },
    Platinum: { bg: 'bg-indigo-50', text: 'text-indigo-800', border: 'border-indigo-200' },
  };

  // Canonical project card order: SKH, DFI, SCH, DECK (placed before Super Combo), SPC, and Mangrove last
  const codeOrder: Record<string, number> = {
    SKH: 1,
    DFI: 2,
    SCH: 3,
    DECK: 4,
    SPC: 5,
    MANGROVE: 6,
  };

  const sortedProjects = [...projects].sort((a, b) => {
    const codeA = a.business_code.toUpperCase().trim();
    const codeB = b.business_code.toUpperCase().trim();
    const orderA = codeOrder[codeA] ?? 99;
    const orderB = codeOrder[codeB] ?? 99;
    return orderA - orderB;
  });

  // Generate crisp, Black & White (B&W) print-optimized HTML audit report
  const generatePrintHtml = (): string => {
    const printTimestamp = new Date().toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const rowsHtml = sortedProjects
      .map((proj, idx) => {
        const code = proj.business_code.toUpperCase().trim();
        const isCombo = proj.is_combo_engine || code === 'SPC';
        const isComboOnly = proj.is_combo_only || code === 'MANGROVE';
        const directCount = proj.direct_shares_sold ?? proj.shares_sold;
        const comboCount = proj.combo_shares_sold ?? 0;

        const pkgMap: Record<string, number> = {};
        (proj.packages || []).forEach((p) => {
          pkgMap[p.package_name] = p.shares_sold;
        });

        const channelLabel = isCombo
          ? '4-in-1 Combo Engine'
          : isComboOnly
          ? 'Combo Exclusive Allocation'
          : 'Direct Core Asset';

        const directDisplay = isComboOnly
          ? '0'
          : isCombo
          ? `${directCount} pkgs`
          : `${directCount}`;

        const comboDisplay = isCombo
          ? '&mdash;'
          : comboCount > 0
          ? `+${comboCount}`
          : '0';

        return `
          <tr>
            <td style="text-align:center; font-family:monospace; font-weight:bold;">${idx + 1}</td>
            <td>
              <div style="font-weight:bold; font-size:10px;">${proj.business_name}</div>
              <div style="font-size:8.5px; color:#333; font-family:monospace;">CODE: [${proj.business_code}]</div>
            </td>
            <td style="font-size:9px; text-transform:uppercase; font-weight:600;">${channelLabel}</td>
            <td style="text-align:right; font-family:monospace; font-weight:bold;">${directDisplay}</td>
            <td style="text-align:right; font-family:monospace; font-weight:bold;">${comboDisplay}</td>
            <td style="text-align:center; font-family:monospace;">${pkgMap['Bronze'] ?? 0}</td>
            <td style="text-align:center; font-family:monospace;">${pkgMap['Silver'] ?? 0}</td>
            <td style="text-align:center; font-family:monospace;">${pkgMap['Gold'] ?? 0}</td>
            <td style="text-align:center; font-family:monospace;">${pkgMap['Platinum'] ?? 0}</td>
            <td style="text-align:right; font-family:monospace; font-weight:900; font-size:10.5px;">${proj.shares_sold} ${isCombo ? 'pkgs' : 'shares'}</td>
            <td style="text-align:right; font-family:monospace; font-weight:bold; color:#000;">${proj.shares_pending > 0 ? `+${proj.shares_pending}` : '0'}</td>
          </tr>
        `;
      })
      .join('');

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Share Allocation & Sold Inventory Report - Sunset Group</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm 10mm 10mm 10mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            font-size: 9.5px;
            color: #000000;
            background: #ffffff;
            margin: 0;
            padding: 12px;
          }
          .report-container {
            border: 2px solid #000000;
            padding: 14px;
          }
          .header-strip {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #000000;
            padding-bottom: 10px;
            margin-bottom: 12px;
          }
          .brand-title {
            font-size: 17px;
            font-weight: 900;
            margin: 0;
            letter-spacing: 0.5px;
            text-transform: uppercase;
          }
          .brand-subtitle {
            font-size: 8.5px;
            color: #111;
            margin: 2px 0 0;
          }
          .audit-badge-box {
            text-align: right;
          }
          .audit-badge {
            display: inline-block;
            border: 1.5px solid #000;
            padding: 2px 7px;
            font-size: 10px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .meta-text {
            font-size: 8.5px;
            color: #222;
            margin-top: 3px;
            font-family: monospace;
          }
          .doc-title-bar {
            background-color: #f1f5f9;
            border: 1px solid #000000;
            padding: 6px 10px;
            margin-bottom: 12px;
          }
          .doc-title {
            font-size: 12.5px;
            font-weight: 900;
            text-transform: uppercase;
            margin: 0;
            letter-spacing: 0.3px;
          }
          .doc-desc {
            font-size: 8.5px;
            color: #222;
            margin: 2px 0 0;
          }
          .kpi-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
            margin-bottom: 14px;
          }
          .kpi-card {
            border: 1.5px solid #000000;
            padding: 7px 9px;
            text-align: center;
            background: #ffffff;
          }
          .kpi-label {
            font-size: 8px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            color: #111;
            display: block;
            margin-bottom: 3px;
          }
          .kpi-val {
            font-size: 16px;
            font-weight: 900;
            font-family: monospace;
            display: block;
            color: #000000;
          }
          .kpi-sub {
            font-size: 8px;
            font-weight: 600;
            color: #333;
          }
          table.report-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
          }
          table.report-table th,
          table.report-table td {
            border: 1px solid #000000;
            padding: 4.5px 5.5px;
            vertical-align: middle;
          }
          table.report-table th {
            background-color: #e2e8f0;
            font-weight: 900;
            text-transform: uppercase;
            font-size: 8px;
            letter-spacing: 0.2px;
            text-align: left;
          }
          table.report-table tbody tr:nth-child(even) {
            background-color: #f8fafc;
          }
          .notes-box {
            border: 1px solid #000000;
            padding: 7px 10px;
            margin-bottom: 14px;
            background: #ffffff;
          }
          .notes-title {
            font-size: 8.5px;
            font-weight: 900;
            text-transform: uppercase;
            margin: 0 0 3px;
          }
          .notes-list {
            margin: 0;
            padding-left: 14px;
            font-size: 8px;
            line-height: 1.35;
            color: #111;
          }
          .sig-row {
            display: flex;
            justify-content: space-between;
            margin-top: 22px;
            padding-top: 4px;
          }
          .sig-box {
            width: 28%;
            text-align: center;
          }
          .sig-line {
            border-top: 1.5px dashed #000000;
            margin-bottom: 4px;
          }
          .sig-title {
            font-size: 8px;
            font-weight: 900;
            text-transform: uppercase;
          }
          .footer-text {
            text-align: center;
            font-size: 7.5px;
            color: #333;
            margin-top: 12px;
            border-top: 1px solid #000;
            padding-top: 4px;
          }
          @media print {
            body {
              padding: 0;
            }
            .report-container {
              border: 1.5px solid #000;
            }
          }
        </style>
      </head>
      <body>
        <div class="report-container">
          <!-- Corporate Header -->
          <div class="header-strip">
            <div>
              <h1 class="brand-title">SUNSET GROUP OF COMPANIES</h1>
              <div class="brand-subtitle">Corporate Office: Level-11, Shaptak Square, Road-16 (Old 27), Dhanmondi, Dhaka-1209</div>
              <div class="brand-subtitle">Web: www.sunsetgroupbd.com &bull; Investor & Share Ledger Services</div>
            </div>
            <div class="audit-badge-box">
              <div class="audit-badge">OFFICIAL AUDIT REPORT</div>
              <div class="meta-text">Report Date: ${printTimestamp}</div>
              <div class="meta-text">Format: B&amp;W High Contrast</div>
            </div>
          </div>

          <!-- Document Title Bar -->
          <div class="doc-title-bar">
            <h2 class="doc-title">Share Allocation &amp; Confirmed Sold Inventory Audit</h2>
            <div class="doc-desc">Executive balance across direct individual project sales and 4-in-1 Super Combo portfolio allocations.</div>
          </div>

          <!-- KPI Summary Strip -->
          <div class="kpi-grid">
            <div class="kpi-card">
              <span class="kpi-label">Total Shares Confirmed</span>
              <span class="kpi-val">${total_shares_sold}</span>
              <span class="kpi-sub">Portfolio Units</span>
            </div>
            <div class="kpi-card">
              <span class="kpi-label">Direct Individual Sold</span>
              <span class="kpi-val">${total_direct_sold}</span>
              <span class="kpi-sub">Single Project Shares</span>
            </div>
            <div class="kpi-card">
              <span class="kpi-label">Super Combo Packages</span>
              <span class="kpi-val">${total_combo_sold}</span>
              <span class="kpi-sub">4-in-1 Asset Engines</span>
            </div>
            <div class="kpi-card">
              <span class="kpi-label">Verification Pipeline</span>
              <span class="kpi-val">${total_shares_pending}</span>
              <span class="kpi-sub">Pending Compliance</span>
            </div>
          </div>

          <!-- Tabular Share Inventory Matrix -->
          <table class="report-table">
            <thead>
              <tr>
                <th style="width:4%; text-align:center;">#</th>
                <th style="width:24%;">Project / Asset Entity</th>
                <th style="width:16%;">Allocation Model</th>
                <th style="width:8%; text-align:right;">Direct Sold</th>
                <th style="width:8%; text-align:right;">From Combo</th>
                <th style="width:5%; text-align:center;">Bronze</th>
                <th style="width:5%; text-align:center;">Silver</th>
                <th style="width:5%; text-align:center;">Gold</th>
                <th style="width:5%; text-align:center;">Plat</th>
                <th style="width:11%; text-align:right;">Total Confirmed</th>
                <th style="width:9%; text-align:right;">Pending Req</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
            <tfoot>
              <tr style="background-color:#e2e8f0; font-weight:900;">
                <td colspan="3" style="text-align:right; font-weight:900; text-transform:uppercase;">Grand Portfolio Total:</td>
                <td style="text-align:right; font-family:monospace; font-weight:900;">${total_direct_sold}</td>
                <td style="text-align:right; font-family:monospace; font-weight:900;">${total_combo_sold > 0 ? `+${total_combo_sold * 4}` : '0'}</td>
                <td colspan="4" style="text-align:center; font-size:7.5px; font-weight:bold; color:#222;">TIER DISTRIBUTION ITEMIZED ABOVE</td>
                <td style="text-align:right; font-family:monospace; font-weight:900; font-size:11px;">${total_shares_sold} Units</td>
                <td style="text-align:right; font-family:monospace; font-weight:900;">+${total_shares_pending} Req</td>
              </tr>
            </tfoot>
          </table>

          <!-- Audit Notes & Formulas -->
          <div class="notes-box">
            <div class="notes-title">Audit Ledger &amp; Allocation Rules:</div>
            <ol class="notes-list">
              <li><strong>Direct Sold:</strong> Confirmed ownership units registered directly under individual company applications.</li>
              <li><strong>Super Combo Allocations:</strong> Each 4-in-1 Super Combo package legally provisions proportionate units across Sunset Kuakata, Mangrove Eco Resort, DFI, and Sun Care Hospital (Bronze: 1, Silver: 3, Gold: 5, Platinum: 10 units each).</li>
              <li><strong>Mangrove Eco Hotel &amp; Resort Ltd.:</strong> Sold exclusively through the Super Combo 4-in-1 distribution engine (Direct Individual Sales = 0).</li>
              <li><strong>Verification Pipeline:</strong> Applications submitted with payment receipts awaiting financial clearance and CR audit.</li>
            </ol>
          </div>

          <!-- Signatures -->
          <div class="sig-row">
            <div class="sig-box">
              <div class="sig-line"></div>
              <div class="sig-title">Prepared By (System Admin)</div>
            </div>
            <div class="sig-box">
              <div class="sig-line"></div>
              <div class="sig-title">Verified By (Financial Auditor)</div>
            </div>
            <div class="sig-box">
              <div class="sig-line"></div>
              <div class="sig-title">Authorized Signatory (Board / MD)</div>
            </div>
          </div>

          <!-- Footer -->
          <div class="footer-text">
            Confidential Internal Audit Document &bull; Sunset Group Customer Management System &bull; System Generated Record
          </div>
        </div>
      </body>
      </html>
    `;
  };

  // Trigger print via dedicated off-screen iframe (B&W print optimized)
  const handlePrint = () => {
    try {
      const existing = document.getElementById('inventory-print-frame');
      if (existing) {
        document.body.removeChild(existing);
      }

      const iframe = document.createElement('iframe');
      iframe.id = 'inventory-print-frame';
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
        doc.write(generatePrintHtml());
        doc.close();

        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch {
            const win = window.open('', '_blank', 'width=900,height=950');
            if (win) {
              win.document.open();
              win.document.write(generatePrintHtml());
              win.document.close();
              win.focus();
              win.print();
            }
          }
        }, 250);
      }
    } catch (e) {
      console.error('Failed to trigger inventory print:', e);
      window.print();
    }
  };

  return (
    <Card className="border-slate-200 shadow-xs overflow-hidden">
      {/* Header section with overall summary & Print action */}
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
              Tracks confirmed share units sold via direct applications and 4-in-1 Super Combo bundle allocations across all portfolio assets.
            </p>
          </div>

          {/* Action Button & Minimal KPI pill summary */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            {/* Print Button (B&W Optimized) */}
            <button
              onClick={handlePrint}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-300 rounded-xl font-bold text-xs shadow-2xs hover:shadow-xs transition-all cursor-pointer active:scale-95 shrink-0"
              title="Print Share Allocation & Sold Inventory Audit Report (Black & White Print Optimized)"
            >
              <Icons.Printer className="w-4 h-4 text-slate-700" />
              <span>Print Inventory</span>
              <span className="text-[9px] px-1 py-0.2 rounded bg-slate-100 text-slate-600 font-mono font-bold border border-slate-200 uppercase">
                B&amp;W
              </span>
            </button>

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

      {/* Project Division Cards Grid */}
      <div className="p-4 sm:p-5 bg-slate-50/50">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
          {sortedProjects.map((proj) => {
            const code = proj.business_code.toUpperCase().trim();
            const logo = projectLogos[code] !== undefined ? projectLogos[code] : '/sunsetlogo.png';
            const isCombo = proj.is_combo_engine || code === 'SPC';
            const isComboOnly = proj.is_combo_only || code === 'MANGROVE';

            const directCount = proj.direct_shares_sold ?? proj.shares_sold;
            const comboCount = proj.combo_shares_sold ?? 0;

            return (
              <div
                key={proj.business_id}
                className={`border rounded-xl p-3.5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between ${
                  isCombo
                    ? 'bg-amber-50/40 border-amber-300 ring-1 ring-amber-200'
                    : isComboOnly
                    ? 'bg-emerald-50/20 border-teal-200'
                    : code === 'DECK'
                    ? 'bg-sky-50/20 border-sky-200'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  {/* Project Header */}
                  <div className="flex items-start justify-between gap-2.5 pb-2.5 border-b border-slate-100">
                    <div className="flex items-center gap-2 min-w-0">
                      {logo ? (
                        <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                          <img src={logo} alt={proj.business_name} className="w-full h-full object-contain" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-300 flex items-center justify-center shrink-0 text-[#006B3E] font-black text-[9px] font-mono shadow-2xs">
                          {code}
                        </div>
                      )}
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 leading-tight truncate" title={proj.business_name}>
                          {proj.business_name}
                        </h4>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-[10px] font-mono font-bold text-[#008751] uppercase">
                            {proj.business_code}
                          </span>
                          {isCombo && (
                            <span className="text-[8.5px] font-extrabold text-amber-800 bg-amber-100 border border-amber-300 px-1 rounded">
                              4-in-1 Engine
                            </span>
                          )}
                          {isComboOnly && (
                            <span className="text-[8.5px] font-bold text-teal-800 bg-teal-100 border border-teal-300 px-1 rounded">
                              Combo Exclusive
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
                          {isCombo ? 'Packages Sold' : 'Confirmed Sold'}
                        </span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-2xl font-black font-mono text-slate-900">
                            {proj.shares_sold}
                          </span>
                          <span className="text-xs font-medium text-slate-500">
                            {proj.shares_sold === 1 ? (isCombo ? 'Pkg' : 'Share') : (isCombo ? 'Pkgs' : 'Shares')}
                          </span>
                        </div>
                      </div>

                      {proj.shares_pending > 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-blue-50 text-blue-700 border border-blue-200">
                          +{proj.shares_pending} req
                        </span>
                      )}
                    </div>

                    {/* Breakdown tag for physical projects (Direct vs Combo) */}
                    {isCombo ? (
                      <p className="text-[9px] text-amber-800 font-medium mt-1 leading-tight">
                        Each package distributes equal shares to SKH, Mangrove, DFI, &amp; SCH.
                      </p>
                    ) : isComboOnly ? (
                      <div className="flex items-center gap-1.5 mt-2 text-[10px]">
                        <span className="px-1.5 py-0.5 rounded bg-teal-100/80 text-teal-900 border border-teal-300 font-mono font-bold">
                          From Combo: <strong>+{comboCount}</strong>
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-50 text-slate-400 border border-slate-200 font-mono">
                          Direct: 0
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 mt-2 text-[10px]">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-mono text-[9.5px]">
                          Direct: <strong>{directCount}</strong>
                        </span>
                        <span className={`px-1.5 py-0.5 rounded font-mono text-[9.5px] ${
                          comboCount > 0
                            ? 'bg-amber-100/80 text-amber-900 border border-amber-300 font-bold'
                            : 'bg-slate-50 text-slate-400 border border-slate-200'
                        }`}>
                          Combo: <strong>+{comboCount}</strong>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Package breakdown within this project */}
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-[9.5px] uppercase font-bold text-slate-400 block mb-1.5 tracking-wider">
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
                            <span className={`text-[8.5px] font-bold uppercase block ${theme.text}`}>
                              {pkg.package_name}
                            </span>
                            <div className="font-mono font-bold text-xs text-slate-900 mt-0.5">
                              {pkg.shares_sold}{' '}
                              <span className="text-[8.5px] font-normal text-slate-500 font-sans">
                                {isCombo ? 'pkg' : 'sold'}
                              </span>
                            </div>

                            {/* Direct vs Combo detail if physical project */}
                            {!isCombo && !isComboOnly && (
                              <div className="text-[8px] text-slate-500 font-mono mt-0.5 leading-tight">
                                <span>{pkgDirect}d</span>
                                {pkgCombo > 0 && (
                                  <span className="text-amber-700 font-bold ml-0.5">+{pkgCombo}c</span>
                                )}
                              </div>
                            )}

                            {isComboOnly && (
                              <div className="text-[8px] text-teal-700 font-mono mt-0.5 font-semibold">
                                via combo
                              </div>
                            )}

                            {pkg.shares_pending > 0 && (
                              <span className="text-[8.5px] font-mono text-blue-600 block mt-0.5 font-semibold">
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
