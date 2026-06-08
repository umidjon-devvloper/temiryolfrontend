"use client";

// Operator detail sahifasidagi katta gauge — bugungi limit foizini jonli ko'rsatadi.

import { useEffect, useState } from "react";
import { BatteryMedium, MapPin } from "lucide-react";
import { onSocketEvent } from "@/lib/api/socket";
import { fetchStationFillMap } from "@/lib/utils/station-fill";

export function StationGauge({ stationId, slug }: { stationId: string; slug: string }) {
  const [fill, setFill] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = () => {
      fetchStationFillMap()
        .then((m) => {
          if (!cancelled) setFill(m[stationId] ?? 0);
        })
        .catch((err) => console.warn("StationGauge:", err));
    };

    load();
    const offs = [
      onSocketEvent("submission.created", load),
      onSocketEvent("submission.updated", load),
      onSocketEvent("submission.deleted", load),
    ];

    return () => {
      cancelled = true;
      offs.forEach((off) => off());
    };
  }, [stationId]);

  const deg = fill * 3.6;

  return (
    <div className="grid place-items-center rounded-[1.35rem] border border-white/12 bg-black/30 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
      <div className="relative grid aspect-square w-full max-w-[17rem] place-items-center rounded-[2rem] border border-white/15 bg-[#121827] shadow-[0_24px_55px_rgba(0,0,0,0.35)]">
        <div
          className="absolute inset-7 rounded-full"
          style={{
            background: `conic-gradient(from -42deg, #facc15 0deg ${deg}deg, rgba(255,255,255,0.18) ${deg}deg 360deg)`,
            boxShadow: "0 0 34px rgba(250,204,21,0.32)",
          }}
        />
        <div className="absolute inset-[4.9rem] rounded-full bg-[#121827] shadow-[inset_0_0_28px_rgba(15,23,42,0.94)]" />
        <div className="relative z-10 flex flex-col items-center">
          <BatteryMedium className="h-10 w-10 text-white" strokeWidth={2.8} />
          <span className="mt-3 text-6xl font-black leading-none tracking-normal text-white tabular-nums">
            {fill}%
          </span>
          <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-white/80">
            <MapPin className="h-3.5 w-3.5" />
            {slug}
          </span>
        </div>
      </div>
    </div>
  );
}
