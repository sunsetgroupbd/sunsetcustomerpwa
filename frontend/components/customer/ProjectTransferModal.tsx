'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Icons } from '@/components/ui/Icons';
import { api } from '@/lib/api';
import { Application } from '@/lib/types';
import { getDivisionPackages } from '@/lib/packages';

interface ProjectTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: Application;
  onSuccess: () => void;
}

const DIVISION_OPTIONS = [
  { value: 'SKH', label: 'Sunset Kuakata Hotel & Resort (SKH)' },
  { value: 'DECK', label: "The Deck – Cox's Bazar (DECK)" },
  { value: 'DFI', label: 'Dynamic Futures International (DFI)' },
  { value: 'SCH', label: 'Sunset Cancer Hospital & Diagnostic (SCH)' },
  { value: 'SPC', label: 'Super Combo 4-in-1 Investment (SPC)' },
];

export const ProjectTransferModal: React.FC<ProjectTransferModalProps> = ({
  isOpen,
  onClose,
  application,
  onSuccess,
}) => {
  const currentCode = application.business?.code || 'SKH';
  const currentPkg = application.ownership_detail?.package_type || 'Bronze';
  const tokenPaid = Number(application.payment_detail?.token_money) || 0;
  const bookingPaid = Number(application.payment_detail?.booking_money) || 0;
  const totalPaid = Math.max(tokenPaid + bookingPaid, bookingPaid);

  const [targetDivision, setTargetDivision] = useState<string>(
    currentCode === 'SKH' ? 'SCH' : 'SKH'
  );
  const [targetPackage, setTargetPackage] = useState<string>(currentPkg);
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Calculate target pricing
  const targetSpecs = getDivisionPackages(targetDivision);
  const selectedSpec = targetSpecs.find((s) => s.name.toLowerCase() === targetPackage.toLowerCase()) || targetSpecs[0];
  const newPrice = selectedSpec ? selectedSpec.price : 0;
  const estimatedNewDues = Math.max(0, newPrice - totalPaid);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setErrorMsg('Please state your reason for requesting this project transfer.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      const targetDivObj = DIVISION_OPTIONS.find((d) => d.value === targetDivision);
      const structuredReason = `[PROJECT TRANSFER] Request to switch from ${application.business?.name || currentCode} (${currentPkg}) to ${targetDivObj?.label || targetDivision} (${targetPackage}). Transferred Paid Credit: ৳${totalPaid.toLocaleString('en-IN')}. Note: ${reason.trim()}`;

      await api.applications.requestEdit(
        String(application.id),
        structuredReason,
        JSON.stringify({
          transfer_type: 'project_switch',
          from_division: currentCode,
          to_division: targetDivision,
          to_package: targetPackage,
          transferred_credit: totalPaid,
          estimated_new_price: newPrice,
          estimated_new_dues: estimatedNewDues,
        })
      );

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit transfer request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Request Project or Package Transfer"
      description="You may request to switch your investment to another Sunset Group project. Any paid money will be fully credited to your new project."
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {errorMsg && (
          <div className="p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        {/* Current Investment Snapshot */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
          <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            Current Investment
          </div>
          <div className="flex justify-between items-center text-slate-800">
            <span className="font-semibold">{application.business?.name || 'Current Project'}</span>
            <span className="font-bold text-[#006B3E]">{currentPkg} Package</span>
          </div>
          <div className="flex justify-between items-center pt-1 border-t border-slate-200 text-slate-600">
            <span>Paid Money to Date (Token + Booking):</span>
            <strong className="font-mono text-emerald-800 font-bold">
              ৳ {totalPaid.toLocaleString('en-IN')}
            </strong>
          </div>
        </div>

        {/* Target Project Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Target Project"
            value={targetDivision}
            onChange={(e) => setTargetDivision(e.target.value)}
            options={DIVISION_OPTIONS.map((d) => ({
              value: d.value,
              label: d.label,
            }))}
          />

          <Select
            label="Target Package"
            value={targetPackage}
            onChange={(e) => setTargetPackage(e.target.value)}
            options={['Bronze', 'Silver', 'Gold', 'Platinum'].map((p) => ({
              value: p,
              label: `${p} Package`,
            }))}
          />
        </div>

        {/* Transferred Credit & New Pricing Estimation */}
        <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1.5">
          <div className="flex justify-between items-center text-slate-700">
            <span>New Package Base Price:</span>
            <strong className="font-mono text-slate-900">৳ {newPrice.toLocaleString('en-IN')}</strong>
          </div>
          <div className="flex justify-between items-center text-emerald-800">
            <span>Transferred Credit (Paid to date):</span>
            <strong className="font-mono">- ৳ {totalPaid.toLocaleString('en-IN')}</strong>
          </div>
          <div className="flex justify-between items-center pt-1.5 border-t border-emerald-200 font-bold text-slate-900 text-sm">
            <span>Estimated Remaining Dues:</span>
            <span className="text-[#006B3E] font-mono">৳ {estimatedNewDues.toLocaleString('en-IN')}</span>
          </div>
          <p className="text-[10px] text-emerald-700 mt-1">
            * Upon Admin approval, your investment ledger and receipts will be updated to the new project automatically.
          </p>
        </div>

        {/* Reason */}
        <Textarea
          label="Reason for Transfer"
          required
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Prefer to switch from Super Combo to Healthcare/Cancer Hospital for family stay and diagnostic privileges."
          helperText="Our Customer Relations and Accounts team will review and contact you."
        />

        {/* Actions */}
        <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
          <Button variant="ghost" size="sm" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            type="submit"
            isLoading={isSubmitting}
            className="bg-[#008751] hover:bg-[#007043]"
          >
            Submit Transfer Request
          </Button>
        </div>
      </form>
    </Modal>
  );
};
