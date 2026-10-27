import { notFound } from "next/navigation";
import { OperationalEventEditor } from "@/components/operational-event-editor";
import { readEstanciaContent } from "@/lib/estancia-content-store";
import { calendarEventDate } from "@/lib/calendar-events";
import { getCalendarRule } from "@/lib/operational-calendar";
import { requirePainelAccess } from "@/lib/painel-session";
export const dynamic = "force-dynamic";
export default async function EditEventPage({ params }: {
    params: Promise<{
        id: string;
    }>;
}) {
    const { id } = await params;
    await requirePainelAccess(["vis_info", "vis_param"], `/painel/site/eventos/${id}/editar`);
    const content = await readEstanciaContent();
    const event = content.events.find(item => item.id === id);
    if (!event)
        notFound();
    const date = calendarEventDate(event);
    return <OperationalEventEditor products={content.products} event={event} rule={date ? await getCalendarRule(date) : null}/>;
}
