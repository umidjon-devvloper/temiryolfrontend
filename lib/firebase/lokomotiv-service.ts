// Lokomotiv submissions servisi — Node.js backend bilan.
// Backend POST /submissions/lokomotiv atomic transaction ichida:
//  - submissions insert
//  - fuel_records insert (Y.PDF uchun)
//  - daily/yearly summaries increment

import type { LokomotivSubmission } from "@/lib/types";
import { api } from "../api/client";
import { onSocketEvent } from "../api/socket";

const PATH = "/submissions";

interface LokomotivWithMeta extends Partial<LokomotivSubmission> {
  _id?: string;
  id?: string;
  [key: string]: unknown;
}

function normalize(s: LokomotivWithMeta): LokomotivSubmission {
  const { _id, id, ...rest } = s;
  return { id: String(id ?? _id ?? ""), ...rest } as LokomotivSubmission;
}

// Yangi yozuv qo'shish
export async function addLokomotivSubmission(
  data: Omit<LokomotivSubmission, "id" | "timestamp" | "createdAt">,
) {
  // Backend `{ ok, id }` qaytaradi; eski/boshqa shakllarga ham chidamli bo'lamiz
  const res = await api.post<{ ok: true; id?: string; submission?: LokomotivWithMeta }>(
    `${PATH}/lokomotiv`,
    data,
  );
  return String(res.id ?? res.submission?._id ?? res.submission?.id ?? "");
}

// Ishchining oxirgi yozuvlarini olish
export async function getRecentSubmissions(stationId: string, limitCount: number = 20) {
  const res = await api.get<{ ok: true; items: LokomotivWithMeta[] }>(PATH, {
    stationId,
    category: "lokomotiv",
    limit: limitCount,
  });
  return res.items.map(normalize);
}

// Real-time
export function subscribeToSubmissions(
  stationId: string,
  callback: (data: LokomotivSubmission[]) => void,
  limitCount: number = 20,
) {
  let cancelled = false;

  const load = () => {
    api
      .get<{ ok: true; items: LokomotivWithMeta[] }>(PATH, {
        stationId,
        category: "lokomotiv",
        limit: limitCount,
      })
      .then((res) => {
        if (cancelled) return;
        callback(res.items.map(normalize));
      })
      .catch((err) => {
        console.warn("subscribeLokomotivSubmissions:", err);
        if (!cancelled) callback([]);
      });
  };

  load();
  const offs = [
    onSocketEvent("submission.created", load),
    onSocketEvent("submission.updated", load),
    onSocketEvent("submission.deleted", load),
  ];

  return () => {
    cancelled = true;
    offs.forEach((off) => off());
  };
}

// Yozuvni tahrirlash
export async function updateSubmission(id: string, updates: Partial<LokomotivSubmission>) {
  await api.patch(`${PATH}/${encodeURIComponent(id)}`, updates);
}
