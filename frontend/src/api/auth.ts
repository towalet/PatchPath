/**
 * Auth API calls: register, login, me.
 * Endpoints: /auth/register/ /auth/login/ /auth/me/
 */
import type { AuthResponse, User } from "../types/api";
import { apiRequest } from "./client";

export function register(input: {
  email: string;
  name: string;
  password: string;
}): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/auth/register/", {
    method: "POST",
    body: input,
    auth: false,
  });
}

export function login(input: { email: string; password: string }): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/auth/login/", {
    method: "POST",
    body: input,
    auth: false,
  });
}

export function fetchMe(): Promise<User> {
  return apiRequest<User>("/auth/me/", { method: "GET" });
}
