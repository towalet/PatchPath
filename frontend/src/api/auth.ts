/**
 * Auth API calls: register, login, refresh, me.
 * Endpoints: /auth/register/ /auth/login/ /auth/refresh/ /auth/me/
 *
 * Scaffold stub — wire to apiRequest feature-by-feature.
 */
import type { AuthResponse, User } from "../types/api";
// import { apiRequest, tokenStore } from "./client";

export async function register(_input: {
  email: string;
  name: string;
  password: string;
}): Promise<AuthResponse> {
  throw new Error("auth.register not implemented");
}

export async function login(_input: { email: string; password: string }): Promise<AuthResponse> {
  throw new Error("auth.login not implemented");
}

export async function fetchMe(): Promise<User> {
  throw new Error("auth.fetchMe not implemented");
}
