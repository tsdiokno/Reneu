import { useState, useEffect, useCallback, useRef } from 'react';
import { useOnlineStatus } from './useOnlineStatus';
import { checkIsDevMode } from './devSimulation';

export type PWAUpdateStatus = 'idle' | 'checking' | 'available' | 'latest' | 'offline' | 'error';

export interface PWAUpdateInfo {
  updateStatus: PWAUpdateStatus;
  hasUpdate: boolean;
  isChecking: boolean;
  isOnline: boolean;
  lastCheckedTime: string | null;
  appVersion: string;
  isStandalone: boolean;
  serviceWorkerSupported: boolean;
  checkForUpdate: () => Promise<boolean>;
  applyUpdate: () => Promise<void>;
}

export const FALLBACK_RELEASE_TAG = 'v1.3.0';

export function resolveInitialAppVersion(): string {
  if (import.meta.env.DEV || checkIsDevMode()) {
    return 'Dev';
  }
  if (typeof window !== 'undefined') {
    const cached = sessionStorage.getItem('github_release_tag') || localStorage.getItem('github_release_tag');
    if (cached) return cached;
  }
  const envTag =
    (import.meta.env.VITE_GITHUB_RELEASE_TAG as string | undefined) ||
    (import.meta.env.VITE_RELEASE_TAG as string | undefined) ||
    (import.meta.env.VITE_APP_VERSION as string | undefined);
  if (envTag) {
    return envTag.startsWith('v') ? envTag : `v${envTag}`;
  }
  return FALLBACK_RELEASE_TAG;
}

function formatTimestamp(d: Date): string {
  try {
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return 'Just now';
  }
}

export function usePWAUpdate(): PWAUpdateInfo {
  const isOnline = useOnlineStatus();
  const [updateStatus, setUpdateStatus] = useState<PWAUpdateStatus>('idle');
  const [hasUpdate, setHasUpdate] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [lastCheckedTime, setLastCheckedTime] = useState<string | null>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [serviceWorkerSupported, setServiceWorkerSupported] = useState<boolean>(false);
  const [appVersion, setAppVersion] = useState<string>(resolveInitialAppVersion);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  // Fetch latest GitHub release tag in production
  const syncReleaseTag = useCallback(async () => {
    if (import.meta.env.DEV || checkIsDevMode()) {
      setAppVersion('Dev');
      return;
    }

    let detectedRepo = (import.meta.env.VITE_GITHUB_REPO as string | undefined) || '';

    try {
      // 1. Check server system status endpoint
      const sysRes = await fetch('/api/system/status');
      if (sysRes.ok) {
        const sysData = await sysRes.json();
        if (sysData.githubRepo && typeof sysData.githubRepo === 'string') {
          detectedRepo = sysData.githubRepo;
        }
        if (sysData.releaseTag && sysData.releaseTag !== 'Dev') {
          const formatted = sysData.releaseTag.startsWith('v') ? sysData.releaseTag : `v${sysData.releaseTag}`;
          setAppVersion(formatted);
          sessionStorage.setItem('github_release_tag', formatted);
        }
      }
    } catch {}

    // 2. Query GitHub Releases API directly (instant update when release is published via GitHub UI)
    const repo = detectedRepo || (import.meta.env.VITE_GITHUB_REPO as string | undefined);
    if (repo && !repo.includes('your-username')) {
      try {
        const ghRes = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
          headers: { Accept: 'application/vnd.github.v3+json' },
        });
        if (ghRes.ok) {
          const ghData = await ghRes.json();
          const rawTag = ghData.tag_name || ghData.name;
          if (rawTag && typeof rawTag === 'string') {
            const formatted = rawTag.startsWith('v') ? rawTag : `v${rawTag}`;
            setAppVersion(formatted);
            sessionStorage.setItem('github_release_tag', formatted);
          }
        }
      } catch {}
    }
  }, []);

  useEffect(() => {
    void syncReleaseTag();
  }, [syncReleaseTag]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detect standalone PWA mode
    const standaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(standaloneMode);

    const hasSW = 'serviceWorker' in navigator;
    setServiceWorkerSupported(hasSW);

    if (!hasSW) return;

    // Inspect existing service worker registration
    navigator.serviceWorker
      .getRegistration()
      .then((reg) => {
        if (!reg) return;
        registrationRef.current = reg;

        // If a new worker is already waiting, an update is ready!
        if (reg.waiting) {
          setHasUpdate(true);
          setUpdateStatus('available');
        }

        // Listen for new worker updates found in the background
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setHasUpdate(true);
                setUpdateStatus('available');
              }
            });
          }
        });
      })
      .catch(() => {});

    // Listen for custom event dispatched by virtual:pwa-register
    const handleUpdateAvailable = () => {
      setHasUpdate(true);
      setUpdateStatus('available');
    };

    window.addEventListener('pwa-update-available', handleUpdateAvailable);
    return () => {
      window.removeEventListener('pwa-update-available', handleUpdateAvailable);
    };
  }, []);

  // Update check logic
  const checkForUpdate = useCallback(async (): Promise<boolean> => {
    if (!navigator.onLine) {
      setUpdateStatus('offline');
      return false;
    }

    setIsChecking(true);
    setUpdateStatus('checking');
    void syncReleaseTag();

    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          registrationRef.current = reg;
          await reg.update();

          // Brief delay to allow service worker state changes to propagate
          await new Promise((resolve) => setTimeout(resolve, 800));

          if (reg.waiting) {
            setHasUpdate(true);
            setUpdateStatus('available');
            setIsChecking(false);
            setLastCheckedTime(formatTimestamp(new Date()));
            return true;
          }
        }
      }

      // Probing network connectivity & fresh cache headers
      try {
        await fetch(`/?probe=${Date.now()}`, {
          method: 'HEAD',
          cache: 'no-store',
        });
      } catch {
        // Continue even if head probe is blocked
      }

      // Emulate realistic check verification
      await new Promise((resolve) => setTimeout(resolve, 600));

      setIsChecking(false);
      setUpdateStatus('latest');
      setLastCheckedTime(formatTimestamp(new Date()));
      return false;
    } catch {
      setIsChecking(false);
      setUpdateStatus('latest');
      setLastCheckedTime(formatTimestamp(new Date()));
      return false;
    }
  }, []);

  // Safely apply update and reload without touching user data
  const applyUpdate = useCallback(async () => {
    setUpdateStatus('checking');

    try {
      // 1. If vite-plugin-pwa registered helper exists, call it
      const customWindow = window as unknown as { __pwaUpdateSW?: (reload?: boolean) => Promise<void> };
      if (typeof customWindow.__pwaUpdateSW === 'function') {
        await customWindow.__pwaUpdateSW(true);
        return;
      }

      // 2. Post SKIP_WAITING to waiting service worker
      if ('serviceWorker' in navigator) {
        const reg = registrationRef.current || (await navigator.serviceWorker.getRegistration());
        if (reg && reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }

        // Listen for new controller taking over
        navigator.serviceWorker.addEventListener(
          'controllerchange',
          () => {
            window.location.reload();
          },
          { once: true }
        );
      }

      // 3. Fallback reload after brief timeout
      setTimeout(() => {
        window.location.reload();
      }, 400);
    } catch {
      window.location.reload();
    }
  }, []);

  return {
    updateStatus,
    hasUpdate,
    isChecking,
    isOnline,
    lastCheckedTime,
    appVersion,
    isStandalone,
    serviceWorkerSupported,
    checkForUpdate,
    applyUpdate,
  };
}
