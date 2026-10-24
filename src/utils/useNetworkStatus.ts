import { useState, useEffect, useCallback, useRef } from 'react';
import { checkSimulateOffline } from './devSimulation';

export interface NetworkStatus {
  isOnline: boolean;
  isChecking: boolean;
  lastChecked: number | null;
  checkConnectivity: () => Promise<boolean>;
}

/**
 * Actively monitors network connectivity by listening to browser events
 * and polling a lightweight server ping endpoint every 12 seconds.
 * Governed by VITE_SIMULATE_OFFLINE, ?offline=true, or window.__SIMULATE_OFFLINE().
 */
export function useNetworkStatus(pollIntervalMs = 12000): NetworkStatus {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (checkSimulateOffline()) return false;
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [lastChecked, setLastChecked] = useState<number | null>(null);
  const isCheckingRef = useRef(false);

  const checkConnectivity = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined') return true;

    // Direct check (env or query param ?offline=true)
    if (checkSimulateOffline()) {
      setIsOnline(false);
      setLastChecked(Date.now());
      return false;
    }

    if (isCheckingRef.current) return isOnline;

    isCheckingRef.current = true;
    setIsChecking(true);

    try {
      if (!navigator.onLine) {
        setIsOnline(false);
        setLastChecked(Date.now());
        return false;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      // 1. Try server ping endpoint
      try {
        const res = await fetch(`/api/ping?_t=${Date.now()}`, {
          method: 'GET',
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          setIsOnline(true);
          setLastChecked(Date.now());
          return true;
        }
      } catch {
        // Fall back to manifest HEAD request
      }

      // 2. Secondary fallback check
      const fallbackController = new AbortController();
      const fallbackTimeoutId = setTimeout(() => fallbackController.abort(), 2500);
      try {
        const fallbackRes = await fetch(`/manifest.webmanifest?_t=${Date.now()}`, {
          method: 'HEAD',
          cache: 'no-store',
          signal: fallbackController.signal,
        });
        clearTimeout(fallbackTimeoutId);

        if (fallbackRes.ok || fallbackRes.status === 304) {
          setIsOnline(true);
          setLastChecked(Date.now());
          return true;
        }
      } catch {
        // Fallback failed
      }

      setIsOnline(false);
      setLastChecked(Date.now());
      return false;
    } catch {
      setIsOnline(false);
      setLastChecked(Date.now());
      return false;
    } finally {
      isCheckingRef.current = false;
      setIsChecking(false);
    }
  }, [isOnline]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (checkSimulateOffline()) {
      setIsOnline(false);
    } else {
      void checkConnectivity();
    }

    const handleBrowserOnline = () => {
      if (!checkSimulateOffline()) {
        void checkConnectivity();
      }
    };

    const handleBrowserOffline = () => {
      setIsOnline(false);
      setLastChecked(Date.now());
    };

    const handleSimChange = (e: Event) => {
      const customEvent = e as CustomEvent<boolean>;
      if (customEvent.detail) {
        setIsOnline(false);
      } else {
        void checkConnectivity();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !checkSimulateOffline()) {
        void checkConnectivity();
      }
    };

    window.addEventListener('online', handleBrowserOnline);
    window.addEventListener('offline', handleBrowserOffline);
    window.addEventListener('scripturepage-sim-offline', handleSimChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleBrowserOnline);

    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible' && !checkSimulateOffline()) {
        void checkConnectivity();
      }
    }, pollIntervalMs);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('online', handleBrowserOnline);
      window.removeEventListener('offline', handleBrowserOffline);
      window.removeEventListener('scripturepage-sim-offline', handleSimChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleBrowserOnline);
    };
  }, [checkConnectivity, pollIntervalMs]);

  return {
    isOnline,
    isChecking,
    lastChecked,
    checkConnectivity,
  };
}
