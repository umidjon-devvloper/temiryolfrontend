// `undefined` qiymatlarni JSON payload uchun olib tashlash.
// Eski Firestore signaturasi saqlangan — boshqa joylarda import bo'lgan.
// REST API uchun ham foydali: bo'sh undefined field'lar yuborilmasligi kerak.

export function sanitizeForFirestore<T>(value: T): T {
  if (value === undefined) return null as unknown as T;
  if (value === null) return value;

  if (Array.isArray(value)) {
    return value
      .filter((v) => v !== undefined)
      .map((v) => sanitizeForFirestore(v)) as unknown as T;
  }

  // Maxsus belgili obyektlar (Firestore sentinel) — Firestore yo'q, lekin
  // baribir _methodName bilan obyektlarga tegmaslik.
  if (typeof value === "object" && typeof (value as { _methodName?: unknown })._methodName === "string") {
    return value;
  }

  // Date-like obyektlar (Timestamp)
  if (
    typeof value === "object" &&
    (typeof (value as { toDate?: () => Date }).toDate === "function" ||
      typeof (value as { toMillis?: () => number }).toMillis === "function")
  ) {
    return value;
  }

  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === undefined) continue;
      out[k] = sanitizeForFirestore(v);
    }
    return out as unknown as T;
  }

  return value;
}
