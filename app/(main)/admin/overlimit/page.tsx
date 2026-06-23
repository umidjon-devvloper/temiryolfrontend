"use client";

import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/admin-layout";
import { onSocketEvent } from "@/lib/api/socket";
import { fetchOverlimits, type StationBalance } from "@/lib/api/operator";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function AdminOverlimitPage() {
  const [rows, setRows] = useState<StationBalance[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const items = await fetchOverlimits();
        if (!cancelled) setRows(items.sort((a, b) => b.overlimitKg - a.overlimitKg));
      } catch (err) {
        console.warn("overlimit load:", err);
      }
    };

    load();
    const offs = [
      onSocketEvent("operator.balance.updated", load),
      onSocketEvent("submission.created", load),
      onSocketEvent("submission.updated", load),
      onSocketEvent("submission.deleted", load),
    ];

    return () => {
      cancelled = true;
      offs.forEach((off) => off());
    };
  }, []);

  const total = rows.reduce((a, r) => a + r.overlimitKg, 0);

  return (
    <AdminLayout>
      <div className="space-y-8 max-w-6xl">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-primary tracking-tighter uppercase flex items-center gap-3">
              <AlertTriangle className="w-9 h-9 text-danger" /> Limitdan oshganlar
            </h1>
            <p className="text-muted-foreground font-bold text-sm mt-2">
              Zaxiradan oshib ketgan (qarz) zapravkalar. Yoqilg‘i qabul qilinganda avtomatik yopiladi.
            </p>
          </div>
          <Link
            href="/admin/operator/"
            className="text-xs font-black uppercase text-primary hover:underline"
          >
            Operator bo‘limi →
          </Link>
        </div>

        {total > 0 && (
          <div className="rounded-2xl border-2 border-danger/30 bg-danger/5 px-6 py-4">
            <span className="text-xs font-black uppercase tracking-widest text-danger">
              Jami qarz
            </span>
            <p className="text-3xl font-black tabular-nums text-danger">
              {total.toLocaleString()} kg
            </p>
          </div>
        )}

        <div className="bg-background rounded-[28px] border-2 border-danger/20 overflow-x-auto shadow-sm">
          <table className="w-full text-left min-w-[480px]">
            <thead className="bg-danger/10 text-[10px] font-black uppercase tracking-widest text-danger">
              <tr>
                <th className="px-5 py-3">Zapravka</th>
                <th className="px-5 py-3 text-right">Joriy balans</th>
                <th className="px-5 py-3 text-right">Limitdan oshgan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/5 text-sm">
              {rows.map((s) => (
                <tr key={s.stationId} className="hover:bg-muted/40">
                  <td className="px-5 py-3">
                    <Link
                      href={`/admin/operator/${s.stationId}/`}
                      className="font-bold hover:underline"
                    >
                      {s.stationName ?? s.stationId}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-right font-bold tabular-nums">
                    {s.balanceKg.toLocaleString()} kg
                  </td>
                  <td className="px-5 py-3 text-right font-black text-danger tabular-nums">
                    {s.overlimitKg.toLocaleString()} kg
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-5 py-16 text-center text-muted-foreground font-bold">
                    Limitdan oshgan zapravka yo‘q
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
