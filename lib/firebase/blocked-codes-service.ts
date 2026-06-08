// Bloklangan kodlar — Node.js backend bilan ishlaydi (Firebase o'rnida).
// Signaturasi saqlangan, ichki implementatsiya REST API + Socket.io.

import { api, ApiClientError } from "../api/client";
import { onSocketEvent } from "../api/socket";

const PATH = "/blocked-codes";

export type BlockedCodeDoc = {
  code: string;
  note?: string;
  blockedAt: number;
  blockedByDisplayName?: string;
};

export async function isCodeBlocked(code: string): Promise<boolean> {
  // Backend bu endpoint'ni faqat admin uchun ochadi.
  // Login paytida public yo'l yo'q — backend login-code o'zi tekshiradi.
  // Shu sababli bu funksiya endi faqat admin paneli uchun ishlatilishi mumkin.
  try {
    const trimmed = code.trim();
    const res = await api.get<{ ok: true; items: BlockedCodeDoc[] }>(PATH);
    return res.items.some((b) => b.code === trimmed);
  } catch (err) {
    if (err instanceof ApiClientError && err.status === 401) return false;
    return false;
  }
}

export async function blockCode(payload: BlockedCodeDoc): Promise<void> {
  await api.post(PATH, {
    code: payload.code.trim(),
    note: payload.note ?? "",
  });
}

export async function unblockCode(code: string): Promise<void> {
  await api.delete(`${PATH}/${encodeURIComponent(code.trim())}`);
}

/**
 * Real-time obuna — backend Socket.io eventi orqali, plus startup'da bir marta yuklash.
 */
export function subscribeBlockedCodes(cb: (rows: BlockedCodeDoc[]) => void): () => void {
  let cancelled = false;

  const load = () => {
    api
      .get<{ ok: true; items: BlockedCodeDoc[] }>(PATH)
      .then((res) => {
        if (cancelled) return;
        cb([...res.items].sort((a, b) => (b.blockedAt || 0) - (a.blockedAt || 0)));
      })
      .catch((err) => {
        console.warn("subscribeBlockedCodes:", err);
        if (!cancelled) cb([]);
      });
  };

  load();

  const off = onSocketEvent("blocked-codes.updated", load);

  return () => {
    cancelled = true;
    off();
  };
}
