import { useState, useEffect, useCallback } from 'react';
import { checkSimulateInstalled } from './devSimulation';

export type DevicePlatform = 'ios' | 'android' | 'mac' | 'windows' | 'linux';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const INSTALL_DISMISSED_KEY = 'reneu_install_dismissed';

export function detectDevicePlatform(): DevicePlatform {
  if (typeof window === 'undefined') return 'windows';
  const ua = window.navigator.userAgent.toLowerCase();

  // iOS / iPadOS check (including iPadOS where userAgent looks like MacIntel but maxTouchPoints > 1)
  const isIOS =
    /iphone|ipad|ipod/.test(ua) ||
    (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
  if (isIOS) return 'ios';

  if (/android/.test(ua)) return 'android';
  if (/macintosh|mac os x/.test(ua)) return 'mac';
  if (/windows|win32|win64/.test(ua)) return 'windows';
  if (/linux|cros/.test(ua)) return 'linux';
  return 'windows';
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    if (checkSimulateInstalled()) return true;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes('android-app://')
    );
  });

  const [platform, setPlatform] = useState<DevicePlatform>(() => detectDevicePlatform());
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem(INSTALL_DISMISSED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setPlatform(detectDevicePlatform());

    const updateInstallStatus = () => {
      const isSimulated = checkSimulateInstalled();
      const isStandalone =
        isSimulated ||
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
        document.referrer.includes('android-app://');
      setIsInstalled(isStandalone);
    };

    updateInstallStatus();

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    const handleSimInstalled = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setIsInstalled(Boolean(detail));
    };

    const handleDismissSync = () => {
      try {
        setIsDismissed(localStorage.getItem(INSTALL_DISMISSED_KEY) === 'true');
      } catch {}
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('scripturepage-sim-installed', handleSimInstalled);
    window.addEventListener('storage', handleDismissSync);
    window.addEventListener('reneu-install-dismissed', handleDismissSync);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('scripturepage-sim-installed', handleSimInstalled);
      window.removeEventListener('storage', handleDismissSync);
      window.removeEventListener('reneu-install-dismissed', handleDismissSync);
    };
  }, []);

  const install = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) return false;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        return true;
      }
    } catch (err) {
      console.warn('[PWA] Prompt error:', err);
    }
    return false;
  }, [deferredPrompt]);

  const dismissInstall = useCallback((doNotShowAgain = true) => {
    if (doNotShowAgain && typeof window !== 'undefined') {
      try {
        localStorage.setItem(INSTALL_DISMISSED_KEY, 'true');
      } catch {}
    }
    setIsDismissed(true);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('reneu-install-dismissed'));
    }
  }, []);

  const resetDismissal = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(INSTALL_DISMISSED_KEY);
      } catch {}
    }
    setIsDismissed(false);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('reneu-install-dismissed'));
    }
  }, []);

  return {
    deferredPrompt,
    isInstalled,
    isDismissed,
    platform,
    isIOS: platform === 'ios',
    install,
    dismissInstall,
    resetDismissal,
  };
}

export default usePWAInstall;
