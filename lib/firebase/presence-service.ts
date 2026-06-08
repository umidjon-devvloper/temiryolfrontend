// Presence (onlayn ishchilar) — Node.js backend bilan.
// Backend `/presence` admin uchun ochiq.

import { startOfDay } from "date-fns";
import type { Role } from "@/lib/types";
import { api } from "../api/client";
import { onSocketEvent } from "../api/socket";

/** Necha ms ichida heartbeat bo'lmasa "oflayn" deb hisoblanadi */
export const ONLINE_PRESENCE_MS = 120_000;

export type PresenceSessionDoc = {
  uid: string;
  code: string;
  role: Role;
  stationId: string | null;
  nodeId: string | null;
  createdAt?: number;
  lastSeen?: number;
  displayName?: string;
  staffVaultFullName?: string | null;
};

interface BackendPresenceItem {
  sessionId: string;
  code: string;
  role: Role;
  stationId: string | null;
  nodeId: string | null;
  displayName?: string;
  staffVaultFullName?: string | null;
  lastSeen?: number;
}

function adapt(item: BackendPresenceItem): PresenceSessionDoc {
  return {
    uid: item.sessionId,
    code: item.code,
    role: item.role,
    stationId: item.stationId,
    nodeId: item.nodeId,
    lastSeen: item.lastSeen,
    displayName: item.displayName,
    staffVaultFullName: item.staffVaultFullName,
  };
}

export function subscribePresenceSessions(
  callback: (rows: PresenceSessionDoc[]) => void,
  onError?: (message: string) => void,
): () => void {
  let cancelled = false;

  const load = () => {
    api
      .get<{ ok: true; items: BackendPresenceItem[] }>("/presence")
      .then((res) => {
        if (cancelled) return;
        const rows = res.items.map(adapt).sort((a, b) => (b.lastSeen ?? 0) - (a.lastSeen ?? 0));
        callback(rows);
      })
      .catch((err) => {
        console.warn("subscribePresenceSessions:", err);
        onError?.(err?.message || "Sessiyalarni o'qib bo'lmadi");
        if (!cancelled) callback([]);
      });
  };

  load();
  // Har 30s da yangilash + Socket.io presence eventi (mavjud bo'lsa)
  const interval = setInterval(load, 30_000);
  const off = onSocketEvent("presence.updated", load);

  return () => {
    cancelled = true;
    clearInterval(interval);
    off();
  };
}

export function isPresenceOnline(lastSeen?: number, now = Date.now()): boolean {
  if (lastSeen == null) return false;
  return now - lastSeen < ONLINE_PRESENCE_MS;
}

export function isPresenceTableVisible(
  lastSeen?: number,
  now = Date.now(),
  createdAt?: number,
): boolean {
  const signal = Math.max(lastSeen ?? 0, createdAt ?? 0);
  if (signal === 0) return false;
  if (lastSeen != null && now - lastSeen < ONLINE_PRESENCE_MS) return true;
  const dayStart = startOfDay(new Date(now)).getTime();
  return signal >= dayStart;
}
