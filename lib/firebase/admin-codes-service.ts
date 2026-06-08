// Admin kodlari — Node.js backend bilan ishlaydi.
// Backendda /users endpoint admin kodlarni boshqaradi.

import { api } from "../api/client";
import { onSocketEvent } from "../api/socket";
import type { AccessCode } from "@/lib/types";

const PATH = "/users";

export type AdminCodeRecord = AccessCode & { id: string };

interface UserRecord extends AccessCode {
  _id?: string;
  id?: string;
}

function normalize(u: UserRecord): AdminCodeRecord {
  return {
    id: String(u._id ?? u.id ?? u.code ?? ""),
    code: u.code,
    role: u.role,
    nodeId: (u as { nodeId?: string | null }).nodeId ?? null,
    stationId: (u as { stationId?: string | null }).stationId ?? null,
    displayName: (u as { displayName?: string }).displayName ?? "",
    isActive: (u as { isActive?: boolean }).isActive ?? true,
    createdAt: (u as { createdAt?: number }).createdAt ?? Date.now(),
    codeType: (u as { codeType?: "admin" | "developer" }).codeType ?? "admin",
  } as AdminCodeRecord;
}

export function subscribeAdminCodes(callback: (codes: AdminCodeRecord[]) => void) {
  let cancelled = false;

  const load = () => {
    api
      .get<{ ok: true; items: UserRecord[] }>(PATH, { role: "admin" })
      .then((res) => {
        if (cancelled) return;
        const rows = res.items
          .map(normalize)
          .sort((a, b) => String(a.code).localeCompare(String(b.code)));
        callback(rows);
      })
      .catch((err) => {
        console.warn("subscribeAdminCodes:", err);
        if (!cancelled) callback([]);
      });
  };

  load();
  const off = onSocketEvent("users.updated", load);

  return () => {
    cancelled = true;
    off();
  };
}

export async function upsertAdminCode(params: {
  code: string;
  displayName: string;
  actorCode: string;
  actorName: string;
}) {
  const code = params.code.trim();
  // Avval mavjudligini tekshiramiz
  let existing: UserRecord | null = null;
  try {
    const res = await api.get<{ ok: true; user: UserRecord | null }>(
      `${PATH}/${encodeURIComponent(code)}`,
    );
    existing = res.user ?? null;
  } catch {
    existing = null;
  }

  if (existing) {
    await api.patch(`${PATH}/${encodeURIComponent(code)}`, {
      displayName: params.displayName.trim(),
      role: "admin",
      isActive: true,
    });
  } else {
    await api.post(PATH, {
      code,
      role: "admin",
      displayName: params.displayName.trim(),
      stationId: null,
      nodeId: null,
      isActive: true,
    });
  }
}
