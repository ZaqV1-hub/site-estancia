"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { CalendarProductFields } from "@/components/calendar-product-fields";
import type { B2cProduct } from "@/lib/b2c-catalog-defaults";
import type { ManagedEvent } from "@/lib/estancia-content-store";
import { calendarEventDate } from "@/lib/calendar-event-link";
import { editableCalendarStatus, getSaoPauloToday, isEventOnlyProduct } from "@/lib/calendar-validity";
import { calendarValidityLabels, type CalendarRule, type CalendarValidity } from "@/lib/operational-calendar-contracts";
type Props = {
    products: B2cProduct[];
    event?: ManagedEvent | null;
    rule?: CalendarRule | null;
    initialDate?: string;
    fromCalendar?: boolean;
    presentation?: "page" | "modal";
    onSaved?: () => void;
    onCancel?: () => void;
};
function Field({ label, counter, children }: {
    label: string;
    counter?: string;
    children: ReactNode;
}) { return <label className="calendar-field"><span className="calendar-field-label">{label}{counter && <span className="calendar-counter">{counter}</span>}</span>{children}</label>; }
export function OperationalEventEditor({ products, event = null, rule = null, initialDate = "", fromCalendar = false, presentation = "page", onSaved, onCancel }: Props) {
    const router = useRouter();
    const eventDate = calendarEventDate(event) ?? "";
    const [mode, setMode] = useState(event ? (eventDate ? "date" : "link") : "date");
    const [step, setStep] = useState(1);
    const [title, setTitle] = useState(event?.title ?? "");
    const [description, setDescription] = useState(event?.description ?? "");
    const [date, setDate] = useState(eventDate || initialDate);
    const [href, setHref] = useState(event && !eventDate ? event.href : "");
    const [pageEnabled, setPageEnabled] = useState(event?.pageEnabled ?? false);
    const [pageTitle, setPageTitle] = useState(event?.pageTitle ?? "");
    const [pageContent, setPageContent] = useState(event?.pageContent ?? "");
    const [buttonLabel, setButtonLabel] = useState(event?.buttonLabel ?? "Compre seu ingresso!");
    const [active, setActive] = useState(event?.active ?? true);
    const [image, setImage] = useState<File | null>(null);
    const [passportIds, setPassportIds] = useState(rule?.passportIds ?? products.filter(p => p.active && p.type === "passport" && !isEventOnlyProduct(p)).map(p => p.id));
    const [addonIds, setAddonIds] = useState(rule?.addonIds ?? products.filter(p => p.active && p.type === "addon").map(p => p.id));
    const [validity, setValidity] = useState<CalendarValidity>(rule?.validity ?? "day");
    const [status, setStatus] = useState(editableCalendarStatus(rule?.status));
    const [currentRule, setCurrentRule] = useState(rule);
    const [loadingRule, setLoadingRule] = useState(presentation === "modal" && Boolean(eventDate) && !rule);
    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState(false);
    useEffect(() => {
        if (presentation !== "modal" || !event || !eventDate || rule)
            return;
        const controller = new AbortController();
        fetch(`/api/painel/calendar-events?id=${encodeURIComponent(event.id)}`, { signal: controller.signal }).then(async (response) => {
            const payload = await response.json();
            if (!response.ok || !payload.ok)
                throw new Error(payload.error?.message || "Não foi possível carregar a regra da data.");
            setCurrentRule(payload.data.rule);
            if (payload.data.rule) setValidity(payload.data.rule.validity);
        }).catch(error => { if (!controller.signal.aborted)
            setError(error instanceof Error ? error.message : "Não foi possível carregar a data."); }).finally(() => { if (!controller.signal.aborted)
            setLoadingRule(false); });
        return () => controller.abort();
    }, [event, eventDate, presentation, rule]);
    const isModal = presentation === "modal";
    const today = getSaoPauloToday();
    async function submit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        if (title !== event?.title && title.trim().normalize("NFC").length > 52) {
            setError("Ajuste o título para até 52 caracteres antes de salvar.");
            return;
        }
        if (description !== event?.description && description.trim().normalize("NFC").length > 220) {
            setError("Ajuste o resumo para até 220 caracteres antes de salvar.");
            return;
        }
        if (isModal && mode === "date" && (loadingRule || !currentRule)) {
            setError("Aguarde a regra da data. Se ela não existir, configure a data em Mais detalhes.");
            return;
        }
        if (!isModal && step === 1 && mode === "date") {
            if (!event && date <= today) {
                setError("A nova data precisa ser futura.");
                return;
            }
            if (!event && !image) {
                setError("Envie uma imagem para o evento.");
                return;
            }
            if (!event) {
                setPending(true);
                try {
                    const response = await fetch("/api/painel/agenda/range-check", {
                        method: "POST", headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ startDate: date, endDate: date }),
                    });
                    const payload = await response.json();
                    if (!response.ok || !payload.ok) throw new Error(payload.error?.message || "Não foi possível verificar a data.");
                    if (payload.data.existingDates.length) throw new Error("Esta data já existe. Edite a data pelo calendário.");
                } catch (error) {
                    setError(error instanceof Error ? error.message : "Não foi possível verificar a data.");
                    return;
                } finally { setPending(false); }
            }
            setStep(2);
            return;
        }
        if (mode === "date" && !isModal && !passportIds.length) {
            setError("Selecione ao menos um passaporte.");
            return;
        }
        setPending(true);
        try {
            const form = new FormData();
            Object.entries({ id: event?.id ?? "", title, description, eventMode: mode, eventDate: date, href, eventPageMode: pageEnabled ? "with-page" : "without-page", pageTitle, pageContent, buttonLabel, active: String(active), editScope: isModal ? "content" : "all", validity, status }).forEach(([key, value]) => form.set(key, value));
            passportIds.forEach(id => form.append("passportIds", id));
            addonIds.forEach(id => form.append("addonIds", id));
            if (image)
                form.set("image", image);
            const response = await fetch("/api/painel/calendar-events", { method: "POST", body: form });
            const payload = await response.json().catch(() => null);
            if (!response.ok || !payload?.ok)
                throw new Error(payload?.error?.message || "Não foi possível salvar o evento.");
            if (onSaved)
                onSaved();
            else
                router.push(mode === "date" ? `/painel/agenda/${date}` : "/painel/site");
            router.refresh();
        }
        catch (error) {
            setError(error instanceof Error ? error.message : "Não foi possível salvar o evento.");
        }
        finally {
            setPending(false);
        }
    }
    return <div className="calendar-event-page">
        {!isModal && <nav className="calendar-breadcrumbs" aria-label="Navegação estrutural"><Link href="/painel/site">Site</Link><span aria-hidden="true">›</span><span>{event ? "Editar evento" : "Novo evento"}</span></nav>}
        <div className={isModal ? "calendar-page calendar-event-modal" : "calendar-page calendar-card calendar-event-wizard"}>
            {!isModal && <>
                <p className="calendar-eyebrow calendar-event-label">Evento</p>
                <h2 className="calendar-heading">{event ? `Editar ${event.title}` : "Novo evento"}</h2>
                <p className="calendar-muted">{mode === "date" ? "Configure o evento e escolha os ingressos para a data." : "Configure o evento e o link que será aberto no site."}</p>
                <ol className="calendar-event-steps" aria-label="Etapas do evento">
                    <li className={step === 1 ? "is-current" : "is-complete"} aria-current={step === 1 ? "step" : undefined}><span>{step > 1 ? "✓" : "1"}</span>Configuração do evento</li>
                    {mode === "date" && <li className={step === 2 ? "is-current" : ""} aria-current={step === 2 ? "step" : undefined}><span>2</span>Data do evento</li>}
                </ol>
            </>}
            {!isModal && rule?.status === "lot" && status === "fec" && <p className="calendar-catalog-note" role="status">Esta data estava lotada. As vendas ficam fechadas; selecione Aberta para reabrir.</p>}
            <form onSubmit={submit} className="calendar-event-form">
                <div hidden={!isModal && step !== 1} style={{ display: !isModal && step !== 1 ? "none" : undefined }} className="calendar-event-form">
                    {!isModal && !fromCalendar && !event && <section className="calendar-event-section">
                        <h3>Tipo do evento</h3>
                        <p className="calendar-muted">Escolha se o botão vai abrir uma data do site ou um link externo.</p>
                        <div className="calendar-segmented" role="group" aria-label="Tipo do evento">
                            <button type="button" disabled={pending} aria-pressed={mode === "date"} onClick={() => setMode("date")}>Data do site</button>
                            <button type="button" disabled={pending} aria-pressed={mode === "link"} onClick={() => setMode("link")}>Link externo</button>
                        </div>
                    </section>}
                    {fromCalendar && <p className="calendar-event-notice">Criado pelo calendário: o evento já abre como data do site, na data escolhida.</p>}
                    {isModal && <p className="calendar-muted">{eventDate ? `Data do site · ${eventDate.split("-").reverse().join("/")}` : "Link externo"}</p>}
                    <Field label="Título" counter={`(${title.length}/52)`}>
                        <input className="calendar-input" required maxLength={Math.max(52, event?.title.length ?? 0)} value={title} onChange={e => { setTitle(e.target.value); e.currentTarget.setCustomValidity(e.target.value !== event?.title && e.target.value.trim().normalize("NFC").length > 52 ? "Ajuste o título para até 52 caracteres." : ""); }} />
                    </Field>
                    {!isModal && <p className="calendar-muted">Máximo de 52 caracteres para manter o layout do site.</p>}
                    <Field label="Resumo" counter={`(${description.length}/220)`}>
                        <textarea className="calendar-input" required maxLength={Math.max(220, event?.description.length ?? 0)} rows={3} value={description} onChange={e => { setDescription(e.target.value); e.currentTarget.setCustomValidity(e.target.value !== event?.description && e.target.value.trim().normalize("NFC").length > 220 ? "Ajuste o resumo para até 220 caracteres." : ""); }} />
                    </Field>
                    {(event?.description.length ?? 0) > 220 && <p className="calendar-catalog-note">Resumo legado preservado. Ao editar este texto, ajuste-o para até 220 caracteres antes de salvar.</p>}
                    {!isModal && <p className="calendar-muted">Máximo de 220 caracteres para manter o resumo equilibrado na listagem.</p>}
                    {mode === "date" && !isModal && <Field label="Data do evento"><input className="calendar-input" type="date" required disabled={pending} value={date} min={event ? undefined : new Date(new Date(`${today}T12:00:00Z`).getTime() + 86_400_000).toISOString().slice(0, 10)} readOnly={Boolean(event) || fromCalendar} onChange={e => setDate(e.target.value)} /></Field>}
                    {mode === "link" && <Field label="Link externo"><input className="calendar-input" type="url" required value={href} placeholder="https://" onChange={e => setHref(e.target.value)} /></Field>}
                    {mode === "date" && <section className={isModal ? "calendar-event-form" : "calendar-event-section"}>
                        {isModal ? <Field label="Página do evento"><select className="calendar-input" value={String(pageEnabled)} onChange={e => setPageEnabled(e.target.value === "true")}><option value="false">Sem página</option><option value="true">Com página</option></select></Field> : <>
                            <h3>Página do evento</h3><p className="calendar-muted">Escolha se o evento fica só na agenda ou se terá página própria no site.</p>
                            <div className="calendar-segmented" role="group" aria-label="Página do evento"><button type="button" aria-pressed={!pageEnabled} onClick={() => setPageEnabled(false)}>Sem página</button><button type="button" aria-pressed={pageEnabled} onClick={() => setPageEnabled(true)}>Com página</button></div>
                        </>}
                        {pageEnabled && <>
                            <Field label="Título da página"><input className="calendar-input" maxLength={80} value={pageTitle} placeholder={title} onChange={e => setPageTitle(e.target.value)} /></Field>
                            <Field label="Texto da página"><textarea className="calendar-input" required rows={isModal ? 3 : 8} maxLength={40000} value={pageContent} onChange={e => setPageContent(e.target.value)} /></Field>
                        </>}
                    </section>}
                    {isModal && eventDate && <>
                        <Field label="Validade dos ingressos"><select className="calendar-input" value={validity} disabled={loadingRule || !currentRule} onChange={e => setValidity(e.target.value as CalendarValidity)}>{Object.entries(calendarValidityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
                        <p className="calendar-muted">Vale apenas para próximas emissões. Os vouchers já emitidos mantêm a validade atual.</p>
                        {loadingRule ? <p className="calendar-muted" role="status">Carregando regra da data…</p> : currentRule ? <div className="calendar-event-products">
                            <p className="calendar-muted">Passaportes: {currentRule.passportIds.map(id => products.find(p => p.id === id)?.title ?? id).join(", ") || "Nenhum"}</p>
                            <p className="calendar-muted">Adicionais: {currentRule.addonIds.map(id => products.find(p => p.id === id)?.title ?? id).join(", ") || "Nenhum"}</p>
                            <p className="calendar-muted">Data {currentRule.status === "fec" ? "fechada" : currentRule.status === "lot" ? "lotada" : "aberta"}</p>
                        </div> : <p className="calendar-error">Configure a data em Mais detalhes antes de salvar.</p>}
                    </>}
                    <div className="calendar-form-grid">
                        <Field label="Texto do botão"><input className="calendar-input" maxLength={80} value={buttonLabel} onChange={e => setButtonLabel(e.target.value)} /></Field>
                        <Field label="Imagem"><input className="calendar-input" type="file" accept="image/jpeg,image/png,image/webp,image/gif" required={!event && step === 1} onChange={e => setImage(e.target.files?.[0] ?? null)} /><span className="calendar-muted">JPG, PNG, WebP ou GIF · até 10 MB</span></Field>
                    </div>
                    {event?.imageSrc && <img src={event.imageSrc} alt={event.title} className="calendar-event-image" />}
                    <label className="calendar-actions"><input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} /> Publicar no site</label>
                </div>
                {!isModal && step === 2 && <>
                    <p className="calendar-event-notice">Data do evento · {date.split("-").reverse().join("/")}</p>
                    <CalendarProductFields products={products} passportIds={passportIds} addonIds={addonIds} onPassportsChange={setPassportIds} onAddonsChange={setAddonIds} isEvent />
                    <div className="calendar-form-grid">
                        <Field label="Status da data"><select className="calendar-input" value={status} onChange={e => setStatus(e.target.value as "abe" | "fec")}><option value="abe">Aberta</option><option value="fec">Fechada</option></select></Field>
                        <Field label="Validade dos ingressos"><select className="calendar-input" value={validity} onChange={e => setValidity(e.target.value as CalendarValidity)}>{Object.entries(calendarValidityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
                    </div>
                    <Link className="calendar-button-secondary" href="/painel/passaportes-itens">Criar ou editar passaportes</Link>
                </>}
                {isModal && <p className="calendar-muted">Imagem, título, resumo, texto do botão e página são configurados nesta janela. Passaportes, adicionais, relatório e movimentação ficam em Mais detalhes.</p>}
                {error && <p className="calendar-error" role="alert">{error}</p>}
                <div className="calendar-actions calendar-event-footer">
                    {isModal && eventDate && <Link href={`/painel/agenda/${eventDate}`} className="calendar-button-secondary calendar-event-details">Mais detalhes</Link>}
                    {isModal && onCancel && <button type="button" className="calendar-button-secondary" onClick={onCancel}>Cancelar</button>}
                    <button type="submit" className="calendar-button" disabled={pending || (isModal && Boolean(eventDate) && (loadingRule || !currentRule))}>{pending ? "Salvando…" : isModal ? "Salvar evento" : step === 1 && mode === "date" ? "Continuar" : "Publicar evento"}</button>
                    {!isModal && (step === 2 ? <button type="button" className="calendar-button-secondary" onClick={() => setStep(1)}>Voltar ao passo 1</button> : <Link href={fromCalendar ? "/painel/agenda" : "/painel/site"} className="calendar-button-secondary">Cancelar</Link>)}
                </div>
            </form>
        </div>
    </div>;
}
