// Staff vault — Node.js backend bilan ishlaydi.
// Eski signaturalar saqlangan.

import { api } from "../api/client";
import { onSocketEvent } from "../api/socket";
import type { StaffVaultRecord } from "@/lib/types";

const PATH = "/staff";

/** Backend Mongo `_id` ni frontend `id` ga o'tkazadi. */
function normalizeStaff(item: StaffVaultRecord & { _id?: string }): StaffVaultRecord {
  const { _id, id, ...rest } = item as StaffVaultRecord & { _id?: string; id?: string };
  return { ...rest, id: String(id ?? _id ?? "") } as StaffVaultRecord;
}

export function sortStaffByTabel<T extends { tabelNumber: string }>(items: T[]): T[] {
  return [...items].sort((a, b) =>
    a.tabelNumber.localeCompare(b.tabelNumber, undefined, {
      numeric: true,
      sensitivity: "base",
    }),
  );
}

export function subscribeStaff(callback: (staff: StaffVaultRecord[]) => void) {
  let cancelled = false;

  const load = () => {
    api
      .get<{ ok: true; items: StaffVaultRecord[] }>(PATH, { limit: 1000 })
      .then((res) => {
        if (cancelled) return;
        callback(sortStaffByTabel((res.items as StaffVaultRecord[]).map(normalizeStaff)));
      })
      .catch((err) => {
        console.warn("subscribeStaff:", err);
        if (!cancelled) callback([]);
      });
  };

  load();

  const off = onSocketEvent("staff.updated", load);

  return () => {
    cancelled = true;
    off();
  };
}

export async function addStaffDoc(payload: Omit<StaffVaultRecord, "id">): Promise<void> {
  await api.post(PATH, {
    tabelNumber: (payload as { tabelNumber: string }).tabelNumber,
    fullName: (payload as { fullName: string }).fullName,
    erju: (payload as { erju?: string }).erju ?? "",
    zapravka: (payload as { zapravka: string }).zapravka,
    stationId: (payload as { stationId?: string }).stationId,
  });
}

export async function updateStaffDoc(
  id: string,
  patch: Pick<StaffVaultRecord, "fullName" | "tabelNumber" | "zapravka">,
): Promise<void> {
  await api.patch(`${PATH}/${encodeURIComponent(id)}`, patch);
}

export async function deleteStaffDoc(id: string): Promise<void> {
  await api.delete(`${PATH}/${encodeURIComponent(id)}`);
}

/** Faol sessiyadan keyin: joriy kod staff vaultda bo'lsa F.I.Sh */
export async function getStaffFullNameByTabel(tabel: string): Promise<string | null> {
  const t = tabel.trim();
  if (!t) return null;
  try {
    const res = await api.get<{ ok: true; staff: { fullName?: string } | null }>(
      `${PATH}/by-tabel/${encodeURIComponent(t)}`,
    );
    const name = res.staff?.fullName;
    return typeof name === "string" && name.trim() ? name.trim() : null;
  } catch {
    return null;
  }
}
