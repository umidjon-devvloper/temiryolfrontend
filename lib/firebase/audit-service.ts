// Audit log — Node.js backend bilan ishlaydi.
// Audit log yozish odatda backend tomonida avtomatik bo'ladi (har CRUD da).
// Bu funksiya client tomondan log yuborish uchun — backend'da `/audit-logs` POST yo'q,
// shu sababli `logAction` no-op (backend o'zi log qiladi).

import { api } from "../api/client";
import type { AuditLog } from "@/lib/types";

const PATH = "/audit-logs";

export async function logAction(_log: Omit<AuditLog, "id" | "timestamp">): Promise<void> {
  // Backend audit log yozishni avtomatik bajaradi har endpoint da.
  // Client tomondan qo'shimcha yozish kerak emas — no-op qoldiramiz.
}

export async function getRecentLogs(limitCount: number = 100): Promise<AuditLog[]> {
  const res = await api.get<{ ok: true; items: AuditLog[] }>(PATH, { limit: limitCount });
  return res.items;
}

export async function getLogsByUser(userId: string, limitCount: number = 100) {
  const res = await api.get<{ ok: true; items: AuditLog[] }>(PATH, {
    userId,
    limit: limitCount,
  });
  return res.items;
}
