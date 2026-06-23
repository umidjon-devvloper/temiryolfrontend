// Operator zapravka balansi — backend REST klient.
// Endpointlar: backend/src/modules/operator/operator.routes.ts

import { api } from "./client";

export interface StationBalance {
  stationId: string;
  stationName?: string;
  nodeId?: string;
  balanceKg: number;
  overlimitKg: number;
  totalReceivedKg?: number;
  totalConsumedKg?: number;
  lastReceiveAt?: number | null;
}

export interface LedgerEntry {
  _id: string;
  stationId: string;
  type: "receive" | "consume" | "reverse" | "adjust";
  amountKg: number;
  category?: string | null;
  balanceAfter: number;
  overlimitAfter: number;
  byName?: string;
  note?: string;
  timestamp: number;
}

/** Barcha zapravkalar balansi (worker: faqat o'ziniki). */
export async function fetchBalances(): Promise<StationBalance[]> {
  const res = await api.get<{ ok: true; items: StationBalance[] }>("/operator/balances");
  return res.items;
}

/** Bitta zapravka balansi. */
export async function fetchBalance(stationId: string): Promise<StationBalance> {
  const res = await api.get<{ ok: true; balance: StationBalance }>(
    `/operator/balances/${encodeURIComponent(stationId)}`,
  );
  return res.balance;
}

/** Operator yoqilg'i qabul qiladi (admin/operator). */
export async function receiveFuel(
  stationId: string,
  amountKg: number,
  note?: string,
): Promise<StationBalance> {
  const res = await api.post<{ ok: true } & StationBalance>(
    `/operator/balances/${encodeURIComponent(stationId)}/receive`,
    { amountKg, note },
  );
  return res;
}

/** Qo'lda tuzatish (admin). */
export async function adjustBalance(
  stationId: string,
  body: { balanceKg?: number; overlimitKg?: number; note?: string },
): Promise<StationBalance> {
  const res = await api.post<{ ok: true } & StationBalance>(
    `/operator/balances/${encodeURIComponent(stationId)}/adjust`,
    body,
  );
  return res;
}

/** Overlimit (qarz) bo'lgan zapravkalar. */
export async function fetchOverlimits(): Promise<StationBalance[]> {
  const res = await api.get<{ ok: true; items: StationBalance[] }>("/operator/overlimits");
  return res.items;
}

/** Balans tarixi (ledger). */
export async function fetchLedger(stationId?: string, limit = 100): Promise<LedgerEntry[]> {
  const res = await api.get<{ ok: true; items: LedgerEntry[] }>("/operator/ledger", {
    stationId,
    limit,
  });
  return res.items;
}
