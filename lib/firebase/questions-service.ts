// Form questions — dynamic questions configured by dasturchi.
// Node.js backend: GET/PATCH /app-settings/questions
//   value: FormQuestion[]
//
// Eski Firestore signaturalari saqlangan.

import type { FormQuestion } from "@/lib/types";
import { api } from "../api/client";
import { onSocketEvent } from "../api/socket";

const SETTINGS_KEY = "questions";

function makeId(): string {
  return `q-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

async function loadAll(): Promise<FormQuestion[]> {
  try {
    const res = await api.get<{ ok: true; value: unknown }>(`/app-settings/${SETTINGS_KEY}`);
    return Array.isArray(res.value) ? (res.value as FormQuestion[]) : [];
  } catch {
    return [];
  }
}

async function saveAll(items: FormQuestion[]): Promise<void> {
  await api.patch(`/app-settings/${SETTINGS_KEY}`, { value: items });
}

export async function createQuestion(
  question: Omit<FormQuestion, "id" | "createdAt" | "updatedAt">,
  _userId: string,
  _userName: string,
): Promise<string> {
  const items = await loadAll();
  const id = makeId();
  const now = Date.now();
  const newItem = { ...question, id, createdAt: now, updatedAt: now } as FormQuestion;
  await saveAll([...items, newItem]);
  return id;
}

export async function updateQuestion(
  id: string,
  updates: Partial<FormQuestion>,
  _userId: string,
  _userName: string,
): Promise<void> {
  const items = await loadAll();
  const next = items.map((q) => (q.id === id ? { ...q, ...updates, id, updatedAt: Date.now() } : q));
  await saveAll(next as FormQuestion[]);
}

export async function deleteQuestion(
  id: string,
  _userId: string,
  _userName: string,
): Promise<void> {
  const items = await loadAll();
  await saveAll(items.filter((q) => q.id !== id));
}

export function subscribeToQuestions(
  category: FormQuestion["category"],
  stationId?: string,
  callback?: (questions: FormQuestion[]) => void,
) {
  let cancelled = false;

  const load = () => {
    loadAll().then((items) => {
      if (cancelled) return;
      let filtered = items.filter((q) => q.category === category);
      if (stationId) filtered = filtered.filter((q) => !q.stationId || q.stationId === stationId);
      filtered.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      callback?.(filtered);
    });
  };

  load();
  const off = onSocketEvent<{ key: string }>("app-settings.updated", (m) => {
    if (m?.key === SETTINGS_KEY) load();
  });

  return () => {
    cancelled = true;
    off();
  };
}

export async function reorderQuestions(
  _category: string,
  newOrder: { id: string; order: number }[],
  _userId: string,
  _userName: string,
) {
  const items = await loadAll();
  const orderMap = new Map(newOrder.map((o) => [o.id, o.order]));
  const next = items.map((q) =>
    orderMap.has(q.id) ? { ...q, order: orderMap.get(q.id)!, updatedAt: Date.now() } : q,
  );
  await saveAll(next);
}
