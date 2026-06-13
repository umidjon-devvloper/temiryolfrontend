// Generic submissions servisi — Node.js backend bilan.
// Kategoriya-ga qarab to'g'ri endpoint'ga yuboradi.

import { api } from "../api/client";
import { onSocketEvent } from "../api/socket";
import type { Category, Submission } from "@/lib/types";

const PATH = "/submissions";

interface SubmissionWithMeta {
  id?: string;
  _id?: string;
  [key: string]: unknown;
}

function normalize(s: SubmissionWithMeta): Submission {
  const { _id, id, ...rest } = s;
  return { id: String(id ?? _id ?? ""), ...rest } as Submission;
}

// Yangi yozuv qo'shish
export async function addSubmission(category: Category, data: Record<string, unknown>) {
  // Backend `{ ok, id }` qaytaradi; eski/boshqa shakllarga ham chidamli bo'lamiz
  const res = await api.post<{ ok: true; id?: string; submission?: SubmissionWithMeta }>(
    `${PATH}/${category}`,
    data,
  );
  return String(res.id ?? res.submission?._id ?? res.submission?.id ?? "");
}

// Ishchining oxirgi yozuvlarini olish
export async function getRecentSubmissions(
  stationId: string,
  category: Category,
  limitCount: number = 20,
) {
  const res = await api.get<{ ok: true; items: SubmissionWithMeta[] }>(PATH, {
    stationId,
    category,
    limit: limitCount,
  });
  return res.items.map(normalize);
}

// Real-time subscription — Socket.io eventi orqali
export function subscribeToSubmissions(
  stationId: string,
  category: Category,
  callback: (data: Submission[]) => void,
  limitCount: number = 100,
) {
  let cancelled = false;

  const load = () => {
    api
      .get<{ ok: true; items: SubmissionWithMeta[] }>(PATH, {
        stationId,
        category,
        limit: limitCount,
      })
      .then((res) => {
        if (cancelled) return;
        callback(res.items.map(normalize));
      })
      .catch((err) => {
        console.warn("subscribeToSubmissions:", err);
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

// Yozuvni tahrirlash (faqat shu kun ichida — backend o'zi tekshiradi)
export async function updateSubmission(id: string, updates: Record<string, unknown>) {
  await api.patch(`${PATH}/${encodeURIComponent(id)}`, updates);
}

// Tahrirlash mumkinligini tekshirish (faqat shu kun)
export function canEdit(submission: Submission): boolean {
  const now = new Date();
  const raw = (submission as { timestamp?: unknown; timestampMs?: number }).timestamp ??
    (submission as { timestampMs?: number }).timestampMs;
  if (raw == null) return false;
  const ms =
    typeof raw === "number"
      ? raw
      : raw && typeof (raw as { toMillis?: () => number }).toMillis === "function"
        ? (raw as { toMillis: () => number }).toMillis()
        : raw && typeof (raw as { toDate?: () => Date }).toDate === "function"
          ? (raw as { toDate: () => Date }).toDate().getTime()
          : new Date(raw as string | number).getTime();
  const subDate = new Date(ms);
  return (
    now.getFullYear() === subDate.getFullYear() &&
    now.getMonth() === subDate.getMonth() &&
    now.getDate() === subDate.getDate()
  );
}
