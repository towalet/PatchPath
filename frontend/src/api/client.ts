/**
 * Typed fetch wrapper for the PatchPath API.
 *
 *   - prefixes requests with VITE_API_BASE_URL
 *   - attaches the JWT access token
 *   - normalizes errors into ApiError
 *   - refreshes + retries once on 401 (single-flight)
 */
import type { ApiError } from "../types/api";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api";

const ACCESS_TOKEN_KEY = "patchpath.access";
const REFRESH_TOKEN_KEY = "patchpath.refresh";

export const tokenStore = {
  getAccess: () => localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  set: (access: string, refresh: string) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, access);
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  },
  clear: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

export interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  auth?: boolean;
  /**
   * Non-2xx statuses to treat as success and parse normally (instead of
   * throwing). Used by the upload endpoint, which returns its per-file errors
   * with a 400 when an entire batch fails validation.
   */
  acceptStatuses?: number[];
}

// Single-flight refresh: concurrent 401s share one refresh round-trip.
let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refresh = tokenStore.getRefresh();
  if (!refresh) return null;

  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch(`${BASE_URL}/auth/refresh/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh }),
        });
        if (!res.ok) return null;
        const data = (await res.json()) as { access: string; refresh?: string };
        tokenStore.set(data.access, data.refresh ?? refresh);
        return data.access;
      } catch {
        return null;
      }
    })().finally(() => {
      // Release the lock on the next tick so awaiters all read the result first.
      queueMicrotask(() => {
        refreshInFlight = null;
      });
    });
  }
  return refreshInFlight;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, auth = true, acceptStatuses, headers, ...rest } = options;

  let payload: BodyInit | undefined;
  const isForm = body instanceof FormData;
  if (isForm) {
    payload = body as FormData; // let the browser set the multipart boundary
  } else if (body !== undefined) {
    payload = JSON.stringify(body);
  }

  const buildHeaders = (token: string | null): Headers => {
    const h = new Headers(headers);
    if (!isForm && body !== undefined) h.set("Content-Type", "application/json");
    if (auth && token) h.set("Authorization", `Bearer ${token}`);
    return h;
  };

  const send = (token: string | null) =>
    fetch(`${BASE_URL}${path}`, { ...rest, headers: buildHeaders(token), body: payload });

  let response = await send(auth ? tokenStore.getAccess() : null);

  // Refresh-and-retry-once on an expired/invalid access token.
  if (response.status === 401 && auth && tokenStore.getRefresh()) {
    const fresh = await refreshAccessToken();
    if (fresh) {
      response = await send(fresh);
    } else {
      tokenStore.clear();
    }
  }

  if (!response.ok && !acceptStatuses?.includes(response.status)) {
    throw await toApiError(response);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

async function toApiError(response: Response): Promise<ApiError> {
  let message = response.statusText || `Request failed (${response.status})`;
  let fieldErrors: Record<string, string[]> | undefined;
  try {
    const data = await response.json();
    if (typeof data?.detail === "string") {
      message = data.detail;
    } else if (typeof data?.failure_reason === "string" && data.failure_reason.trim()) {
      message = data.failure_reason;
    } else if (typeof data?.message === "string" && data.message.trim()) {
      message = data.message;
    } else if (typeof data?.error === "string" && data.error.trim()) {
      message = data.error;
    } else if (
      Array.isArray(data?.non_field_errors) &&
      typeof data.non_field_errors[0] === "string"
    ) {
      message = data.non_field_errors[0];
    } else if (data && typeof data === "object") {
      fieldErrors = data;
      // Surface the first field error as the headline message.
      const first = Object.entries(data).find(([key]) => key !== "session_id" && key !== "id")?.[1];
      if (Array.isArray(first) && typeof first[0] === "string") message = first[0];
      else if (typeof first === "string") message = first;
    }
  } catch {
    // non-JSON error body; keep statusText
  }
  return { status: response.status, message, fieldErrors };
}

/** Unwrap DRF's PageNumberPagination envelope to a plain array. */
export function unwrap<T>(page: { results: T[] }): T[] {
  return page.results;
}
