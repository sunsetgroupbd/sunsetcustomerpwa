'use client';

import React, { useState } from 'react';
import { Icons } from './Icons';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, required, className = '', id, type, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    const isPassword = type === 'password';
    const effectiveType = isPassword ? (showPassword ? 'text' : 'password') : type;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
            {label} {required && <span className="text-rose-500">*</span>}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={effectiveType}
            className={`w-full px-3.5 py-2.5 sm:py-2 min-h-[42px] sm:min-h-0 bg-white text-slate-900 border rounded-lg text-sm transition-all placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#006B3E]/30 focus:border-[#006B3E] ${
              isPassword ? 'pr-11' : ''
            } ${
              error ? 'border-rose-400 focus:ring-rose-200 focus:border-rose-500' : 'border-slate-300'
            } ${className}`}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1 transition-colors"
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <Icons.EyeOff className="w-4 h-4 text-slate-500" size={16} />
              ) : (
                <Icons.Eye className="w-4 h-4 text-slate-400" size={16} />
              )}
            </button>
          )}
        </div>
        {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
        {helperText && !error && <p className="text-xs text-slate-500">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
