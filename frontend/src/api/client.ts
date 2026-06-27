/**
 * Typed fetch wrapper for the PatchPath API.
 *
 * Responsibilities (filled in feature-by-feature):
 *   - prefix requests with VITE_API_BASE_URL
 *   - attach the JWT access token
 *   - normalize errors into ApiError
 *   - refresh + retry once on 401 (TODO)
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
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, auth = true, headers, ...rest } = options;

  const finalHeaders = new Headers(headers);
  let payload: BodyInit | undefined;

  if (body instanceof FormData) {
    payload = body; // let the browser set the multipart boundary
  } else if (body !== undefined) {
    finalHeaders.set("Content-Type", "application/json");
    payload = JSON.stringify(body);
  }

  if (auth) {
    const token = tokenStore.getAccess();
    if (token) finalHeaders.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    headers: finalHeaders,
    body: payload,
  });

  if (!response.ok) {
    throw await toApiError(response);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

async function toApiError(response: Response): Promise<ApiError> {
  let message = response.statusText;
  let fieldErrors: Record<string, string[]> | undefined;
  try {
    const data = await response.json();
    if (typeof data?.detail === "string") message = data.detail;
    else if (data && typeof data === "object") fieldErrors = data;
  } catch {
    // non-JSON error body; keep statusText
  }
  return { status: response.status, message, fieldErrors };
}

// TODO: implement refresh-and-retry-once on 401 using tokenStore.getRefresh().
