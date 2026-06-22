import { useCallback, useEffect, useState } from "react";

/**
 * siteId/fetchKey değişince veri çeker; effect içinde senkron setState yok.
 */
export function useSiteData<T>(
  fetchKey: string | number | null | undefined,
  fetcher: () => Promise<T>,
  initial: T,
) {
  const [data, setData] = useState<T>(initial);
  const [loadedKey, setLoadedKey] = useState<string | number | null>(null);
  const [error, setError] = useState(false);

  const key = fetchKey ?? null;
  const loading = Boolean(key) && loadedKey !== key;

  const reload = useCallback(async () => {
    if (!key) {
      setData(initial);
      setLoadedKey(null);
      return;
    }
    try {
      const result = await fetcher();
      setData(result);
      setError(false);
      setLoadedKey(key);
    } catch {
      setError(true);
      setLoadedKey(key);
    }
  }, [key, fetcher, initial]);

  useEffect(() => {
    if (!key || loadedKey === key) return;
    let cancelled = false;
    void (async () => {
      try {
        const result = await fetcher();
        if (!cancelled) {
          setData(result);
          setError(false);
          setLoadedKey(key);
        }
      } catch {
        if (!cancelled) {
          setError(true);
          setLoadedKey(key);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [key, loadedKey, fetcher]);

  const invalidate = useCallback(() => {
    setLoadedKey(null);
  }, []);

  return { data, loading, error, reload, invalidate, setData };
}
