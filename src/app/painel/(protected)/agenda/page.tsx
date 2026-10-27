import type { Metadata } from "next";
import { OperationalCalendar } from "@/components/operational-calendar";
import { getCalendarMonth } from "@/lib/operational-calendar";
import { getSaoPauloToday } from "@/lib/calendar-validity";
import { requirePainelAccess } from "@/lib/painel-session";

export const metadata: Metadata = { title: "Painel - Agenda | Estância", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function PainelAgendaPage({ searchParams }: { searchParams: Promise<{ mes?: string; ano?: string; dia?: string }> }) {
  await requirePainelAccess("vis_agenda", "/painel/agenda");
  const query = await searchParams;
  const today = getSaoPauloToday();
  const monthValue = Number(query.mes);
  const yearValue = Number(query.ano);
  const month = Number.isInteger(monthValue) && monthValue >= 1 && monthValue <= 12 ? monthValue : Number(today.slice(5, 7));
  const year = Number.isInteger(yearValue) && yearValue >= 2000 && yearValue <= 2100 ? yearValue : Number(today.slice(0, 4));
  const data = await getCalendarMonth(month, year);
  return <OperationalCalendar key={`${year}-${month}`} data={data} />;
}
