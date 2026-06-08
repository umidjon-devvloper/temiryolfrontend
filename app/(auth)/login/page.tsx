"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { CodeInput } from "@/components/auth/code-input";
import { LoginHeroPanel } from "@/components/auth/login-hero-panel";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { beginLoginAuth, saveSession } from "@/lib/utils/session";
import { api, ApiClientError } from "@/lib/api/client";
import { Session } from "@/lib/types";
import { KeyRound, ShieldCheck } from "lucide-react";

interface LoginResponse {
  ok: true;
  token: string;
  session: {
    code: string;
    role: "worker" | "admin" | "developer";
    stationId: string | null;
    nodeId: string | null;
    displayName: string;
    staffVaultFullName: string | null;
    expiresAt: number;
  };
}

function deviceId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = localStorage.getItem("tymr.deviceId");
  if (!id) {
    id =
      "dev-" +
      Math.random().toString(36).slice(2, 10) +
      "-" +
      Date.now().toString(36);
    localStorage.setItem("tymr.deviceId", id);
  }
  return id;
}

export default function LoginPage() {
  const router = useRouter();
  const [code, setCode] = useState(["", "", "", ""]);
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const verifyingRef = useRef(false);

  useEffect(() => {
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith("lock_"))
      .forEach((k) => sessionStorage.removeItem(k));
  }, []);

  const handleVerify = useCallback(async () => {
    const fullCode = code.join("");
    if (fullCode.length < 4 || verifyingRef.current) return;

    verifyingRef.current = true;
    setVerifying(true);
    setError("");
    try {
      await beginLoginAuth();

      const res = await api.post<LoginResponse>(
        "/auth/login-code",
        { code: fullCode, deviceId: deviceId() },
        { noAuth: true },
      );

      const session: Session = {
        sessionToken: res.token,
        code: res.session.code,
        role: res.session.role,
        nodeId: res.session.nodeId,
        stationId: res.session.stationId,
        displayName: res.session.displayName,
        expiresAt: res.session.expiresAt ?? Date.now() + 12 * 60 * 60 * 1000,
      };

      await saveSession(session, res.token);

      if (session.role === "worker" && session.stationId) {
        router.push(`/zapravka/${session.stationId}/lokomotiv`);
      } else if (session.role === "admin" || session.role === "developer") {
        router.push("/admin");
      } else {
        router.push("/login");
      }
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.status === 423 || err.code === "BLOCKED") {
          setError("Bu kirish kodi bloklangan. Administratorga murojaat qiling.");
        } else if (err.status === 429) {
          setError("Juda ko'p urinish. 15 daqiqadan keyin qayta urinib ko'ring.");
        } else if (err.status === 401 || err.status === 404) {
          setError("Kod xato terildi. Qaytadan urinib ko'ring");
        } else if (err.status === 0) {
          setError("Internet aloqasi yo'q. Tekshirib qayta urining.");
        } else {
          setError(err.message || "Tekshiruvda xato.");
        }
      } else {
        setError("Tekshiruvda xato. Internet aloqasini tekshiring.");
      }
      setCode(["", "", "", ""]);
    } finally {
      verifyingRef.current = false;
      setVerifying(false);
    }
  }, [code, router]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") handleVerify();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleVerify]);

  const canSubmit = !code.some((c) => !c) && !verifying;

  return (
    <div className="flex min-h-screen w-full bg-[#030005]">
      <LoginHeroPanel className="bg-[#030005]" />

      <div className="relative flex min-h-screen flex-1 flex-col overflow-hidden bg-[linear-gradient(140deg,#030005_0%,#13001e_32%,#4b0870_58%,#c7133a_86%,#ffdc5d_118%)] lg:w-1/2">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.075)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.065)_1px,transparent_1px),linear-gradient(155deg,rgba(255,220,93,0.22)_0%,transparent_28%,transparent_58%,rgba(255,34,92,0.22)_100%),linear-gradient(25deg,rgba(142,70,255,0.26)_0%,transparent_42%)] bg-[size:48px_48px,48px_48px,auto,auto]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-[linear-gradient(180deg,transparent_0%,rgba(3,0,5,0.72)_100%)]" />

        <header className="relative z-10 flex items-center justify-end px-5 pt-5 sm:px-8">
          <ThemeToggle />
        </header>

        <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 pb-8 pt-6 sm:px-10">
          <div className="w-full max-w-[420px]">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(135deg,#ff3b58,#8b35ff)] text-sm font-black text-white shadow-lg shadow-fuchsia-950/35">
                  UZ
                </div>
                <div className="min-w-0">
                  <h1 className="truncate text-xl font-black leading-tight tracking-tight text-white drop-shadow-sm">
                    UZ Temiryo&apos;l
                  </h1>
                  <p className="text-sm font-semibold text-[#f5d98b]">
                    Yoqilg&apos;i ta&apos;minot
                  </p>
                </div>
              </div>
              <span className="hidden items-center gap-1.5 rounded-full border border-[#ffd85d]/35 bg-[#ffd85d]/15 px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-[#ffe79a] shadow-sm shadow-black/20 sm:inline-flex">
                <ShieldCheck className="h-3.5 w-3.5" />
                Xavfsiz
              </span>
            </div>

            <section className="rounded-3xl border border-white/25 bg-white/[0.94] p-5 shadow-2xl shadow-black/45 backdrop-blur-xl sm:p-7">
              <div className="mb-7">
                <div className="mb-4 grid h-11 w-11 place-items-center rounded-2xl bg-[#eee7ff] text-[#6246ff]">
                  <KeyRound className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-black tracking-tight text-[#111827] sm:text-3xl">
                  Tizimga kirish
                </h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-[#667085]">
                  Maxsus 4 xonali kodni kiriting va ish paneliga o&apos;ting.
                </p>
              </div>

              <div className="space-y-5">
                <CodeInput code={code} onChange={setCode} error={!!error} />

                {error ? (
                  <p
                    className="rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3 text-center text-sm font-bold leading-snug text-danger"
                    role="alert"
                  >
                    {error}
                  </p>
                ) : null}

                <button
                  type="button"
                  onClick={handleVerify}
                  disabled={!canSubmit}
                  className="flex min-h-14 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-400 via-green-500 to-emerald-600 px-5 py-4 text-base font-black text-white shadow-xl shadow-emerald-700/25 transition-all duration-200 hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 disabled:shadow-none disabled:active:scale-100"
                >
                  {verifying ? "Tekshirilmoqda..." : "Tasdiqlash"}
                </button>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
