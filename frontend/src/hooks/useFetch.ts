import { useCallback, useEffect, useState } from "react";

import type { ApiError } from "../types/api";

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
  refetch: () => void;
}

/**
 * Run an async fetcher with loading/error state and a manual refetch. Re-runs
 * when `deps` change. Ignores results that resolve after unmount.
 */
export function useFetch<T>(fetcher: () => Promise<T>, deps: unknown[] = []): FetchState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [nonce, setNonce] = useState(0);

  const refetch = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetcher()
      .then((d) => {
        if (!active) return;
        setData(d);
        setLoading(false);
      })
      .catch((e) => {
        if (!active) return;
        setError(e as ApiError);
        setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  return { data, loading, error, refetch };
}
