import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { OperationalDateEditor } from "@/components/operational-date-editor";
import { getCalendarDay } from "@/lib/operational-calendar";
import { assertCalendarDate, getSaoPauloToday } from "@/lib/calendar-validity";
import { requirePainelAccess } from "@/lib/painel-session";

export const metadata: Metadata = { title: "Painel - Editar data | Estância", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function PainelAgendaEditPage({ params }: { params: Promise<{ date: string }> }) {
  await requirePainelAccess("vis_agenda", "/painel/agenda");
  const { date } = await params;
  try { assertCalendarDate(date); } catch { notFound(); }
  const data = await getCalendarDay(date);
  if (!data.rule) notFound();
  if (data.rule.type === "event" && data.rule.eventId) redirect(`/painel/site/eventos/${encodeURIComponent(data.rule.eventId)}/editar`);
  if (data.rule.type === "event") return <section className="calendar-card calendar-page"><h1 className="calendar-heading">Vincular evento desta data</h1><p className="calendar-muted">Esta data promocional antiga ainda não está vinculada a um evento do site. Abra o evento pelo Site para revisar o vínculo e configurar sua oferta.</p><div className="calendar-actions"><Link className="calendar-button-secondary" href={`/painel/agenda/${date}`}>Voltar ao relatório</Link><Link className="calendar-button" href="/painel/site">Abrir Site</Link></div></section>;
  return <OperationalDateEditor key={date} date={date} rule={data.rule} products={data.products} today={getSaoPauloToday()} />;
}
