import React from 'react';
import { ApplicationStatus, DocumentVerificationStatus } from '@/lib/types';

interface BadgeProps {
  children?: React.ReactNode;
  status?: ApplicationStatus | DocumentVerificationStatus | string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, status, variant, className = '' }) => {
  let badgeClasses = 'bg-slate-100 text-slate-700 border-slate-200';
  let label = children;

  if (status) {
    switch (status) {
      case 'approved':
      case 'verified':
        badgeClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        label = label || (status === 'verified' ? 'Verified' : 'Approved');
        break;
      case 'submitted':
        badgeClasses = 'bg-amber-50 text-amber-700 border-amber-200';
        label = label || 'Submitted';
        break;
      case 'under_review':
        badgeClasses = 'bg-blue-50 text-blue-700 border-blue-200';
        label = label || 'Under Review';
        break;
      case 'action_required':
        badgeClasses = 'bg-purple-50 text-purple-700 border-purple-200';
        label = label || 'Action Required';
        break;
      case 'rejected':
        badgeClasses = 'bg-rose-50 text-rose-700 border-rose-200';
        label = label || 'Rejected';
        break;
      case 'returned':
        badgeClasses = 'bg-orange-50 text-orange-700 border-orange-200';
        label = label || 'Returned';
        break;
      case 'draft':
      case 'pending':
        badgeClasses = 'bg-slate-100 text-slate-600 border-slate-200';
        label = label || (status === 'pending' ? 'Pending' : 'Draft');
        break;
      default:
        badgeClasses = 'bg-slate-100 text-slate-700 border-slate-200';
        break;
    }
  } else if (variant) {
    const variantMap = {
      default: 'bg-slate-100 text-slate-700 border-slate-200',
      success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      warning: 'bg-amber-50 text-amber-700 border-amber-200',
      danger: 'bg-rose-50 text-rose-700 border-rose-200',
      info: 'bg-blue-50 text-blue-700 border-blue-200',
      purple: 'bg-purple-50 text-purple-700 border-purple-200',
    };
    badgeClasses = variantMap[variant];
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeClasses} ${className}`}
    >
      {label}
    </span>
  );
};

