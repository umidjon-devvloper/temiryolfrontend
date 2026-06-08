// Reports — Node.js backend bilan ishlaydi.
// Submissions'ni davr bo'yicha o'qib, RJU/zapravka bo'yicha aggregat hisoblaydi.
// Aslida backend'da /reports/svod va /reports/operativ bor, lekin bu service
// boshqa shaklda ishlatiladi (manual fields va h.k.) — shu sababli submissions'ni
// to'g'ridan-to'g'ri o'qib client tomonida hisoblaymiz (oldingi logikani saqlaymiz).

import type { ReportFilter, ReportData, ZapravkaSummary, NodeSummary } from "@/lib/types";
import { UZELLAR, ZAPRAVKALAR } from "@/lib/data/uzellar";
import { parsePdfNumber } from "@/lib/utils/pdf-number";
import { api } from "../api/client";

interface SubmissionRaw {
  id: string;
  category: string;
  stationId: string;
  harakatTuri?: string;
  qanchaBerildi?: unknown;
  qancha?: unknown;
  qanchaOlindi?: unknown;
  dizMasla?: unknown;
  timestamp?: number;
  timestampMs?: number;
  dateISO?: string;
  [key: string]: unknown;
}

function startISO(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export async function generateReport(filter: ReportFilter): Promise<ReportData> {
  const { period, groupType, nodeId, stationId } = filter;

  const startDate = startISO(period.startDate);
  const endDate = startISO(period.endDate);

  // Backend dan submissions'ni davr ichida olib kelamiz
  // /submissions endpoint daterange filter qabul qiladi
  const queryParams: Record<string, string | number | undefined> = {
    startDate,
    endDate,
    limit: 10000,
  };
  if (groupType === "station" && stationId) queryParams.stationId = stationId;
  if (groupType === "node" && nodeId) queryParams.nodeId = nodeId;

  let submissions: SubmissionRaw[] = [];
  try {
    const res = await api.get<{ ok: true; items: SubmissionRaw[] }>("/submissions", queryParams);
    submissions = res.items;
  } catch (err) {
    console.warn("generateReport: submissions yuklanmadi", err);
    submissions = [];
  }

  // Filter qilish (server allaqachon filter qilgan bo'lsa ham, qo'shimcha himoya)
  if (groupType === "station" && stationId) {
    submissions = submissions.filter((s) => s.stationId === stationId);
  } else if (groupType === "node" && nodeId) {
    const stationsInNode = ZAPRAVKALAR.filter((z) => z.uzelId === nodeId).map((z) => z.id);
    submissions = submissions.filter((s) => stationsInNode.includes(s.stationId));
  }

  const nodes: NodeSummary[] = [];

  for (const uzel of UZELLAR) {
    if (groupType === "node" && nodeId !== uzel.id) continue;

    const zapravkalar = ZAPRAVKALAR.filter((z) => z.uzelId === uzel.id);
    const zapravkaSummaries: ZapravkaSummary[] = [];

    for (const zap of zapravkalar) {
      if (groupType === "station" && stationId !== zap.id) continue;

      const zapSubmissions = submissions.filter((s) => s.stationId === zap.id);
      const summary = calculateZapravkaSummary(zap, zapSubmissions);
      zapravkaSummaries.push(summary);
    }

    if (zapravkaSummaries.length > 0) {
      nodes.push({
        nodeId: uzel.id,
        nodeName: uzel.name,
        zapravkalar: zapravkaSummaries,
        totals: calculateTotals(zapravkaSummaries),
      });
    }
  }

  const republicTotals = calculateRepublicTotals(nodes);
  const manualFields = await loadManualFields();

  return {
    filter,
    generatedAt: Date.now(),
    generatedBy: "admin",
    nodes,
    republicTotals,
    manualFields,
  };
}

function calculateZapravkaSummary(
  zap: { id: string; name: string; uzelId: string },
  submissions: SubmissionRaw[],
): ZapravkaSummary {
  const lokomotiv = submissions.filter((s) => s.category === "lokomotiv");
  const korxona = submissions.filter((s) => s.category === "korxona");
  const qurulish = submissions.filter((s) => s.category === "qurulish");
  const tamirlash = submissions.filter((s) => s.category === "tamirlash");

  const sumField = (arr: SubmissionRaw[], field: string) =>
    arr.reduce((sum, item) => sum + parsePdfNumber((item as Record<string, unknown>)[field]), 0);

  const lokomotivByType = (type: string) =>
    sumField(lokomotiv.filter((l) => l.harakatTuri === type), "qanchaBerildi");

  const countByType = (type: string) =>
    lokomotiv.filter((l) => l.harakatTuri === type).length;

  const yuk = lokomotivByType("yuk");
  const yolovchi = lokomotivByType("yolovchi");
  const manyovr = lokomotivByType("manyovr");
  const xojalik = lokomotivByType("xojalik");
  const ijara = lokomotivByType("ijara") + lokomotivByType("arenda");

  const tamirlashTotal = sumField(tamirlash, "qanchaBerildi");
  const teplovozTotal = yuk + yolovchi + manyovr + xojalik + ijara + tamirlashTotal;

  const korxonaTotal = sumField(korxona, "qancha");
  const qurulishTotal = sumField(qurulish, "qanchaOlindi");

  const sutkaTotal = teplovozTotal + korxonaTotal + qurulishTotal;
  const dizMasla = sumField(lokomotiv, "dizMasla") + sumField(tamirlash, "dizMasla");

  return {
    zapravkaId: zap.id,
    zapravkaName: zap.name,
    nodeId: zap.uzelId,
    sutkaTotal: Math.round(sutkaTotal * 100) / 100,
    teplovozTotal: Math.round(teplovozTotal * 100) / 100,
    yuk: Math.round(yuk * 100) / 100,
    yolovchi: Math.round(yolovchi * 100) / 100,
    manyovr: Math.round(manyovr * 100) / 100,
    xojalik: Math.round(xojalik * 100) / 100,
    ijara: Math.round(ijara * 100) / 100,
    tamirlash: Math.round(tamirlashTotal * 100) / 100,
    refSeksiya: 0,
    korxonaTotal: Math.round(korxonaTotal * 100) / 100,
    qurulishTotal: Math.round(qurulishTotal * 100) / 100,
    dizMasla: Math.round(dizMasla * 100) / 100,
    teplovozCount: {
      yuk: countByType("yuk"),
      yolovchi: countByType("yolovchi"),
      manyovr: countByType("manyovr"),
      xojalik: countByType("xojalik"),
      ijara: countByType("ijara") + countByType("arenda"),
      total: lokomotiv.length,
    },
  };
}

function calculateTotals(summaries: ZapravkaSummary[]) {
  const initial = {
    sutkaTotal: 0,
    teplovozTotal: 0,
    yuk: 0,
    yolovchi: 0,
    manyovr: 0,
    xojalik: 0,
    ijara: 0,
    tamirlash: 0,
    refSeksiya: 0,
    korxonaTotal: 0,
    qurulishTotal: 0,
    dizMasla: 0,
    teplovozCount: { yuk: 0, yolovchi: 0, manyovr: 0, xojalik: 0, ijara: 0, total: 0 },
  };

  return summaries.reduce(
    (acc, s) => ({
      sutkaTotal: acc.sutkaTotal + s.sutkaTotal,
      teplovozTotal: acc.teplovozTotal + s.teplovozTotal,
      yuk: acc.yuk + s.yuk,
      yolovchi: acc.yolovchi + s.yolovchi,
      manyovr: acc.manyovr + s.manyovr,
      xojalik: acc.xojalik + s.xojalik,
      ijara: acc.ijara + s.ijara,
      tamirlash: acc.tamirlash + s.tamirlash,
      refSeksiya: acc.refSeksiya + s.refSeksiya,
      korxonaTotal: acc.korxonaTotal + s.korxonaTotal,
      qurulishTotal: acc.qurulishTotal + s.qurulishTotal,
      dizMasla: acc.dizMasla + s.dizMasla,
      teplovozCount: {
        yuk: acc.teplovozCount.yuk + s.teplovozCount.yuk,
        yolovchi: acc.teplovozCount.yolovchi + s.teplovozCount.yolovchi,
        manyovr: acc.teplovozCount.manyovr + s.teplovozCount.manyovr,
        xojalik: acc.teplovozCount.xojalik + s.teplovozCount.xojalik,
        ijara: acc.teplovozCount.ijara + s.teplovozCount.ijara,
        total: acc.teplovozCount.total + s.teplovozCount.total,
      },
    }),
    initial,
  );
}

function calculateRepublicTotals(nodes: NodeSummary[]) {
  return calculateTotals(
    nodes.map((n) => ({
      ...n.totals,
      zapravkaId: "",
      zapravkaName: "",
      nodeId: "",
    })),
  );
}

async function loadManualFields(): Promise<Record<string, string>> {
  try {
    const res = await api.get<{ ok: true; value: unknown }>("/app-settings/global");
    const data = res.value as { manualFieldsTemplate?: Array<{ key: string; defaultValue: string }> } | null;
    if (Array.isArray(data?.manualFieldsTemplate)) {
      return data!.manualFieldsTemplate.reduce<Record<string, string>>(
        (acc, f) => ({ ...acc, [f.key]: f.defaultValue }),
        {},
      );
    }
    return {};
  } catch {
    return {};
  }
}
