'use client';

import React, { useEffect } from 'react';
import { AuthProvider } from '@/lib/auth-context';

export function AppProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Register Service Worker for PWA
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => console.log('ServiceWorker registered:', reg.scope))
          .catch((err) => console.log('ServiceWorker registration failed:', err));
      });
    }
  }, []);

  return <AuthProvider>{children}</AuthProvider>;
}

