// Typed client for the Perene API (the Next.js /api/* routes in apps/web).
// Every request carries the Supabase access token as a Bearer header — the
// routes are being standardized to verify this token server-side rather than
// trusting a userId in the body.
import { supabase } from "./supabase";

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

async function authHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(
  path: string,
  init: RequestInit & { json?: unknown } = {}
): Promise<T> {
  const { json, headers, ...rest } = init;
  const res = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(await authHeaders()),
      ...(headers as Record<string, string> | undefined),
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });

  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }

  if (!res.ok) {
    const message =
      (parsed && typeof parsed === "object" && "error" in parsed
        ? String((parsed as { error: unknown }).error)
        : null) ?? `Request failed (${res.status})`;
    throw new ApiError(res.status, message, parsed);
  }

  return parsed as T;
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path, { method: "GET" });
}

export function apiPost<T>(path: string, json?: unknown): Promise<T> {
  return request<T>(path, { method: "POST", json });
}

export function apiDelete<T>(path: string, json?: unknown): Promise<T> {
  return request<T>(path, { method: "DELETE", json });
}
