import { useEffect, useState } from 'react';

// Reachability check interval: 60 seconds. navigator.onLine alone reports
// the network interface state, not whether the server is reachable, so a
// periodic lightweight check is added. The interval is 60 seconds to avoid
// frequent requests.
const REACHABILITY_CHECK_INTERVAL_MS = 60_000;
const REACHABILITY_CHECK_TIMEOUT_MS = 5_000;
// Small same-origin resource that is not precached by the service worker
// (workbox globPatterns do not include .txt), so the request reaches the
// network and fails while offline instead of being served from cache.
const REACHABILITY_CHECK_URL = './robots.txt';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    let cancelled = false;

    const checkReachability = async () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        if (!cancelled) setIsOnline(false);
        return;
      }
      // Skip the check while the tab is hidden to avoid unnecessary requests.
      if (typeof document !== 'undefined' && document.hidden) return;
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), REACHABILITY_CHECK_TIMEOUT_MS);
      try {
        const response = await fetch(REACHABILITY_CHECK_URL, {
          method: 'GET',
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!cancelled) setIsOnline(response.ok);
      } catch {
        if (!cancelled) setIsOnline(false);
      } finally {
        window.clearTimeout(timeoutId);
      }
    };

    const handleOnline = () => {
      void checkReachability();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    void checkReachability();
    const intervalId = window.setInterval(() => {
      void checkReachability();
    }, REACHABILITY_CHECK_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
