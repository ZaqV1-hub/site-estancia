import type { CalendarValidity } from "@/lib/operational-calendar-contracts";

export function assertCalendarDate(value: string) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Informe uma data válida.");
  }
  const date = new Date(`${value}T12:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error("Informe uma data válida.");
  }
  return date;
}

export function getSaoPauloToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
}

export function resolveCalendarValidityDate(visitDate: string, validity: CalendarValidity) {
  const date = assertCalendarDate(visitDate);
  if (validity === "6m") {
    const originalDay = date.getUTCDate();
    date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth() + 6);
    const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
    date.setUTCDate(Math.min(originalDay, lastDay));
  } else {
    const days = { day: 1, "1d": 1, "7d": 7, "30d": 30 }[validity];
    if (days === undefined) throw new Error("Selecione uma validade válida.");
    date.setUTCDate(date.getUTCDate() + days - 1);
  }
  return date.toISOString().slice(0, 10);
}

export function isEventOnlyProduct(product: { title: string; type: string; eventOnly?: boolean }) {
  if (product.type !== "passport") return false;
  const title = product.title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return product.eventOnly === true || /especial|dia das criancas|halloween/.test(title);
}


export function editableCalendarStatus(status?: "abe" | "fec" | "lot"): "abe" | "fec" {
  return status === "fec" || status === "lot" ? "fec" : "abe";
}
