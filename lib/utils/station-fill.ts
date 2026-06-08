// Operator gauge uchun "to'lganlik foizi" hisoblagich.
// Foiz = shu zapravkaning bugungi umumiy yoqilg'isi / kunlik limit × 100 (0–100 oralig'i).
// Ma'lumot backenddan: /summaries/daily (bugungi kun) + /limits/settings (defaultLimit).

import { api } from "@/lib/api/client";
import { format } from "date-fns";
import { ZAPRAVKALAR } from "@/lib/data/uzellar";

/** Barcha zapravkalar uchun yig'ma operator kartasi id'si. */
export const SUMMARY_STATION_ID = "all-zapravkalar";

function clampPercent(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * stationId → bugungi limit foizi (0–100) xaritasini qaytaradi.
 * "all-zapravkalar" kaliti — barcha zapravkalar bo'yicha o'rtacha.
 */
export async function fetchStationFillMap(): Promise<Record<string, number>> {
  const todayISO = format(new Date(), "yyyy-MM-dd");

  const [sumRes, limRes] = await Promise.all([
    api.get<{
      ok: true;
      items: Array<{ stationId: string; totalFuelKg: number; harakatTuri: string | null }>;
    }>("/summaries/daily", { dateISO: todayISO }),
    api.get<{ ok: true; settings: { defaultLimit?: number } }>("/limits/settings"),
  ]);

  const limit = limRes.settings?.defaultLimit || 1000;

  // harakatTuri === null — kategoriya bo'yicha umumiy qator (ikki marta sanamaslik uchun)
  const totalByStation: Record<string, number> = {};
  for (const it of sumRes.items) {
    if (it.harakatTuri !== null) continue;
    totalByStation[it.stationId] = (totalByStation[it.stationId] ?? 0) + (it.totalFuelKg || 0);
  }

  const map: Record<string, number> = {};
  let grandTotal = 0;
  for (const z of ZAPRAVKALAR) {
    const total = totalByStation[z.id] ?? 0;
    grandTotal += total;
    map[z.id] = clampPercent((total / limit) * 100);
  }

  const count = ZAPRAVKALAR.length || 1;
  map[SUMMARY_STATION_ID] = clampPercent((grandTotal / (limit * count)) * 100);

  return map;
}
