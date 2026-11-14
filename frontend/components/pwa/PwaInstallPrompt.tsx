'use client';

import React, { useState, useEffect } from 'react';
import { Icons } from '@/components/ui/Icons';

export const PwaInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed)
    const isRunningStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes('android-app://');

    setIsStandalone(isRunningStandalone);

    // Check dismissed state
    const dismissedUntil = localStorage.getItem('sunset_pwa_dismissed');
    if (dismissedUntil && Date.now() < parseInt(dismissedUntil, 10)) {
      setIsDismissed(true);
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    // Remember dismissal for 3 days
    localStorage.setItem('sunset_pwa_dismissed', (Date.now() + 3 * 24 * 60 * 60 * 1000).toString());
  };

  // Only show if prompt is available, not dismissed, and not in standalone
  if (!deferredPrompt || isDismissed || isStandalone) {
    return null;
  }

  return (
    <aside
      aria-label="Install Sunset Group App"
      className="fixed top-3 left-3 right-3 sm:left-auto sm:right-4 sm:top-4 z-50 max-w-sm sm:max-w-md bg-slate-900/95 backdrop-blur-md text-white rounded-2xl p-3 shadow-2xl border border-slate-800 transition-all animate-in fade-in slide-in-from-top-4"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-white p-1.5 flex items-center justify-center shrink-0 shadow-inner">
            <Icons.Logo className="w-full h-full object-contain" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs font-bold text-white truncate">Install Sunset App</h2>
            <p className="text-[11px] text-slate-400 truncate">Fast access &amp; instant notifications</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleInstallClick}
            className="px-3 py-1.5 bg-[#006B3E] hover:bg-[#005632] text-white text-xs font-semibold rounded-lg shadow-sm transition-all active:scale-95 flex items-center gap-1"
          >
            <Icons.Download className="w-3.5 h-3.5" size={14} />
            Install
          </button>
          <button
            onClick={handleDismiss}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
            aria-label="Dismiss banner"
          >
            <Icons.X className="w-4 h-4" size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
};
