// Ruxsatnomalar (approvals) servisi — Node.js backend bilan.
// Limit oshganda admin tomonidan beriladigan ruxsatnomalar.
//   GET    /approvals/active   — faol ruxsatnomalar
//   POST   /approvals          — ruxsatnoma berish (admin/developer)
//   DELETE /approvals/:id      — bekor qilish (admin/developer)
// Real-time: socket eventlari `approval.granted`, `approval.rejected`.

import { api } from "../api/client";
import { onSocketEvent } from "../api/socket";

export interface Approval {
  id: string;
  messageId: string | null;
  requestType: "lokomotiv" | "korxona";
  seriya: string | null;
  lokomotivNumber: string | null;
  requestKind: "tashqari" | "oldinroq" | null;
  korxonaNomi: string | null;
  stationId: string;
  nodeId: string;
  approvedBy: string;
  approvedByName: string;
  approvedAt: number;
  sutkalikLimit: number;
  validUntil: number;
  isActive: boolean;
}

export interface GrantApprovalInput {
  requestType: "lokomotiv" | "korxona";
  seriya?: string;
  lokomotivNumber?: string;
  requestKind?: "tashqari" | "oldinroq";
  korxonaNomi?: string;
  stationId: string;
  nodeId: string;
  sutkalikLimit: number;
  messageId?: string;
}

interface ApprovalWithMeta extends Partial<Approval> {
  _id?: string;
  id?: string;
  [key: string]: unknown;
}

function normalize(a: ApprovalWithMeta): Approval {
  const { _id, id, ...rest } = a;
  return { id: String(id ?? _id ?? ""), ...rest } as Approval;
}

/** Faol ruxsatnomalarni olish (admin — barchasi, worker — o'z zapravkasi). */
export async function getActiveApprovals(stationId?: string): Promise<Approval[]> {
  const res = await api.get<{ ok: true; items: ApprovalWithMeta[] }>("/approvals/active", {
    stationId,
  });
  return res.items.map(normalize);
}

/**
 * Faol ruxsatnomalarga real-time obuna — GET + socket eventlari.
 * @returns unsubscribe funksiyasi.
 */
export function subscribeActiveApprovals(
  callback: (items: Approval[]) => void,
  stationId?: string,
): () => void {
  let cancelled = false;

  const load = () => {
    getActiveApprovals(stationId)
      .then((items) => {
        if (!cancelled) callback(items);
      })
      .catch((err) => {
        console.warn("subscribeActiveApprovals:", err);
        if (!cancelled) callback([]);
      });
  };

  load();
  const offs = [
    onSocketEvent("approval.granted", load),
    onSocketEvent("approval.rejected", load),
  ];

  return () => {
    cancelled = true;
    offs.forEach((off) => off());
  };
}

/** Ruxsatnoma berish (admin/developer). */
export async function grantApproval(input: GrantApprovalInput): Promise<Approval> {
  const res = await api.post<{ ok: true; approval: ApprovalWithMeta }>("/approvals", input);
  return normalize(res.approval);
}

/** Ruxsatnomani bekor qilish (admin/developer). */
export async function revokeApproval(id: string): Promise<void> {
  await api.delete(`/approvals/${encodeURIComponent(id)}`);
}
