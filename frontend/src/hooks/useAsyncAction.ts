import { useCallback, useState } from "react";

import type { ApiError } from "../types/api";

interface AsyncState {
  loading: boolean;
  error: ApiError | null;
}

/**
 * Wrap an async action with loading + error state for forms and buttons.
 * Keeps route components free of repetitive try/catch/loading boilerplate.
 */
export function useAsyncAction<TArgs extends unknown[], TResult>(
  action: (...args: TArgs) => Promise<TResult>,
) {
  const [state, setState] = useState<AsyncState>({ loading: false, error: null });

  const run = useCallback(
    async (...args: TArgs): Promise<TResult | undefined> => {
      setState({ loading: true, error: null });
      try {
        const result = await action(...args);
        setState({ loading: false, error: null });
        return result;
      } catch (err) {
        setState({ loading: false, error: err as ApiError });
        return undefined;
      }
    },
    [action],
  );

  return { ...state, run };
}
