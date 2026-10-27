"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { B2cProduct } from "@/lib/b2c-catalog-defaults";
import { calendarValidityLabels, type CalendarRule, type CalendarValidity, type SaveCalendarDateInput } from "@/lib/operational-calendar-contracts";
import { editableCalendarStatus } from "@/lib/calendar-validity";
import { CalendarProductFields, getDefaultCalendarProducts } from "@/components/calendar-product-fields";

export function validateCalendarDateDraft(draft: Pick<SaveCalendarDateInput, "date" | "passportIds">, today: string, editing: boolean) {
  const date = new Date(`${draft.date}T12:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== draft.date) return "Informe uma data válida.";
  if (!editing && draft.date <= today) return "A nova data precisa ser futura.";
  if (!draft.passportIds.length) return "Selecione ao menos um passaporte.";
  return null;
}

export function OperationalDateEditor({ date = "", rule, products, today }: { date?: string; rule: CalendarRule | null; products: B2cProduct[]; today: string }) {
  const router = useRouter();
  const defaults = getDefaultCalendarProducts(products);
  const [visitDate, setVisitDate] = useState(rule?.date ?? date);
  const [status, setStatus] = useState<"abe" | "fec">(editableCalendarStatus(rule?.status));
  const [validity, setValidity] = useState<CalendarValidity>(rule?.validity ?? "day");
  const [passportIds, setPassportIds] = useState(rule?.passportIds ?? defaults.passportIds);
  const [addonIds, setAddonIds] = useState(rule?.addonIds ?? defaults.addonIds);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const returnHref = rule ? `/painel/agenda/${rule.date}` : "/painel/agenda";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input: SaveCalendarDateInput = { agendaId: rule?.agendaId, date: visitDate, status, validity, passportIds, addonIds, type: "dayuse" };
    const validation = validateCalendarDateDraft(input, today, !!rule);
    if (validation) { setError(validation); return; }
    setError(null);
    setPending(true);
    try {
      const response = await fetch("/api/painel/calendario", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error?.message || result.message || "Não foi possível salvar a data.");
      router.push(`/painel/agenda/${visitDate}`);
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível salvar a data. Tente novamente."); }
    finally { setPending(false); }
  }

  return <div className="calendar-page calendar-editor">
    <header className="calendar-page-header"><div><p className="calendar-eyebrow">Agenda · Day use</p><h1 className="calendar-heading">{rule ? "Editar data" : "Abrir data"}</h1><p className="calendar-muted">Escolha os produtos e a regra dos vouchers desta visita.</p></div><Link href={returnHref} className="calendar-button-secondary">Cancelar</Link></header>
    <form onSubmit={handleSubmit} className="calendar-card calendar-form">
      <fieldset disabled={pending} className="calendar-form-fields">
        <div className="calendar-form-grid"><label className="calendar-field">Data<input className="calendar-input" type="date" value={visitDate} required min={!rule ? new Date(new Date(`${today}T12:00:00Z`).getTime() + 86_400_000).toISOString().slice(0, 10) : undefined} readOnly={!!rule} onChange={(e) => setVisitDate(e.target.value)} /></label><label className="calendar-field">Status<select className="calendar-input" value={status} onChange={(e) => setStatus(e.target.value as "abe" | "fec")}><option value="abe">Aberta</option><option value="fec">Fechada</option></select></label></div>
        {rule?.status === "lot" && status === "fec" && <p className="calendar-catalog-note" role="status">Esta data estava lotada. As vendas ficam fechadas; selecione Aberta para reabrir.</p>}
        <CalendarProductFields products={products} passportIds={passportIds} addonIds={addonIds} onPassportsChange={setPassportIds} onAddonsChange={setAddonIds} isEvent={false} />
        <label className="calendar-field calendar-validity-field">Validade dos vouchers<select className="calendar-input" value={validity} onChange={(e) => setValidity(e.target.value as CalendarValidity)}>{Object.entries(calendarValidityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <p className="calendar-muted">{validity === "day" || validity === "1d" ? "Quem não usar na data da visita perde o ingresso." : "O prazo começa na data da visita e inclui esse dia."} Alterações valem para próximas compras; vouchers já vendidos mantêm suas condições.</p>
        <p className="calendar-catalog-note">Os preços de site e bilheteria vêm do catálogo. <Link href="/painel/passaportes-itens">Gerenciar passaportes e itens</Link></p>
        {error && <p role="alert" className="calendar-error">{error}</p>}
        <div className="calendar-actions"><Link className="calendar-button-secondary" href={returnHref}>Cancelar</Link><button type="submit" className="calendar-button" disabled={pending}>{pending ? "Salvando…" : rule ? "Salvar alterações" : "Abrir data"}</button></div>
      </fieldset>
    </form>
  </div>;
}
