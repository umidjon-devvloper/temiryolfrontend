/**
 * ERJU Y.PDF uchun fuelRecords yozuvlari.
 *
 * Node.js backend bilan: lokomotiv submissions o'z transaction'i ichida fuel_records yozadi.
 * Boshqa kategoriyalar (korxona, qurulish, tamirlash) uchun esa backend POST /submissions/<cat>
 * endpoint'i ham fuel_record yozadi (model logikasida). Shu sababli bu client-side funksiya
 * endi no-op — backend o'zi qiladi.
 *
 * Signaturalar saqlangan, mavjud import'larni buzmaslik uchun.
 */

export type ErjuFuelMoveType =
  | "yuk"
  | "yolovchi"
  | "manyovr"
  | "xojalik"
  | "ijara"
  | "tamirlash"
  | "korxona"
  | "qurulish";

interface BaseFuelRow {
  stationId: string;
  staffCode?: string;
  staffName?: string;
  fuelAmountKg: number;
  balanceBeforeKg?: number;
  dizMaslaKg?: number;
}

export async function appendFuelRecordForErjuJu(
  _moveType: ErjuFuelMoveType,
  _base: BaseFuelRow & {
    locoSeries?: string;
    locoCode?: string;
    locoNumber?: string;
    trainIndex?: string;
    weight?: string;
    time?: string;
    dateISO?: string;
  },
): Promise<void> {
  // no-op — backend submission endpoint'i fuel_records'ni avtomatik yozadi
}
