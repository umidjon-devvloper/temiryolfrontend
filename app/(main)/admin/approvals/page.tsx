"use client";

import { useEffect, useMemo, useState } from "react";
import { ShieldCheck, Trash2, Plus, Train, Factory, Clock, MapPin } from "lucide-react";
import { format } from "date-fns";

import AdminLayout from "@/components/admin/admin-layout";
import { ZAPRAVKALAR } from "@/lib/data/uzellar";
import { ApiClientError } from "@/lib/api/client";
import {
  subscribeActiveApprovals,
  grantApproval,
  revokeApproval,
  type Approval,
  type GrantApprovalInput,
} from "@/lib/firebase/approval-service";

function zapravkaNom(stationId: string): string {
  return ZAPRAVKALAR.find((z) => z.id === stationId)?.name ?? stationId;
}

function nodeIdForStation(stationId: string): string {
  return ZAPRAVKALAR.find((z) => z.id === stationId)?.uzelId ?? "";
}

const EMPTY_FORM = {
  requestType: "lokomotiv" as "lokomotiv" | "korxona",
  stationId: ZAPRAVKALAR[0]?.id ?? "",
  seriya: "",
  lokomotivNumber: "",
  requestKind: "tashqari" as "tashqari" | "oldinroq",
  korxonaNomi: "",
  sutkalikLimit: 1,
};

export default function ApprovalsPage() {
  const [items, setItems] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const unsub = subscribeActiveApprovals((rows) => {
      setItems(rows);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Amal qilish muddatini jonli ko'rsatish uchun har daqiqada yangilanadi
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const activeItems = useMemo(
    () => items.filter((a) => a.isActive && a.validUntil > now),
    [items, now],
  );

  const handleGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const nodeId = nodeIdForStation(form.stationId);
    if (!form.stationId || !nodeId) {
      setError("Zapravka tanlang");
      return;
    }

    const payload: GrantApprovalInput = {
      requestType: form.requestType,
      stationId: form.stationId,
      nodeId,
      sutkalikLimit: form.sutkalikLimit,
    };

    if (form.requestType === "lokomotiv") {
      if (!form.seriya.trim() || !form.lokomotivNumber.trim()) {
        setError("Lokomotiv uchun seriya va raqam majburiy");
        return;
      }
      payload.seriya = form.seriya.trim();
      payload.lokomotivNumber = form.lokomotivNumber.trim();
      payload.requestKind = form.requestKind;
    } else {
      if (!form.korxonaNomi.trim()) {
        setError("Korxona nomi majburiy");
        return;
      }
      payload.korxonaNomi = form.korxonaNomi.trim();
    }

    setSubmitting(true);
    try {
      await grantApproval(payload);
      setForm((f) => ({ ...EMPTY_FORM, stationId: f.stationId, requestType: f.requestType }));
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError("Ruxsatnoma berishda xatolik");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm("Ruxsatnomani bekor qilasizmi?")) return;
    // Optimistik o'chirish — socket eventi ham yangilaydi
    setItems((prev) => prev.filter((a) => a.id !== id));
    try {
      await revokeApproval(id);
    } catch (err) {
      console.warn("revokeApproval:", err);
      // Xatolik bo'lsa qayta yuklash uchun socket/keyingi yuklashga tayanamiz
    }
  };

  return (
    <AdminLayout>
      <div className="w-full max-w-[80rem] space-y-6 pb-10">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
            Admin
          </p>
          <h1 className="flex items-center gap-2.5 text-2xl font-black uppercase tracking-wide text-slate-950 dark:text-white">
            <ShieldCheck className="h-7 w-7 text-emerald-600" />
            Ruxsatnomalar
          </h1>
          <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
            Limitdan oshgan so'rovlar uchun beriladigan vaqtinchalik ruxsatnomalar.
          </p>
        </div>

        {/* Yangi ruxsatnoma berish */}
        <form
          onSubmit={handleGrant}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/60"
        >
          <h2 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-900 dark:text-white">
            <Plus className="h-4 w-4 text-emerald-600" />
            Yangi ruxsatnoma
          </h2>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Turi</span>
              <select
                value={form.requestType}
                onChange={(e) =>
                  setForm((f) => ({ ...f, requestType: e.target.value as "lokomotiv" | "korxona" }))
                }
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-emerald-500 dark:border-white/10 dark:bg-slate-900 dark:text-white"
              >
                <option value="lokomotiv">Lokomotiv</option>
                <option value="korxona">Korxona</option>
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Zapravka</span>
              <select
                value={form.stationId}
                onChange={(e) => setForm((f) => ({ ...f, stationId: e.target.value }))}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-emerald-500 dark:border-white/10 dark:bg-slate-900 dark:text-white"
              >
                {ZAPRAVKALAR.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                Necha sutka
              </span>
              <input
                type="number"
                min={1}
                max={30}
                value={form.sutkalikLimit}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    sutkalikLimit: Math.max(1, Math.min(30, Number(e.target.value) || 1)),
                  }))
                }
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-emerald-500 dark:border-white/10 dark:bg-slate-900 dark:text-white"
              />
            </label>

            {form.requestType === "lokomotiv" ? (
              <>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Seriya</span>
                  <input
                    value={form.seriya}
                    onChange={(e) => setForm((f) => ({ ...f, seriya: e.target.value }))}
                    placeholder="masalan: UZTE16M"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-emerald-500 dark:border-white/10 dark:bg-slate-900 dark:text-white"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Lokomotiv raqami
                  </span>
                  <input
                    value={form.lokomotivNumber}
                    onChange={(e) => setForm((f) => ({ ...f, lokomotivNumber: e.target.value }))}
                    placeholder="masalan: 0123"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-emerald-500 dark:border-white/10 dark:bg-slate-900 dark:text-white"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    So'rov turi
                  </span>
                  <select
                    value={form.requestKind}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        requestKind: e.target.value as "tashqari" | "oldinroq",
                      }))
                    }
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-emerald-500 dark:border-white/10 dark:bg-slate-900 dark:text-white"
                  >
                    <option value="tashqari">Tashqari</option>
                    <option value="oldinroq">Oldinroq</option>
                  </select>
                </label>
              </>
            ) : (
              <label className="flex flex-col gap-1.5 sm:col-span-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Korxona nomi
                </span>
                <input
                  value={form.korxonaNomi}
                  onChange={(e) => setForm((f) => ({ ...f, korxonaNomi: e.target.value }))}
                  placeholder="Korxona nomi"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-emerald-500 dark:border-white/10 dark:bg-slate-900 dark:text-white"
                />
              </label>
            )}
          </div>

          {error && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-600/30 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ShieldCheck className="h-4 w-4" />
            {submitting ? "Berilmoqda..." : "Ruxsatnoma berish"}
          </button>
        </form>

        {/* Faol ruxsatnomalar ro'yxati */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/60">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-wide text-slate-900 dark:text-white">
              Faol ruxsatnomalar
            </h2>
            <span className="rounded-lg bg-emerald-50 px-3 py-1 text-xs font-black tabular-nums text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              {activeItems.length}
            </span>
          </div>

          {loading ? (
            <p className="py-10 text-center text-sm font-bold text-slate-400">Yuklanmoqda...</p>
          ) : activeItems.length === 0 ? (
            <p className="py-10 text-center text-sm font-bold text-slate-400">
              Faol ruxsatnomalar yo'q
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {activeItems.map((a) => (
                <div
                  key={a.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-white/10 dark:bg-white/5"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {a.requestType === "lokomotiv" ? (
                        <Train className="h-4 w-4 shrink-0 text-blue-600" />
                      ) : (
                        <Factory className="h-4 w-4 shrink-0 text-orange-600" />
                      )}
                      <p className="truncate text-sm font-black text-slate-900 dark:text-white">
                        {a.requestType === "lokomotiv"
                          ? `${a.seriya ?? ""} № ${a.lokomotivNumber ?? ""}`
                          : a.korxonaNomi}
                      </p>
                    </div>
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-500">
                      <MapPin className="h-3.5 w-3.5" />
                      {zapravkaNom(a.stationId)}
                      {a.requestKind ? ` · ${a.requestKind}` : ""}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs font-bold text-slate-500">
                      <Clock className="h-3.5 w-3.5" />
                      {a.sutkalikLimit} sutka · {format(new Date(a.validUntil), "dd.MM.yyyy HH:mm")} gacha
                    </p>
                    <p className="mt-1 text-[11px] font-bold text-slate-400">
                      Bergan: {a.approvedByName}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRevoke(a.id)}
                    title="Bekor qilish"
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/30"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
