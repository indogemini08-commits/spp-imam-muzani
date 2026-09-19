import { useEffect, useRef, useCallback } from 'react';

/**
 * useRealtimeSync
 * Automatically refetches and synchronizes data when:
 * 1. The window gains focus (user switched back from another app/tab)
 * 2. Document visibility changes to 'visible'
 * 3. An interval timer fires (default every 20 seconds while page is active)
 */
export function useRealtimeSync(
  syncCallback: () => Promise<void> | void,
  intervalMs = 20000,
  enabled = true
) {
  const savedCallback = useRef(syncCallback);

  useEffect(() => {
    savedCallback.current = syncCallback;
  }, [syncCallback]);

  // Execute sync
  const triggerSync = useCallback(async () => {
    try {
      await savedCallback.current();
    } catch (e) {
      console.warn('[useRealtimeSync] Error syncing:', e);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // Window focus listener
    const handleFocus = () => {
      triggerSync();
    };

    // Tab visibility listener
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        triggerSync();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Periodic interval while tab is active
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        triggerSync();
      }
    }, intervalMs);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(intervalId);
    };
  }, [intervalMs, enabled, triggerSync]);

  return { triggerSync };
}
