// Universal CRUD servisi — Node.js backend bilan ishlaydi.
// Eski Firestore signaturalari saqlangan. Generic kollektsiya — backend'da
// /app-settings/<collectionName> kalit orqali key/value store sifatida ishlatiladi
// (chunki har bir generic kolleksiya uchun alohida endpoint yo'q).
//
// MUHIM: Bu servis asosan eski Firestore-style "har qanday hujjat" yozish uchun.
// Yangi kod aniq endpoint'lardan foydalanishi kerak (submissions, staff, va h.k.).

import { api } from "../api/client";

export type AnyData = Record<string, unknown>;
export type WithId<T extends AnyData = AnyData> = T & { id: string };

/**
 * Generic kolleksiya holatini app_settings dan o'qiydi (key = collectionName).
 * Value — { items: WithId<T>[] } shaklida saqlanadi.
 */
async function loadCollection<T extends AnyData = AnyData>(
  collectionName: string,
): Promise<WithId<T>[]> {
  try {
    const res = await api.get<{ ok: true; value: unknown }>(
      `/app-settings/${encodeURIComponent(collectionName)}`,
    );
    const value = res.value as { items?: WithId<T>[] } | null;
    return Array.isArray(value?.items) ? (value!.items as WithId<T>[]) : [];
  } catch {
    return [];
  }
}

async function saveCollection<T extends AnyData = AnyData>(
  collectionName: string,
  items: WithId<T>[],
): Promise<void> {
  await api.patch(`/app-settings/${encodeURIComponent(collectionName)}`, {
    value: { items },
  });
}

function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Yangi hujjat yaratadi (auto-generated ID).
 * @returns yaratilgan hujjat id'si.
 */
export async function createItem<T extends AnyData>(
  collectionName: string,
  data: T,
): Promise<string> {
  if (!collectionName) throw new Error("createItem: collectionName bo'sh bo'lishi mumkin emas");
  if (!data || typeof data !== "object") {
    throw new Error("createItem: data obyekt bo'lishi shart");
  }

  const id = makeId();
  const items = await loadCollection<T>(collectionName);
  const now = Date.now();
  items.push({ ...data, id, createdAt: now, updatedAt: now } as WithId<T>);
  await saveCollection<T>(collectionName, items);
  return id;
}

/** Kolleksiyadagi barcha hujjatlarni qaytaradi. */
export async function getItems<T extends AnyData = AnyData>(
  collectionName: string,
): Promise<WithId<T>[]> {
  if (!collectionName) throw new Error("getItems: collectionName bo'sh bo'lishi mumkin emas");
  return loadCollection<T>(collectionName);
}

/** Bitta hujjatni id orqali oladi. */
export async function getItemById<T extends AnyData = AnyData>(
  collectionName: string,
  id: string,
): Promise<WithId<T> | null> {
  if (!collectionName || !id) return null;
  const items = await loadCollection<T>(collectionName);
  return items.find((x) => x.id === id) ?? null;
}

/** Hujjatni qisman yangilash. */
export async function updateItem<T extends AnyData>(
  collectionName: string,
  id: string,
  data: Partial<T>,
): Promise<void> {
  if (!collectionName) throw new Error("updateItem: collectionName bo'sh bo'lishi mumkin emas");
  if (!id) throw new Error("updateItem: id majburiy");

  const items = await loadCollection<T>(collectionName);
  const idx = items.findIndex((x) => x.id === id);
  if (idx === -1) return;

  const merged = { ...items[idx], ...data, id, updatedAt: Date.now() } as WithId<T>;
  // payload-dan id ni qayta saqlash — id field yo'qolmasin
  items[idx] = merged;
  await saveCollection<T>(collectionName, items);
}

/** Hujjatni o'chiradi. */
export async function deleteItem(collectionName: string, id: string): Promise<void> {
  if (!collectionName) throw new Error("deleteItem: collectionName bo'sh bo'lishi mumkin emas");
  if (!id) throw new Error("deleteItem: id majburiy");
  const items = await loadCollection(collectionName);
  await saveCollection(collectionName, items.filter((x) => x.id !== id));
}

/**
 * Konkret bitta kolleksiya uchun "bog'langan" servis yaratadi.
 */
export function createCollectionService<T extends AnyData = AnyData>(collectionName: string) {
  return {
    create: (data: T) => createItem<T>(collectionName, data),
    list: () => getItems<T>(collectionName),
    get: (id: string) => getItemById<T>(collectionName, id),
    update: (id: string, data: Partial<T>) => updateItem<T>(collectionName, id, data),
    remove: (id: string) => deleteItem(collectionName, id),
  };
}
