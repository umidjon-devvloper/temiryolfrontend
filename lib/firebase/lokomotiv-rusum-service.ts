// Lokomotiv rusumlari va static override sozlamalari — Node.js backend bilan.
// Backend: GET/PATCH /app-settings/lokomotivRusumlar
//   value: { items: CustomLokomotivRusum[], hiddenStaticValues: string[] }
//
// Eski Firestore signaturalari saqlangan — sahifa va komponent kodi o'zgarmaydi.

import type { HarakatTuri } from "@/lib/types";
import { HARAKAT_TURI_LIST, RUSUMI_LIST } from "@/lib/data/lokomotiv-config";
import { api } from "../api/client";
import { onSocketEvent } from "../api/socket";

const SETTINGS_KEY = "lokomotivRusumlar";

export interface CustomLokomotivRusum {
  id: string;
  value: string;
  label: string;
  code?: string;
  harakatTurlari: HarakatTuri[];
  createdAt: number;
  createdBy?: string;
  updatedAt?: number;
  baseValue?: string;
}

export interface LokomotivRusumSettings {
  items: CustomLokomotivRusum[];
  hiddenStaticValues: string[];
}

function normalizeRusum(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}
function normalizeKey(value: string): string {
  return normalizeRusum(value).toLowerCase();
}
function normalizeRusumCode(value: unknown): string {
  return String(value ?? "").trim().replace(/\s+/g, "");
}
function makeRusumId(value: string, createdAt = Date.now()): string {
  return `${normalizeKey(value).replace(/[^a-z0-9]+/g, "-")}-${createdAt}`;
}
function makeStaticOverrideId(value: string): string {
  return `static-${normalizeKey(value).replace(/[^a-z0-9]+/g, "-")}`;
}

const ACTIVE_HARAKAT_TURLARI = new Set<string>(HARAKAT_TURI_LIST.map((item) => item.value));
const STATIC_CODE_BY_VALUE = new Map(
  RUSUMI_LIST.map((item) => [normalizeKey(String(item.value)), String(item.number)]),
);

function normalizeHarakatTurlari(values: unknown[]): HarakatTuri[] {
  if (!Array.isArray(values)) return [];
  return [...new Set(values)].filter(
    (v): v is HarakatTuri => typeof v === "string" && ACTIVE_HARAKAT_TURLARI.has(v),
  );
}

function readItems(raw: unknown): CustomLokomotivRusum[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item: Record<string, unknown>) => {
      const value = typeof item?.value === "string" ? normalizeRusum(item.value as string) : "";
      const label = typeof item?.label === "string" ? normalizeRusum(item.label as string) : "";
      const createdAt = Number((item?.createdAt as number) ?? Date.now());
      return {
        id:
          typeof item?.id === "string" && (item.id as string).trim()
            ? (item.id as string).trim()
            : makeRusumId(value || label, createdAt),
        value,
        label,
        code: normalizeRusumCode(item?.code) || undefined,
        harakatTurlari: normalizeHarakatTurlari((item?.harakatTurlari as unknown[]) ?? []),
        createdAt,
        createdBy: typeof item?.createdBy === "string" ? (item.createdBy as string) : undefined,
        updatedAt: item?.updatedAt == null ? undefined : Number(item.updatedAt),
        baseValue:
          typeof item?.baseValue === "string" ? normalizeRusum(item.baseValue as string) : undefined,
      };
    })
    .filter((item) => item.value && item.label && item.harakatTurlari.length > 0);
}

function readHiddenStaticValues(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return [
    ...new Set(
      raw
        .filter((item): item is string => typeof item === "string")
        .map(normalizeRusum)
        .filter(Boolean),
    ),
  ];
}

function readSettings(data: { items?: unknown; hiddenStaticValues?: unknown } | null): LokomotivRusumSettings {
  return {
    items: readItems(data?.items),
    hiddenStaticValues: readHiddenStaticValues(data?.hiddenStaticValues),
  };
}

async function getSettings(): Promise<LokomotivRusumSettings> {
  try {
    const res = await api.get<{ ok: true; value: { items?: unknown; hiddenStaticValues?: unknown } | null }>(
      `/app-settings/${SETTINGS_KEY}`,
    );
    return readSettings(res.value);
  } catch {
    return { items: [], hiddenStaticValues: [] };
  }
}

async function saveSettings(next: LokomotivRusumSettings): Promise<void> {
  await api.patch(`/app-settings/${SETTINGS_KEY}`, { value: next });
}

function addHiddenStaticValue(values: string[], value: string): string[] {
  const normalized = normalizeRusum(value);
  if (!normalized) return values;
  const keys = new Set(values.map(normalizeKey));
  return keys.has(normalizeKey(normalized)) ? values : [...values, normalized];
}

function assertValidCode(code: string): void {
  if (!code) throw new Error("Rusum raqamini kiriting.");
  if (!/^\d+$/.test(code)) throw new Error("Rusum raqami faqat raqamlardan iborat bo'lishi kerak.");
}

function assertUniqueCode(
  code: string,
  items: CustomLokomotivRusum[],
  options: { exceptId?: string; allowStaticValue?: string } = {},
): void {
  const normalized = normalizeRusumCode(code);
  if (!normalized) return;

  const allowStaticKey = options.allowStaticValue ? normalizeKey(options.allowStaticValue) : "";
  const staticDuplicate = [...STATIC_CODE_BY_VALUE.entries()].find(
    ([valueKey, staticCode]) => staticCode === normalized && valueKey !== allowStaticKey,
  );
  if (staticDuplicate) throw new Error("Bu rusum raqami asosiy rusumlarda bor.");

  const duplicate = items.find((item) => item.id !== options.exceptId && item.code === normalized);
  if (duplicate) throw new Error("Bu rusum raqami allaqachon mavjud.");
}

// ─── Public API (Firestore signaturalari saqlangan) ──────────────

export function subscribeLokomotivRusumSettings(
  callback: (settings: LokomotivRusumSettings) => void,
) {
  let cancelled = false;
  const load = () => {
    getSettings().then((s) => {
      if (!cancelled) callback(s);
    });
  };

  load();
  const off = onSocketEvent<{ key: string }>("app-settings.updated", (msg) => {
    if (msg?.key === SETTINGS_KEY) load();
  });

  return () => {
    cancelled = true;
    off();
  };
}

export function subscribeLokomotivRusumlar(callback: (items: CustomLokomotivRusum[]) => void) {
  return subscribeLokomotivRusumSettings((settings) => callback(settings.items));
}

export async function addLokomotivRusum(payload: {
  label: string;
  code: string;
  harakatTurlari: HarakatTuri[];
  createdBy?: string;
}): Promise<void> {
  const label = normalizeRusum(payload.label);
  const code = normalizeRusumCode(payload.code);
  const harakatTurlari = normalizeHarakatTurlari(payload.harakatTurlari);
  if (!label || harakatTurlari.length === 0) return;
  assertValidCode(code);

  const settings = await getSettings();
  const current = settings.items;
  const key = normalizeKey(label);
  const existingIndex = current.findIndex((item) => normalizeKey(item.value) === key);
  assertUniqueCode(code, current, {
    exceptId: existingIndex >= 0 ? current[existingIndex]?.id : undefined,
  });

  let next: CustomLokomotivRusum[];
  if (existingIndex >= 0) {
    next = current.map((item, index) =>
      index === existingIndex
        ? {
            ...item,
            label,
            value: label,
            code,
            harakatTurlari: normalizeHarakatTurlari([...item.harakatTurlari, ...harakatTurlari]),
          }
        : item,
    );
  } else {
    next = [
      ...current,
      {
        id: makeRusumId(label),
        value: label,
        label,
        code,
        harakatTurlari,
        createdAt: Date.now(),
        createdBy: payload.createdBy,
      },
    ];
  }

  await saveSettings({ ...settings, items: next });
}

export async function updateLokomotivRusum(
  id: string,
  payload: { label: string; code: string; harakatTurlari: HarakatTuri[] },
): Promise<void> {
  const label = normalizeRusum(payload.label);
  const code = normalizeRusumCode(payload.code);
  const harakatTurlari = normalizeHarakatTurlari(payload.harakatTurlari);
  if (!id || !label || harakatTurlari.length === 0) return;
  assertValidCode(code);

  const settings = await getSettings();
  const current = settings.items;
  const key = normalizeKey(label);
  const duplicate = current.find((item) => item.id !== id && normalizeKey(item.value) === key);
  if (duplicate) throw new Error("Bu rusum allaqachon mavjud.");
  assertUniqueCode(code, current, { exceptId: id });

  let found = false;
  const next = current.map((item) => {
    if (item.id !== id) return item;
    found = true;
    return {
      ...item,
      value: label,
      label,
      code,
      harakatTurlari,
      updatedAt: Date.now(),
    };
  });

  if (!found) throw new Error("Rusum topilmadi.");
  await saveSettings({ ...settings, items: next });
}

export async function deleteLokomotivRusum(id: string): Promise<void> {
  if (!id) return;
  const settings = await getSettings();
  await saveSettings({ ...settings, items: settings.items.filter((item) => item.id !== id) });
}

export async function updateStaticLokomotivRusum(payload: {
  originalValue: string;
  label: string;
  code: string;
  harakatTurlari: HarakatTuri[];
  createdBy?: string;
}): Promise<void> {
  const originalValue = normalizeRusum(payload.originalValue);
  const label = normalizeRusum(payload.label);
  const code = normalizeRusumCode(payload.code);
  const harakatTurlari = normalizeHarakatTurlari(payload.harakatTurlari);
  if (!originalValue || !label || harakatTurlari.length === 0) return;
  assertValidCode(code);

  const settings = await getSettings();
  const id = makeStaticOverrideId(originalValue);
  const key = normalizeKey(label);
  const duplicate = settings.items.find((item) => item.id !== id && normalizeKey(item.value) === key);
  if (duplicate) throw new Error("Bu rusum allaqachon mavjud.");
  assertUniqueCode(code, settings.items, { exceptId: id, allowStaticValue: originalValue });

  const existing = settings.items.find((item) => item.id === id);
  const nextItems = existing
    ? settings.items.map((item) =>
        item.id === id
          ? {
              ...item,
              value: label,
              label,
              code,
              harakatTurlari,
              baseValue: originalValue,
              updatedAt: Date.now(),
            }
          : item,
      )
    : [
        ...settings.items,
        {
          id,
          value: label,
          label,
          code,
          harakatTurlari,
          createdAt: Date.now(),
          createdBy: payload.createdBy,
          baseValue: originalValue,
        },
      ];

  await saveSettings({
    items: nextItems,
    hiddenStaticValues: addHiddenStaticValue(settings.hiddenStaticValues, originalValue),
  });
}

export async function deleteStaticLokomotivRusum(value: string): Promise<void> {
  const originalValue = normalizeRusum(value);
  if (!originalValue) return;
  const settings = await getSettings();
  await saveSettings({
    items: settings.items,
    hiddenStaticValues: addHiddenStaticValue(settings.hiddenStaticValues, originalValue),
  });
}
