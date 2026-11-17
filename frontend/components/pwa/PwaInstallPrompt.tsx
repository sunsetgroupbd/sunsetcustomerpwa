'use client';

import React, { useState, useEffect } from 'react';
import { Icons } from '@/components/ui/Icons';

export const PwaInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);

  useEffect(() => {
    setMounted(true);

    // 1. Register Service Worker so browser recognizes PWA installation
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('Service worker registration failed:', err);
      });
    }

    // 2. Check if running in standalone mode (already running inside the installed app)
    const isRunningStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isRunningStandalone) {
      setIsStandalone(true);
      return;
    }

    // 3. Detect iOS device
    const userAgent = window.navigator.userAgent || '';
    const isIosDevice = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
    setIsIos(isIosDevice);

    // 4. Capture native Chromium install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsStandalone(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setIsStandalone(true);
          setDeferredPrompt(null);
        }
      } catch (err) {
        setShowGuideModal(true);
      }
    } else {
      // For iOS Safari or browsers where prompt event doesn't fire directly
      setShowGuideModal(true);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  // Only render on client after mount.
  // Stays permanently visible until the user explicitly clicks the cross (X) or opens the standalone app.
  if (!mounted || isStandalone || isDismissed) {
    return null;
  }

  return (
    <>
      {/* Bottom Floating PWA Install Bar - Positioned cleanly above mobile bottom navbar */}
      <aside
        aria-label="Install Sunset Group App"
        className="fixed bottom-20 left-3 right-3 sm:bottom-20 md:bottom-4 md:left-auto md:right-4 z-50 max-w-sm md:max-w-md bg-slate-900 text-white rounded-2xl p-3 shadow-2xl border border-slate-800 transition-all animate-in fade-in slide-in-from-bottom-4"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white p-1.5 flex items-center justify-center shrink-0 shadow-sm">
              <Icons.Logo className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs font-bold text-white truncate">Install Sunset App</h2>
              <p className="text-[11px] text-slate-400 truncate">One-tap mobile access &amp; portal</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleInstallClick}
              className="px-3 py-1.5 bg-[#008751] hover:bg-[#007043] text-white text-xs font-bold rounded-lg shadow-sm transition-all active:scale-95 flex items-center gap-1"
            >
              <Icons.Download className="w-3.5 h-3.5" size={14} />
              <span>Install</span>
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

      {/* Manual Install Guide Modal (for iOS or browsers without native prompt) */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 p-1 flex items-center justify-center">
                  <Icons.Logo className="w-full h-full object-contain" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Add to Home Screen</h3>
                  <p className="text-[11px] text-slate-500">Install Sunset Group Portal App</p>
                </div>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <Icons.X className="w-5 h-5" />
              </button>
            </div>

            {isIos ? (
              <div className="space-y-3 text-xs text-slate-700">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-[#008751] font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <span>
                    Tap the <strong>Share</strong> button at the bottom of Safari (<span className="font-mono text-slate-900">⎋</span> or box with arrow).
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-[#008751] font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <span>
                    Scroll down and tap <strong>Add to Home Screen</strong> (<span className="font-bold">➕</span>).
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-[#008751] font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <span>
                    Tap <strong>Add</strong> in the top-right corner to finish.
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs text-slate-700">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-[#008751] font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <span>
                    Tap the browser menu (<strong>⋮</strong> or <strong>⋯</strong> in the top-right).
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-[#008751] font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <span>
                    Select <strong>Install app</strong> or <strong>Add to Home Screen</strong>.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-[#008751] font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <span>
                    Confirm by tapping <strong>Install</strong>.
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowGuideModal(false)}
              className="w-full py-2 bg-[#008751] hover:bg-[#007043] text-white text-xs font-bold rounded-lg transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
