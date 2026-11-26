'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    __prajaSevaDeferredPrompt?: any;
  }
}

export default function PwaBootstrapper() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Register Service Worker for PWA installability
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('[PWA] Service Worker registration skipped:', err);
      });
    }

    // 2. Capture beforeinstallprompt globally as early as possible
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      window.__prajaSevaDeferredPrompt = e;
      window.dispatchEvent(new Event('prajaseva-pwa-prompt-ready'));
    };

    // 3. Track installation completion
    const handleAppInstalled = () => {
      window.__prajaSevaDeferredPrompt = null;
      try {
        localStorage.setItem('praja_seva_pwa_installed', 'true');
      } catch {}
      window.dispatchEvent(new Event('prajaseva-pwa-installed'));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  return null;
}
