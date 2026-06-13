// Submission mutatsiyalari — Node.js backend bilan.
// Backend PATCH va DELETE endpoint'lari summary'ni avtomatik yangilaydi.

import type { Submission } from "@/lib/types";
import { api } from "../api/client";

const PATH = "/submissions";

type SubmissionPatch = Record<string, unknown>;

export async function updateSubmissionWithSummary(
  submission: Submission,
  changes: SubmissionPatch,
): Promise<Submission> {
  // Backend yangilashni va summary'ni o'zi qiladi; javobda faqat `{ id, ok }`
  // qaytadi (to'liq hujjat emas), shuning uchun yangilangan obyektni mahalliy
  // birlashtiramiz. Agar backend `submission` qaytarsa — o'shani ishlatamiz.
  const res = await api.patch<{ ok: true; submission?: Submission }>(
    `${PATH}/${encodeURIComponent(submission.id)}`,
    changes,
  );
  return res?.submission ?? ({ ...submission, ...changes } as Submission);
}

export async function updateSubmissionByIdWithSummary(
  id: string,
  changes: SubmissionPatch,
): Promise<Submission | null> {
  try {
    const res = await api.patch<{ ok: true; submission?: Submission }>(
      `${PATH}/${encodeURIComponent(id)}`,
      changes,
    );
    return res?.submission ?? ({ ...changes, id } as unknown as Submission);
  } catch {
    return null;
  }
}

export async function deleteSubmissionWithSummary(submission: Submission): Promise<void> {
  await api.delete(`${PATH}/${encodeURIComponent(submission.id)}`);
}

export async function deleteSubmissionByIdWithSummary(id: string): Promise<void> {
  try {
    await api.delete(`${PATH}/${encodeURIComponent(id)}`);
  } catch {
    /* ignore */
  }
}
