import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { requirePainelApiAccess } from "@/lib/painel-api-auth";
import { CalendarEventError, calendarEventDate, saveCalendarEvent } from "@/lib/calendar-events";
import { readEstanciaContent } from "@/lib/estancia-content-store";
import { CalendarError, getCalendarRule } from "@/lib/operational-calendar";
export const runtime = "nodejs";
export async function GET(request: Request) {
    const auth = await requirePainelApiAccess(request, ["vis_info", "vis_param"]);
    if (!auth.ok)
        return auth.response;
    const id = new URL(request.url).searchParams.get("id");
    const content = await readEstanciaContent();
    const event = content.events.find(item => item.id === id);
    if (!event)
        return NextResponse.json({ ok: false, error: { message: "Evento não encontrado." } }, { status: 404 });
    const date = calendarEventDate(event);
    return NextResponse.json({ ok: true, data: { event, rule: date ? await getCalendarRule(date) : null } });
}
export async function POST(request: Request) {
    const auth = await requirePainelApiAccess(request, ["vis_info", "vis_param"]);
    if (!auth.ok)
        return auth.response;
    try {
        const form = await request.formData();
        if (form.get("eventMode") === "date" && form.get("editScope") !== "content") {
            const agendaAuth = await requirePainelApiAccess(request, "vis_agenda");
            if (!agendaAuth.ok)
                return agendaAuth.response;
        }
        const result = await saveCalendarEvent(form, { name: auth.session.actorName, cpf: auth.session.actorCpf });
        for (const path of ["/", "/evento", "/painel", "/painel/site", "/painel/agenda"])
            revalidatePath(path);
        if (result.date)
            revalidatePath(`/painel/agenda/${result.date}`);
        return NextResponse.json({ ok: true, data: result });
    }
    catch (error) {
        if (error instanceof CalendarError)
            return NextResponse.json({ ok: false, error: { message: error.message } }, { status: error.status });
        if (error instanceof CalendarEventError)
            return NextResponse.json({ ok: false, error: { message: error.message } }, { status: 400 });
        console.error("calendar-event-save-failed", { code: error && typeof error === "object" && "code" in error ? String(error.code) : "unknown" });
        return NextResponse.json({ ok: false, error: { message: "Não foi possível salvar o evento. Confira a data e os produtos e tente novamente." } }, { status: 500 });
    }
}
