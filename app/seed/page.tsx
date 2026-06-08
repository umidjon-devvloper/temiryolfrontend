"use client";

import { Header } from "@/components/layout/header";

/**
 * Seed sahifasi — Node.js backend bilan endi kerak emas.
 * Backend `npm run seed` CLI komandasi orqali ishga tushiriladi.
 * Bu sahifa ma'lumot uchun saqlangan.
 */
export default function SeedPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header />
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-4 text-2xl font-bold">Ma&apos;lumotlarni yuklash</h1>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900/50 dark:bg-amber-950/30">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-300">
            Ushbu sahifa Node.js backend bilan ishlamaydi.
          </p>
          <p className="mt-2 text-sm text-amber-800 dark:text-amber-400">
            Seed ma&apos;lumotlarni backend tomonida quyidagi komanda bilan kiriting:
          </p>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-amber-900/10 p-3 text-xs font-mono text-amber-900 dark:bg-amber-100/10 dark:text-amber-200">
{`cd backend
npm run seed
# yoki productionda:
npm run seed:prod`}
          </pre>
          <p className="mt-3 text-xs text-amber-800 dark:text-amber-400">
            Seed quyidagilarni yozadi: 6 ta РЖУ, 21 ta zapravka, ~120 worker kod,
            admin kod (9999), developer kod (9998).
          </p>
        </div>
      </div>
    </div>
  );
}
