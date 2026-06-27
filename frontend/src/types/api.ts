/**
 * Shared API primitives (auth + envelope types).
 * Domain shapes live in ./diagnostics.ts.
 */

export interface User {
  id: string;
  email: string;
  name: string;
  date_joined: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface AuthResponse extends AuthTokens {
  user: User;
}

/** DRF PageNumberPagination envelope. */
export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/** Normalized client-side error shape. */
export interface ApiError {
  status: number;
  message: string;
  fieldErrors?: Record<string, string[]>;
}
