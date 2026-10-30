import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OperationalDayReport } from "@/components/operational-day-report";
import { getCalendarDay } from "@/lib/operational-calendar";
import { assertCalendarDate } from "@/lib/calendar-validity";
import { requirePainelAccess } from "@/lib/painel-session";

export const metadata: Metadata = { title: "Painel - Relatório da data | Estância", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function PainelAgendaDayPage({ params }: { params: Promise<{ date: string }> }) {
  await requirePainelAccess("vis_agenda", "/painel/agenda");
  const { date } = await params;
  try { assertCalendarDate(date); } catch { notFound(); }
  const data = await getCalendarDay(date);
  if (!data.rule && !data.schoolTrips?.length && !data.schoolTripsUnavailable) notFound();
  return <OperationalDayReport key={date} data={data} />;
}
