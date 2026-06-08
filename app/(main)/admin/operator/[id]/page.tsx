import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import AdminLayout from "@/components/admin/admin-layout";
import { StationGauge } from "@/components/admin/station-gauge";
import { ERJU_LABEL, getOperatorCardById, getOperatorCards } from "../operator-data";

type OperatorStationPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateStaticParams() {
  return getOperatorCards().map((card) => ({
    id: card.id,
  }));
}

export default async function OperatorStationPage({ params }: OperatorStationPageProps) {
  const { id } = await params;
  const card = getOperatorCardById(id);

  if (!card) {
    notFound();
  }

  const erjuName = ERJU_LABEL[card.uzelId] ?? card.uzelId;

  return (
    <AdminLayout>
      <div className="w-full max-w-[96rem] space-y-5 pb-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
              Operator
            </p>
            <h1 className="mt-1 break-words text-3xl font-black uppercase tracking-wide text-slate-950 dark:text-white">
              {card.name}
            </h1>
            <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">{erjuName}</p>
          </div>

          <Link
            href="/admin/operator"
            className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-slate-950/20 transition hover:brightness-110 dark:bg-white dark:text-slate-950"
          >
            <ArrowLeft className="h-4 w-4" />
            Orqaga
          </Link>
        </div>

        <section className="overflow-hidden rounded-[1.75rem] border border-white/40 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-5 text-white shadow-2xl shadow-slate-950/18 dark:border-white/10">
          <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
            <div className="flex min-h-[18rem] flex-col justify-between rounded-[1.35rem] border border-white/12 bg-white/8 p-5 shadow-inner shadow-white/5 backdrop-blur">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.26em] text-emerald-200/90">
                  Zapravka sahifasi
                </p>
                <h2 className="mt-3 text-4xl font-black uppercase leading-tight tracking-normal text-white">
                  {card.name}
                </h2>
                <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-200">
                  Kunlik nazorat oynasi.
                </p>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/12 bg-black/24 px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/55">ERJU</p>
                  <p className="mt-1 text-lg font-black text-white">{erjuName}</p>
                </div>
                <div className="rounded-2xl border border-white/12 bg-black/24 px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/55">Slug</p>
                  <p className="mt-1 text-lg font-black text-white">{card.slug}</p>
                </div>
              </div>
            </div>

            <StationGauge stationId={card.id} slug={card.slug} />
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
