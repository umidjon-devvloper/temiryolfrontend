// Summary helpers — Node.js backend bilan.
// Aggregat hisob-kitoblari endi backend tomonida atomic transaction ichida bo'ladi.
// Client tomondan summary delta yozish kerak emas — record* funksiyalar no-op.
// Lekin sana yordamchi funksiyalari saqlab qolinadi — boshqa joylarda ishlatiladi.

import type { Category, Submission } from "@/lib/types";
import { parsePdfNumber } from "@/lib/utils/pdf-number";

type SubmissionLike = Partial<Submission> & {
  id?: string;
  category?: Category | string;
  stationId?: string | null;
  nodeId?: string | null;
  timestamp?: unknown;
  timestampMs?: number;
  dateISO?: string;
  year?: number;
  qanchaBerildi?: unknown;
  qancha?: unknown;
  qanchaOlindi?: unknown;
  dizMasla?: unknown;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function toLocalDateISO(input: Date): string {
  const y = input.getFullYear();
  const m = String(input.getMonth() + 1).padStart(2, "0");
  const d = String(input.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function timestampToMillis(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isFinite(ms) ? ms : null;
  }

  const ts = value as {
    toMillis?: () => number;
    toDate?: () => Date;
    seconds?: number;
    nanoseconds?: number;
  };

  if (typeof ts.toMillis === "function") {
    const ms = ts.toMillis();
    return Number.isFinite(ms) ? ms : null;
  }
  if (typeof ts.toDate === "function") {
    const ms = ts.toDate().getTime();
    return Number.isFinite(ms) ? ms : null;
  }
  if (typeof ts.seconds === "number") {
    return ts.seconds * 1000 + Math.floor((ts.nanoseconds ?? 0) / 1_000_000);
  }

  return null;
}

export function buildStandardDateFields(input: Date = new Date()) {
  return {
    timestampMs: input.getTime(),
    dateISO: toLocalDateISO(input),
    year: input.getFullYear(),
    month: input.getMonth() + 1,
    day: input.getDate(),
  };
}

export function standardDateFieldsFromSubmission(
  submission: SubmissionLike,
  fallback: Date = new Date(),
) {
  const ms =
    typeof submission.timestampMs === "number"
      ? submission.timestampMs
      : timestampToMillis(submission.timestamp);
  const date = ms == null ? fallback : new Date(ms);
  const fields = buildStandardDateFields(date);
  const dateISO =
    typeof submission.dateISO === "string" && DATE_RE.test(submission.dateISO)
      ? submission.dateISO
      : fields.dateISO;

  return {
    ...fields,
    dateISO,
    year: typeof submission.year === "number" ? submission.year : Number(dateISO.slice(0, 4)),
  };
}

export function fuelKgForSubmission(submission: SubmissionLike): number {
  const raw =
    submission.category === "korxona"
      ? submission.qancha
      : submission.category === "qurulish"
        ? submission.qanchaOlindi
        : submission.qanchaBerildi;
  return parsePdfNumber(raw ?? 0);
}

export function maslaKgForSubmission(submission: SubmissionLike): number {
  return parsePdfNumber(submission.dizMasla ?? 0);
}

export function submissionWithStandardDateFields<T extends Record<string, unknown>>(
  data: T,
  now: Date = new Date(),
): T & ReturnType<typeof buildStandardDateFields> {
  return {
    ...data,
    ...buildStandardDateFields(now),
  };
}

// ─── No-op summary writers ────────────────────────────────────────
// Backend transaction ichida summaries avtomatik yangilanadi.
// Bu funksiyalar mavjud import'larni buzmaslik uchun saqlanadi.

export async function recordSubmissionCreatedForSummaries(_submission: SubmissionLike): Promise<void> {
  // no-op — backend atomic transaction summary'ni o'zi yozadi
}

export async function recordSubmissionDeletedForSummaries(_submission: SubmissionLike): Promise<void> {
  // no-op
}

export async function recordSubmissionUpdatedForSummaries(
  _before: SubmissionLike,
  _after: SubmissionLike,
): Promise<void> {
  // no-op
}
