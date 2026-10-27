"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { CalendarProductFields } from "@/components/calendar-product-fields";
import type { B2cProduct } from "@/lib/b2c-catalog-defaults";
import type { ManagedEvent } from "@/lib/estancia-content-store";
import { editableCalendarStatus, isEventOnlyProduct } from "@/lib/calendar-validity";
import { calendarValidityLabels, type CalendarRule, type CalendarValidity } from "@/lib/operational-calendar-contracts";
type Props = {
    products: B2cProduct[];
    event?: ManagedEvent | null;
    rule?: CalendarRule | null;
    initialDate?: string;
    fromCalendar?: boolean;
    presentation?: "page" | "modal";
    onSaved?: () => void;
};
function Field({ label, children }: {
    label: string;
    children: ReactNode;
}) { return <label className="calendar-field">{label}{children}</label>; }
export function OperationalEventEditor({ products, event = null, rule = null, initialDate = "", fromCalendar = false, presentation = "page", onSaved }: Props) {
    const router = useRouter();
    const eventDate = event?.href.match(/(?:\?|&)date=(\d{4}-\d{2}-\d{2})(?:&|$)/)?.[1] ?? "";
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
    const [loadingRule, setLoadingRule] = useState(presentation === "modal" && Boolean(eventDate));
    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState(false);
    useEffect(() => {
        if (presentation !== "modal" || !event || !eventDate)
            return;
        const controller = new AbortController();
        fetch(`/api/painel/calendar-events?id=${encodeURIComponent(event.id)}`, { signal: controller.signal }).then(async (response) => {
            const payload = await response.json();
            if (!response.ok || !payload.ok)
                throw new Error(payload.error?.message || "Não foi possível carregar a regra da data.");
            setCurrentRule(payload.data.rule);
        }).catch(error => { if (!controller.signal.aborted)
            setError(error instanceof Error ? error.message : "Não foi possível carregar a data."); }).finally(() => { if (!controller.signal.aborted)
            setLoadingRule(false); });
        return () => controller.abort();
    }, [event, eventDate, presentation]);
    const isModal = presentation === "modal";
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
    async function submit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        if (!isModal && step === 1 && mode === "date") {
            if (!event && !image) {
                setError("Envie uma imagem para o evento.");
                return;
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
    return <div className={isModal ? "calendar-page" : "calendar-page calendar-card"}>
  {!isModal && <>
        <p className="calendar-eyebrow">Site · Eventos</p>
        <h2 className="calendar-heading">{event ? "Editar evento" : "Novo evento"}</h2>
        <ol className="calendar-actions" aria-label="Etapas do evento">
        <li aria-current={step === 1 ? "step" : undefined}>1 · Configuração do evento</li>{mode === "date" && <li aria-current={step === 2 ? "step" : undefined}>2 · Data do evento</li>}</ol>
        </>}
  {!isModal && rule?.status === "lot" && status === "fec" && <p className="calendar-catalog-note" role="status">Esta data estava lotada. As vendas ficam fechadas; selecione Aberta para reabrir.</p>}
  <form onSubmit={submit} className="grid gap-5">
   <div hidden={!isModal && step !== 1} style={{ display: !isModal && step !== 1 ? "none" : undefined }} className="grid gap-5">
    {!isModal && !fromCalendar && !event && <Field label="Tipo do evento">
        <select className="calendar-input" value={mode} onChange={e => setMode(e.target.value)}>
        <option value="date">Data do site</option>
        <option value="link">Link externo</option>
        </select>
        </Field>}
    {fromCalendar && <p className="calendar-muted">Data do site · criada pelo calendário</p>}
    <Field label={`Título (${title.length}/52)`}>
    <input className="calendar-input" required maxLength={52} value={title} onChange={e => setTitle(e.target.value)}/>
    </Field>
    <Field label={`Resumo (${description.length}/220)`}>
    <textarea className="calendar-input" required maxLength={220} rows={3} value={description} onChange={e => setDescription(e.target.value)}/>
    </Field>
    {mode === "date" && !isModal && <Field label="Data do evento">
        <input className="calendar-input" type="date" required value={date} min={event ? undefined : today} readOnly={Boolean(event) || fromCalendar} onChange={e => setDate(e.target.value)}/>
        </Field>}
    {mode === "link" && <Field label="Link externo">
        <input className="calendar-input" type="url" required value={href} placeholder="https://" onChange={e => setHref(e.target.value)}/>
        </Field>}
    {mode === "date" && <>
        <Field label="Página do evento">
        <select className="calendar-input" value={String(pageEnabled)} onChange={e => setPageEnabled(e.target.value === "true")}>
        <option value="false">Sem página</option>
        <option value="true">Com página</option>
        </select>
        </Field>
    {pageEnabled && <>
            <Field label="Título da página">
            <input className="calendar-input" maxLength={80} value={pageTitle} placeholder={title} onChange={e => setPageTitle(e.target.value)}/>
            </Field>
            <Field label="Texto da página">
            <textarea className="calendar-input" required rows={8} maxLength={40000} value={pageContent} onChange={e => setPageContent(e.target.value)}/>
            </Field>
            </>}</>}
    <Field label="Texto do botão">
    <input className="calendar-input" maxLength={80} value={buttonLabel} onChange={e => setButtonLabel(e.target.value)}/>
    </Field>
    {event?.imageSrc && <img src={event.imageSrc} alt={event.title} className="h-40 w-full rounded-md object-cover"/>}
    <Field label="Imagem">
    <input className="calendar-input" type="file" accept="image/jpeg,image/png,image/webp,image/gif" required={!event && step === 1} onChange={e => setImage(e.target.files?.[0] ?? null)}/>
    <span className="calendar-muted">JPG, PNG, WebP ou GIF · até 10 MB</span>
    </Field>
    <label className="calendar-actions">
    <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)}/> Publicar no site</label>
   </div>
   {!isModal && step === 2 && <>
        <h3 className="calendar-heading">Data do evento · {date.split("-").reverse().join("/")}</h3>
        <CalendarProductFields products={products} passportIds={passportIds} addonIds={addonIds} onPassportsChange={setPassportIds} onAddonsChange={setAddonIds} isEvent/>
    <div className="calendar-form-grid">
        <Field label="Status da data">
        <select className="calendar-input" value={status} onChange={e => setStatus(e.target.value as "abe" | "fec")}>
        <option value="abe">Aberta</option>
        <option value="fec">Fechada</option>
        </select>
        </Field>
        <Field label="Validade dos vouchers">
        <select className="calendar-input" value={validity} onChange={e => setValidity(e.target.value as CalendarValidity)}>{Object.entries(calendarValidityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        </Field>
        </div>
        <Link className="calendar-button-secondary" href="/painel/passaportes-itens">Criar ou editar passaportes</Link>
        </>}
   {isModal && eventDate && <section className="calendar-card">
        <h3 className="font-bold">Regra desta data</h3>{loadingRule ? <p className="calendar-muted">Carregando…</p> : currentRule ? <>
            <p>Validade: {calendarValidityLabels[currentRule.validity]} · {currentRule.status === "fec" ? "Fechada" : currentRule.status === "lot" ? "Lotada" : "Aberta"}</p>
            <p className="calendar-muted">Passaportes: {currentRule.passportIds.map(id => products.find(p => p.id === id)?.title ?? id).join(", ") || "Nenhum"}</p>
            <p className="calendar-muted">Adicionais: {currentRule.addonIds.map(id => products.find(p => p.id === id)?.title ?? id).join(", ") || "Nenhum"}</p>
            </> : <p className="calendar-muted">Configure a oferta e a validade na agenda.</p>}<Link href={`/painel/agenda/${eventDate}`} className="calendar-button-secondary">Mais detalhes</Link>
        </section>}
   {error && <p className="calendar-error" role="alert">{error}</p>}
   <div className="calendar-actions">{!isModal && step === 2 && <button type="button" className="calendar-button-secondary" onClick={() => setStep(1)}>Voltar</button>}<button type="submit" className="calendar-button" disabled={pending}>{pending ? "Salvando…" : isModal ? "Salvar evento" : step === 1 && mode === "date" ? "Continuar" : "Publicar evento"}</button>{!isModal && <Link href={fromCalendar ? "/painel/agenda" : "/painel/site"} className="calendar-button-secondary">Cancelar</Link>}</div>
  </form>
 </div>;
}
