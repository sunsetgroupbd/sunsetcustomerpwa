import React from 'react';
import { Icons } from './Icons';

interface AlertProps {
  type?: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({ type = 'info', title, children, className = '' }) => {
  const styles = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    error: 'bg-rose-50 border-rose-200 text-rose-800',
  };

  const icons = {
    info: <Icons.AlertCircle className="w-5 h-5 text-blue-600 shrink-0" />,
    success: <Icons.CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />,
    warning: <Icons.AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />,
    error: <Icons.AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />,
  };

  return (
    <div className={`p-4 rounded-xl border flex items-start gap-3 ${styles[type]} ${className}`}>
      {icons[type]}
      <div className="flex-1 text-sm">
        {title && <h4 className="font-semibold mb-1">{title}</h4>}
        <div className="text-xs leading-relaxed opacity-90">{children}</div>
      </div>
    </div>
  );
};

