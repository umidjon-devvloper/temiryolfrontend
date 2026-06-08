// Per-station variantlar (forma optsiyalari) — Node.js backend bilan.
// Har stansiya uchun alohida key: /app-settings/variants:<stationId>
//   value: Record<fieldKey, string[]>

import { api } from "../api/client";
import { onSocketEvent } from "../api/socket";

type VariantsMap = Record<string, string[]>;

function key(stationId: string): string {
  return `variants:${stationId}`;
}

async function loadVariants(stationId: string): Promise<VariantsMap> {
  try {
    const res = await api.get<{ ok: true; value: unknown }>(
      `/app-settings/${encodeURIComponent(key(stationId))}`,
    );
    return (res.value as VariantsMap) ?? {};
  } catch {
    return {};
  }
}

async function saveVariants(stationId: string, value: VariantsMap): Promise<void> {
  await api.patch(`/app-settings/${encodeURIComponent(key(stationId))}`, { value });
}

export function subscribeToVariants(stationId: string, callback: (variants: VariantsMap) => void) {
  let cancelled = false;
  const load = () => loadVariants(stationId).then((v) => !cancelled && callback(v));

  load();
  const off = onSocketEvent<{ key: string }>("app-settings.updated", (m) => {
    if (m?.key === key(stationId)) load();
  });

  return () => {
    cancelled = true;
    off();
  };
}

export async function addVariant(
  stationId: string,
  fieldKey: string,
  value: string,
  _userId: string,
  _userName: string,
) {
  const variants = await loadVariants(stationId);
  const current = variants[fieldKey] ?? [];
  if (current.includes(value)) return;
  await saveVariants(stationId, { ...variants, [fieldKey]: [...current, value] });
}

export async function removeVariant(
  stationId: string,
  fieldKey: string,
  value: string,
  _userId: string,
  _userName: string,
) {
  const variants = await loadVariants(stationId);
  const current = variants[fieldKey] ?? [];
  if (!current.includes(value)) return;
  await saveVariants(stationId, {
    ...variants,
    [fieldKey]: current.filter((v) => v !== value),
  });
}
