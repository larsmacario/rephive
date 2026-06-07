import { useCallback, useEffect, useState } from "react";

export interface CachedAsyncResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
  isStale: boolean;
  isFromCache: boolean;
}

interface CachedLoaderOptions<T> {
  cacheLoader: () => Promise<T | null>;
  networkLoader: () => Promise<T>;
  enabled?: boolean;
}

export function useCachedAsync<T>(
  { cacheLoader, networkLoader, enabled = true }: CachedLoaderOptions<T>,
  deps: unknown[],
): CachedAsyncResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [isFromCache, setIsFromCache] = useState(false);
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    if (!enabled) {
      setData(null);
      setLoading(false);
      setError(null);
      setIsStale(false);
      setIsFromCache(false);
      return;
    }

    let cancelled = false;

    const run = async () => {
      setError(null);
      let hadCache = false;

      try {
        const cached = await cacheLoader();
        if (cancelled) return;
        if (cached != null) {
          hadCache = true;
          setData(cached);
          setIsFromCache(true);
          setLoading(false);
        } else {
          setLoading(true);
        }
      } catch {
        if (!cancelled) setLoading(true);
      }

      try {
        const fresh = await networkLoader();
        if (cancelled) return;
        setData(fresh);
        setIsFromCache(false);
        setIsStale(false);
        setError(null);
      } catch (e: unknown) {
        if (cancelled) return;
        if (hadCache) {
          setIsStale(true);
        } else {
          setError(e instanceof Error ? e.message : "Unbekannter Fehler");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick, enabled]);

  return { data, loading, error, reload, isStale, isFromCache };
}
