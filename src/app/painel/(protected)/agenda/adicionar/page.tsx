import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { OperationalDateEditor } from "@/components/operational-date-editor";
import { readEstanciaContent } from "@/lib/estancia-content-store";
import { getCalendarRule } from "@/lib/operational-calendar";
import { assertCalendarDate, getSaoPauloToday } from "@/lib/calendar-validity";
import { requirePainelAccess } from "@/lib/painel-session";

export const metadata: Metadata = { title: "Painel - Abrir data | Estância", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function PainelAgendaAddPage({ searchParams }: { searchParams: Promise<{ dia?: string; tipo?: string }> }) {
  await requirePainelAccess("vis_agenda", "/painel/agenda/adicionar");
  const { dia: date = "", tipo } = await searchParams;
  if (tipo === "promo") redirect(`/painel/site/eventos/novo${date ? `?dia=${encodeURIComponent(date)}&from=calendar` : ""}`);
  if (date) {
    try { assertCalendarDate(date); } catch { notFound(); }
    if (await getCalendarRule(date)) redirect(`/painel/agenda/${date}`);
  }
  const content = await readEstanciaContent();
  return <OperationalDateEditor date={date} rule={null} products={content.products} today={getSaoPauloToday()} />;
}
