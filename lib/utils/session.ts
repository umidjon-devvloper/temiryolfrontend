// Session boshqaruvi — JWT token + sessionStorage.
// Firebase Auth o'rnida Node.js backend bilan ishlaydi.
// Eski signaturalar (saveSession, getSession, clearSession, isSessionValid,
// beginLoginAuth, ensureActiveSession) saqlangan — sahifa kodi o'zgartirilmasin.

import type { Session } from "../types";
import { api, tokenStore, ApiClientError } from "../api/client";
import { disconnectSocket } from "../api/socket";

const SESSION_KEY = "uz_temiryo_session";

/** Login sahifasi: avvalgi sessiyani tozalash (Firebase Anonymous o'rnida no-op). */
export async function beginLoginAuth(): Promise<void> {
  if (typeof window === "undefined") return;
  await clearSession();
}

/**
 * Active session yozish — bizning JWT auth'da bu avtomatik backend tomonida bo'ladi
 * (login bo'lganda Session model'iga yoziladi). Bu funksiya endi heartbeat yuboradi.
 */
export async function ensureActiveSession(session: Session): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    await api.post("/auth/heartbeat");
    return true;
  } catch (err) {
    if (err instanceof ApiClientError && err.status === 401) {
      tokenStore.clear();
      return false;
    }
    console.warn("ensureActiveSession heartbeat:", err);
    return true; // tarmoq xatosi — sessiya hali ham mavjud
  }
}

export async function saveSession(session: Session, token?: string): Promise<void> {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  if (token) tokenStore.set(token);
  // Heartbeat — backend session lastSeen'ni yangilaydi
  void ensureActiveSession(session);
}

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  const data = sessionStorage.getItem(SESSION_KEY);
  if (!data) return null;

  try {
    const session = JSON.parse(data) as Session;
    if (Date.now() > session.expiresAt) {
      void clearSession();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    if (tokenStore.get()) {
      await api.post("/auth/logout").catch(() => {});
    }
  } catch {
    /* ignore */
  }
  sessionStorage.removeItem(SESSION_KEY);
  tokenStore.clear();
  disconnectSocket();
}

export function isSessionValid(): boolean {
  return getSession() !== null;
}
