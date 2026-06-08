"use client";

import { useEffect, useRef } from "react";
import { api, tokenStore } from "@/lib/api/client";

const INTERVAL_MS = 30_000;

/**
 * Ishchi/admin asosiy zonada bo'lganda backend `/auth/heartbeat` chaqiradi
 * — dashboardda "onlayn" ko'rinish uchun.
 */
export default function PresenceHeartbeat() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    async function ping() {
      if (!tokenStore.get()) return;
      try {
        await api.post("/auth/heartbeat");
      } catch (err) {
        console.warn("presence heartbeat:", err);
      }
    }

    void ping();
    intervalRef.current = setInterval(() => void ping(), INTERVAL_MS);

    function onVisibility() {
      if (document.visibilityState === "visible") void ping();
    }
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onVisibility);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onVisibility);
    };
  }, []);

  return null;
}
