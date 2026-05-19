import React from 'react';
import { POLL_INTERVAL_MS, POLL_TIMEOUT_MS } from '@/constants/config';

interface PollOptions<T> {
  fetcher: () => Promise<T>;
  interval?: number;
  timeout?: number;
  stopWhen?: (value: T) => boolean;
  enabled?: boolean;
}

export function usePoll<T>({
  fetcher,
  interval = POLL_INTERVAL_MS,
  timeout = POLL_TIMEOUT_MS,
  stopWhen,
  enabled = true,
}: PollOptions<T>): {
  data: T | null;
  isPolling: boolean;
  error: Error | null;
} {
  const [data, setData] = React.useState<T | null>(null);
  const [isPolling, setIsPolling] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep latest fetcher/stopWhen in refs so interval doesn't capture stale closures
  const fetcherRef = React.useRef(fetcher);
  const stopWhenRef = React.useRef(stopWhen);
  React.useLayoutEffect(() => {
    fetcherRef.current = fetcher;
    stopWhenRef.current = stopWhen;
  });

  const stop = React.useCallback(() => {
    if (intervalRef.current != null) clearInterval(intervalRef.current);
    if (timeoutRef.current != null) clearTimeout(timeoutRef.current);
    intervalRef.current = null;
    timeoutRef.current = null;
    setIsPolling(false);
  }, []);

  React.useEffect(() => {
    if (!enabled) {
      stop();
      return;
    }

    setIsPolling(true);
    setError(null);

    const tick = async () => {
      try {
        const value = await fetcherRef.current();
        setData(value);
        if (stopWhenRef.current?.(value)) stop();
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    };

    tick(); // call immediately — no leading delay
    intervalRef.current = setInterval(tick, interval);
    timeoutRef.current = setTimeout(stop, timeout);

    return () => {
      if (intervalRef.current != null) clearInterval(intervalRef.current);
      if (timeoutRef.current != null) clearTimeout(timeoutRef.current);
    };
  }, [enabled, interval, timeout, stop]);

  return { data, isPolling, error };
}
