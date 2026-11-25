import React, { useEffect } from 'react';
import { Icons } from './Icons';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'md',
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

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Dialog Container */}
      <div className="flex min-h-full items-end sm:items-center justify-center p-0 sm:p-4">
        <div
          className={`relative w-full ${maxWidthClasses[maxWidth]} bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] sm:max-h-[88vh] transform transition-all animate-in slide-in-from-bottom-4 duration-200`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Mobile Swipe Handle Indicator */}
          <div className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0">
            <div className="w-10 h-1 bg-slate-300 rounded-full" />
          </div>

          {/* Modal Header (Fixed at top of modal) */}
          <div className="flex items-start justify-between px-5 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 shrink-0">
            <div className="pr-3">
              <h3 className="text-base font-bold text-slate-900 leading-snug">{title}</h3>
              {description && <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{description}</p>}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 -mr-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
              aria-label="Close modal"
            >
              <Icons.X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body (Fully scrollable on touch and desktop) */}
          <div className="flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6 pb-12 sm:pb-6 touch-auto">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
