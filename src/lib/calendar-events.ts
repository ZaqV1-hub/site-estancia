import { randomUUID } from "node:crypto";
import { calendarEventDate } from "@/lib/calendar-event-link";
export { calendarEventDate } from "@/lib/calendar-event-link";
import { readEstanciaContent, saveUploadedSiteImage, type EstanciaContentData, type ManagedEvent } from "@/lib/estancia-content-store";
import { buildManagedEventPageSlug } from "@/lib/estancia-event-pages";
import { getIngressoDbPool } from "@/lib/ingresso-db";
import { removeOrderedItem, upsertOrderedItem } from "@/lib/managed-content-order";
import { ensureCalendarTables, getCalendarRule, saveCalendarDate } from "@/lib/operational-calendar";
import { registerOpsAuditLog } from "@/lib/ops-audit-log";
import { calendarValidityLabels, type CalendarActor, type CalendarRule, type CalendarValidity } from "@/lib/operational-calendar-contracts";
export class CalendarEventError extends Error {
}
const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim().normalize("NFC");
function assertExternalEventHref(href: string) {
    if (calendarEventDate({ href }))
        throw new CalendarEventError('Este link abre uma data da agenda. Use o tipo "Data do site" para configurar o evento.');
}
function realDate(date: string) {
    return /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(`${date}T12:00:00Z`)) && new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) === date;
}
export function parseCalendarEventForm(form: FormData, current?: Pick<ManagedEvent, "title" | "description"> | null) {
    const title = current && form.get("title") === current.title ? current.title : text(form, "title");
    const description = current && form.get("description") === current.description ? current.description : text(form, "description");
    if (!title || (title.length > 52 && title !== current?.title))
        throw new CalendarEventError("Informe um título com até 52 caracteres.");
    if (!description || (description.length > 220 && description !== current?.description))
        throw new CalendarEventError("Informe um resumo com até 220 caracteres.");
    const mode = text(form, "eventMode");
    if (mode !== "date" && mode !== "link")
        throw new CalendarEventError("Tipo de evento inválido.");
    const date = mode === "date" ? text(form, "eventDate") : null;
    if (date !== null && !realDate(date))
        throw new CalendarEventError("Informe uma data válida para o evento.");
    const href = mode === "link" ? text(form, "href") : "";
    if (mode === "link") {
        assertExternalEventHref(href);
        let url: URL;
        try {
            url = new URL(href);
        }
        catch {
            throw new CalendarEventError("Informe um link HTTP ou HTTPS válido.");
        }
        if (!["http:", "https:"].includes(url.protocol) || !url.hostname || url.username || url.password)
            throw new CalendarEventError("Informe um link HTTP ou HTTPS válido.");
    }
    const passportIds = [...new Set(form.getAll("passportIds").map(String).map(id => id.trim()).filter(Boolean))];
    const addonIds = [...new Set(form.getAll("addonIds").map(String).map(id => id.trim()).filter(Boolean))];
    const configureDate = text(form, "editScope") !== "content";
    if (date && configureDate && !passportIds.length)
        throw new CalendarEventError("Selecione ao menos um passaporte.");
    const validity = (text(form, "validity") || "day") as CalendarValidity;
    if (!Object.hasOwn(calendarValidityLabels, validity))
        throw new CalendarEventError("Validade inválida.");
    const status = text(form, "status") || "abe";
    if (status !== "abe" && status !== "fec")
        throw new CalendarEventError("Status inválido.");
    const pageEnabled = mode === "date" && text(form, "eventPageMode") === "with-page";
    const pageTitle = text(form, "pageTitle") || title, pageContent = text(form, "pageContent");
    if (pageTitle.length > 80 || pageContent.length > 40000)
        throw new CalendarEventError("O texto da página excede o limite permitido.");
    if (pageEnabled && !pageContent)
        throw new CalendarEventError("Informe o texto da página do evento.");
    const buttonLabel = text(form, "buttonLabel") || "Compre seu ingresso!";
    if (buttonLabel.length > 80)
        throw new CalendarEventError("O texto do botão deve ter até 80 caracteres.");
    const image = form.get("image");
    if (image instanceof File && image.size > 0 && (image.size > 10 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(image.type) || !/\.(jpe?g|png|webp|gif)$/i.test(image.name)))
        throw new CalendarEventError("Envie uma imagem JPG, PNG, WebP ou GIF de até 10 MB.");
    return { id: text(form, "id"), title, description, mode, date, href, passportIds, addonIds, configureDate, validity, status: status as "abe" | "fec", pageEnabled, pageTitle, pageContent, buttonLabel, active: ["on", "true"].includes(text(form, "active")) };
}
function ownsDateRule(rule: CalendarRule, event: ManagedEvent, data: EstanciaContentData) {
    if (rule.eventId) return rule.eventId === event.id;
    const matches = data.events.filter(item => calendarEventDate(item) === calendarEventDate(event));
    return (rule.type === "event" || rule.configured === false) && matches.length === 1 && matches[0].id === event.id;
}
export async function saveCalendarEvent(form: FormData, actor: CalendarActor) {
    if (text(form, "eventMode") === "link") assertExternalEventHref(text(form, "href"));
    await readEstanciaContent();
    await ensureCalendarTables();
    const client = await getIngressoDbPool().connect();
    try {
        await client.query("BEGIN");
        const result = await client.query<{
            content_json: EstanciaContentData;
        }>("SELECT content_json FROM public.estancia_site_content WHERE content_key = 'main' FOR UPDATE");
        const data = result.rows[0]?.content_json;
        if (!data)
            throw new Error("Site content unavailable");
        const idInput = text(form, "id");
        const current = idInput ? data.events.find(item => item.id === idInput) : null;
        const input = parseCalendarEventForm(form, current);
        if (input.id && !current)
            throw new CalendarEventError("Evento não encontrado.");
        if (!current && !input.configureDate)
            throw new CalendarEventError("Configuração da data obrigatória.");
        const oldDate = calendarEventDate(current);
        if (current && (oldDate !== input.date || Boolean(oldDate) !== (input.mode === "date")))
            throw new CalendarEventError("O tipo e a data de um evento publicado não podem ser alterados. Edite a regra na agenda.");
        if (input.date) await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", ["estancia-calendar:" + input.date]);
        const rule = input.date ? await getCalendarRule(input.date, client) : null;
        if (rule && !(current && ownsDateRule(rule, current, data)))
            throw new CalendarEventError("Esta data já está publicada. Escolha outra data.");
        const id = current?.id ?? `evento-${randomUUID()}`;
        const imageSrc = await saveUploadedSiteImage(form.get("image")) ?? current?.imageSrc;
        if (!imageSrc)
            throw new CalendarEventError("Envie uma imagem para o evento.");
        if (input.date && input.configureDate)
            await saveCalendarDate({ agendaId: rule?.agendaId, date: input.date, status: input.status, validity: input.validity, passportIds: input.passportIds, addonIds: input.addonIds, type: "event", eventId: id, eventTitle: input.title, eventDescription: input.description }, actor, client);
        else if (input.date) {
            if (!rule) throw new CalendarEventError("A data do evento não foi encontrada. Configure a data na agenda.");
            const validity = form.has("validity") ? input.validity : rule.validity;
            await client.query(`INSERT INTO public.estancia_calendar_rules
        (date,agenda_id,kind,status,validity,passport_ids,addon_ids,event_id,event_title)
        VALUES ($1::date,$2,'event',$3,$4,$5::text[],$6::text[],$7,$8)
        ON CONFLICT(date) DO UPDATE SET kind='event',validity=excluded.validity,
          event_id=excluded.event_id,event_title=excluded.event_title,updated_at=now()`, [input.date, rule.agendaId, rule.status, validity, rule.passportIds, rule.addonIds, id, input.title]);
            await client.query("UPDATE public.agenda SET nmpromocional=$1,dspromocional=$2 WHERE idagenda=$3", [input.title, input.description, rule.agendaId]);
            if (validity !== rule.validity)
                await registerOpsAuditLog(client, { origem: "calendar", acao: "event_validity_update", descricao: `Validade das próximas emissões do evento ${input.title} alterada`, motivo: "Edição do evento pelo painel", usuarioNome: actor.name ?? actor.cpf, detalhes: { eventId: id, date: input.date, previousValidity: rule.validity, validity, actorCpf: actor.cpf } });
        }
        const event: ManagedEvent = { id, title: input.title, description: input.description, pageTitle: input.pageTitle, pageContent: input.pageContent, pageEnabled: input.pageEnabled, pageSlug: input.pageEnabled ? buildManagedEventPageSlug({ id, title: input.title, pageTitle: input.pageTitle, pageSlug: current?.pageSlug ?? "" }) : current?.pageSlug ?? "", imageSrc, href: input.date ? `/agenda?mes=${Number(input.date.slice(5, 7))}&ano=${input.date.slice(0, 4)}&date=${input.date}` : input.href, buttonLabel: input.buttonLabel, active: input.active, sortOrder: current?.sortOrder ?? data.events.length + 1 };
        await client.query("UPDATE public.estancia_site_content SET content_json=$1::jsonb, updated_at=now() WHERE content_key='main'", [JSON.stringify({ ...data, events: upsertOrderedItem(data.events, event) })]);
        await client.query("COMMIT");
        return { event, date: input.date };
    }
    catch (error) {
        await client.query("ROLLBACK");
        throw error;
    }
    finally {
        client.release();
    }
}
export async function deleteCalendarEvent(id: string, actor: CalendarActor) {
    if (!id.trim())
        throw new CalendarEventError("Evento não informado.");
    await readEstanciaContent();
    await ensureCalendarTables();
    const client = await getIngressoDbPool().connect();
    try {
        await client.query("BEGIN");
        const result = await client.query<{
            content_json: EstanciaContentData;
        }>("SELECT content_json FROM public.estancia_site_content WHERE content_key='main' FOR UPDATE");
        const data = result.rows[0]?.content_json;
        const event = data?.events.find(item => item.id === id);
        if (!data || !event)
            throw new CalendarEventError("Evento não encontrado.");
        const date = calendarEventDate(event);
        if (date) await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", ["estancia-calendar:" + date]);
        const rule = date ? await getCalendarRule(date, client) : null;
        if (rule && !ownsDateRule(rule, event, data))
            throw new CalendarEventError("Esta data está vinculada a outra configuração. Confira a agenda antes de remover o evento.");
        if (rule) {
            // Keep the agenda and vouchers available for their purchase history.
            await client.query("UPDATE public.agenda SET stagenda='fec' WHERE idagenda=$1", [rule.agendaId]);
            await client.query(`INSERT INTO public.estancia_calendar_rules
        (date,agenda_id,kind,status,validity,passport_ids,addon_ids,event_id,event_title)
        VALUES ($1::date,$2,'event','fec',$3,$4::text[],$5::text[],$6,$7)
        ON CONFLICT(date) DO UPDATE SET status='fec',event_id=excluded.event_id,
          event_title=excluded.event_title,updated_at=now()`, [date, rule.agendaId, rule.validity, rule.passportIds, rule.addonIds, id, event.title]);
        }
        await client.query("UPDATE public.estancia_site_content SET content_json=$1::jsonb, updated_at=now() WHERE content_key='main'", [JSON.stringify({ ...data, events: removeOrderedItem(data.events, id) })]);
        await registerOpsAuditLog(client, { origem: "calendar", acao: "event_delete", descricao: `Evento ${event.title} removido do site${date ? `; data ${date} fechada` : ""}`,
            motivo: "Remoção de evento pelo painel", usuarioNome: actor.name ?? actor.cpf, detalhes: { eventId: id, date, actorCpf: actor.cpf } });
        await client.query("COMMIT");
    }
    catch (error) {
        await client.query("ROLLBACK");
        throw error;
    }
    finally {
        client.release();
    }
}
