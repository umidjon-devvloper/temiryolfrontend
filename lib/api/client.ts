// REST API klient — Node.js backend bilan ishlash uchun.
// Firestore servisini almashtirgan asosiy infratuzilma.
//
// JWT token sessionStorage da saqlanadi (`tymr.token` kalit).
// Har bir so'rovga avtomatik `Authorization: Bearer <token>` qo'shiladi.

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const TOKEN_KEY = "tymr.token";

export const tokenStore = {
  get(): string | null {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(TOKEN_KEY) || window.sessionStorage.getItem(TOKEN_KEY);
  },
  set(token: string): void {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(TOKEN_KEY, token);
  },
  clear(): void {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(TOKEN_KEY);
    window.sessionStorage.removeItem(TOKEN_KEY);
  },
};

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string | undefined;
  readonly details: unknown;
  constructor(status: number, message: string, code?: string, details?: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface ApiOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  headers?: Record<string, string>;
  /** Token avtomatik qo'shilmasin (login uchun). */
  noAuth?: boolean;
}

async function request<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  const { method = "GET", body, query, headers = {}, noAuth = false } = opts;

  // Query string
  let url = `${API_URL}${path}`;
  if (query) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
    }
    const qs = sp.toString();
    if (qs) url += `?${qs}`;
  }

  const requestHeaders: Record<string, string> = { ...headers };
  if (body !== undefined && !(body instanceof FormData)) {
    requestHeaders["Content-Type"] = "application/json";
  }

  if (!noAuth) {
    const token = tokenStore.get();
    if (token) requestHeaders.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
    });
  } catch (e) {
    throw new ApiClientError(0, "Tarmoq xatosi — backend ulanmadi");
  }

  // 204 — content yo'q
  if (res.status === 204) return undefined as T;

  const contentType = res.headers.get("Content-Type") || "";
  const isJson = contentType.includes("application/json");

  let parsed: unknown = null;
  if (isJson) {
    try {
      parsed = await res.json();
    } catch {
      parsed = null;
    }
  }

  if (!res.ok) {
    const obj = (parsed ?? {}) as { error?: string; message?: string; code?: string; details?: unknown };
    if (res.status === 401) tokenStore.clear();
    throw new ApiClientError(res.status, obj.error || obj.message || `HTTP ${res.status}`, obj.code, obj.details);
  }

  return parsed as T;
}

export const api = {
  get: <T = unknown>(path: string, query?: ApiOptions["query"], headers?: Record<string, string>) =>
    request<T>(path, { method: "GET", query, headers }),
  post: <T = unknown>(path: string, body?: unknown, opts?: Partial<ApiOptions>) =>
    request<T>(path, { ...opts, method: "POST", body }),
  patch: <T = unknown>(path: string, body?: unknown, opts?: Partial<ApiOptions>) =>
    request<T>(path, { ...opts, method: "PATCH", body }),
  put: <T = unknown>(path: string, body?: unknown, opts?: Partial<ApiOptions>) =>
    request<T>(path, { ...opts, method: "PUT", body }),
  delete: <T = unknown>(path: string, opts?: Partial<ApiOptions>) =>
    request<T>(path, { ...opts, method: "DELETE" }),
};

export { API_URL };
