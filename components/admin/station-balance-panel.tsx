"use client";

// Operator zapravka balans paneli — joriy yoqilg'i zaxirasi, overlimit (qarz),
// va admin uchun "yoqilg'i qabul qilish" formasi. Backend source of truth.

import { useCallback, useEffect, useState } from "react";
import { BatteryCharging, AlertTriangle, Plus, History } from "lucide-react";
import { format } from "date-fns";
import {
  fetchBalance,
  receiveFuel,
  fetchLedger,
  type StationBalance,
  type LedgerEntry,
} from "@/lib/api/operator";
import { onSocketEvent } from "@/lib/api/socket";
import { getSession } from "@/lib/utils/session";
import { parsePdfNumber } from "@/lib/utils/pdf-number";

const LEDGER_TYPE_LABEL: Record<LedgerEntry["type"], string> = {
  receive: "Qabul qilindi",
  consume: "Berildi",
  reverse: "Qaytarildi",
  adjust: "Tuzatildi",
};

export function StationBalancePanel({ stationId }: { stationId: string }) {
  const [balance, setBalance] = useState<StationBalance | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const role = getSession()?.role;
  const isAdmin = role === "admin" || role === "developer";

  const load = useCallback(() => {
    fetchBalance(stationId)
      .then(setBalance)
      .catch((e) => console.warn("balance:", e));
    fetchLedger(stationId, 12)
      .then(setLedger)
      .catch(() => undefined);
  }, [stationId]);

  useEffect(() => {
    load();
    const offs = [
      onSocketEvent("operator.balance.updated", load),
      onSocketEvent("submission.created", load),
      onSocketEvent("submission.updated", load),
      onSocketEvent("submission.deleted", load),
    ];
    return () => offs.forEach((off) => off());
  }, [load]);

  async function onReceive(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const kg = parsePdfNumber(amount);
    if (!kg || kg <= 0) {
      setErr("Miqdor 0 dan katta bo'lishi kerak");
      return;
    }
    setBusy(true);
    try {
      const next = await receiveFuel(stationId, kg, note || undefined);
      setBalance((prev) => ({ ...(prev ?? { stationId }), ...next }));
      setAmount("");
      setNote("");
      load();
    } catch (e) {
      setErr((e as Error).message || "Xatolik");
    } finally {
      setBusy(false);
    }
  }

  const bal = balance?.balanceKg ?? 0;
  const over = balance?.overlimitKg ?? 0;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Balans kartalari */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
        <div className="rounded-[1.35rem] border border-emerald-500/25 bg-gradient-to-br from-emerald-950/60 to-slate-950 p-5 text-white shadow-lg">
          <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-emerald-300/90">
            <BatteryCharging className="h-4 w-4" /> Joriy zaxira balansi
          </p>
          <p className="mt-3 text-5xl font-black tabular-nums leading-none">
            {bal.toLocaleString()} <span className="text-xl text-emerald-300/80">kg</span>
          </p>
          {balance?.lastReceiveAt ? (
            <p className="mt-2 text-[11px] font-semibold text-white/45">
              Oxirgi qabul: {format(new Date(balance.lastReceiveAt), "dd.MM.yyyy HH:mm")}
            </p>
          ) : null}
        </div>

        <div
          className={[
            "rounded-[1.35rem] border p-5 text-white shadow-lg",
            over > 0
              ? "border-rose-500/40 bg-gradient-to-br from-rose-950/70 to-slate-950"
              : "border-white/12 bg-slate-950/60",
          ].join(" ")}
        >
          <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-rose-300/90">
            <AlertTriangle className="h-4 w-4" /> Limitdan oshgan (qarz)
          </p>
          <p
            className={[
              "mt-3 text-5xl font-black tabular-nums leading-none",
              over > 0 ? "text-rose-300" : "text-white/40",
            ].join(" ")}
          >
            {over.toLocaleString()} <span className="text-xl opacity-70">kg</span>
          </p>
          {over > 0 ? (
            <p className="mt-2 text-[11px] font-semibold text-rose-200/70">
              Yoqilg'i qabul qilinganda avval shu qarz yopiladi.
            </p>
          ) : (
            <p className="mt-2 text-[11px] font-semibold text-white/35">Qarz yo'q.</p>
          )}
        </div>
      </div>

      {/* O'ng ustun: qabul qilish formasi + tarix */}
      <div className="space-y-4">
        {isAdmin && (
          <form
            onSubmit={onReceive}
            className="rounded-[1.35rem] border border-white/12 bg-slate-950/60 p-5 text-white shadow-lg"
          >
            <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-sky-300/90">
              <Plus className="h-4 w-4" /> Yoqilg'i qabul qilish
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Miqdor (kg)"
                className="w-full rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-lg font-bold tabular-nums text-white outline-none placeholder:text-white/30 focus:border-sky-400/60"
              />
              <button
                type="submit"
                disabled={busy}
                className="shrink-0 rounded-xl bg-sky-500 px-5 py-3 text-sm font-black uppercase tracking-wide text-white shadow-lg transition hover:bg-sky-400 disabled:opacity-50"
              >
                {busy ? "..." : "Qabul"}
              </button>
            </div>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Izoh (ixtiyoriy)"
              className="mt-2 w-full rounded-xl border border-white/12 bg-black/20 px-4 py-2 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/30"
            />
            {err && <p className="mt-2 text-xs font-bold text-rose-400">{err}</p>}
          </form>
        )}

        <div className="rounded-[1.35rem] border border-white/12 bg-slate-950/60 p-5 text-white shadow-lg">
          <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-white/60">
            <History className="h-4 w-4" /> Oxirgi harakatlar
          </p>
          <div className="mt-3 space-y-1.5">
            {ledger.length === 0 && (
              <p className="py-4 text-center text-xs font-semibold text-white/35">Harakatlar yo'q</p>
            )}
            {ledger.map((l) => (
              <div
                key={l._id}
                className="flex items-center justify-between gap-3 rounded-lg bg-white/5 px-3 py-2 text-sm"
              >
                <span className="flex items-center gap-2">
                  <span
                    className={[
                      "inline-block h-2 w-2 rounded-full",
                      l.type === "receive"
                        ? "bg-sky-400"
                        : l.type === "consume"
                          ? "bg-amber-400"
                          : l.type === "reverse"
                            ? "bg-emerald-400"
                            : "bg-slate-400",
                    ].join(" ")}
                  />
                  <span className="font-bold text-white/80">{LEDGER_TYPE_LABEL[l.type]}</span>
                  <span className="text-[10px] text-white/35">
                    {format(new Date(l.timestamp), "dd.MM HH:mm")}
                  </span>
                </span>
                <span className="font-black tabular-nums">
                  {l.type === "receive" ? "+" : l.type === "consume" ? "−" : ""}
                  {l.amountKg.toLocaleString()} kg
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
