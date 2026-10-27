"use client";
import { useEffect, useRef, useState } from "react";
import { calendarValidityLabels, type CalendarRule, type CalendarValidity, type MoveCalendarResult } from "@/lib/operational-calendar-contracts";
export function CalendarRescheduleDialog({ purchaseIds, voucherIds, peopleCount, totalValue, onClose, onSuccess }: { purchaseIds: number[]; voucherIds?: number[]; peopleCount?: number; totalValue?: string; onClose: () => void; onSuccess: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [dates, setDates] = useState<CalendarRule[]>([]);
  const [targetDate, setTargetDate] = useState("");
  const [keepVisitDate, setKeepVisitDate] = useState(false);
  const [validityMode, setValidityMode] = useState<"keep" | "destination" | "custom">("destination");
  const [validity, setValidity] = useState<CalendarValidity>("day");
  const [reason, setReason] = useState("Chuva");
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [confirmUnavailable, setConfirmUnavailable] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<MoveCalendarResult | null>(null);
  useEffect(() => {
    dialog.current?.showModal();
    const controller = new AbortController();
    fetch("/api/painel/calendario/remanejar", { signal: controller.signal }).then(async (response) => {
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body.error?.message || "Não foi possível carregar as datas.");
      setDates(body.data); setTargetDate(body.data[0]?.date ?? "");
    }).catch((failure) => { if (failure.name !== "AbortError") setError(failure.message); }).finally(() => setLoading(false));
    return () => controller.abort();
  }, []);
  async function apply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/painel/calendario/remanejar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ purchaseIds, voucherIds, keepVisitDate, targetDate, validityMode, validity, reason, notifyEmail, confirmUnavailable }) });
      const body = await response.json();
      if (!response.ok || !body.ok) { setWarnings(body.error?.warnings ?? []); throw new Error(body.error?.message || "Não foi possível remanejar."); }
      setResult(body.data); onSuccess();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Falha ao remanejar."); }
    finally { setBusy(false); }
  }
  return <dialog ref={dialog} aria-labelledby="reschedule-title" className="calendar-dialog calendar-reschedule-dialog" onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}>
    <div className="calendar-dialog-content">
    <h2 id="reschedule-title">Mover ou editar vouchers</h2>
    <div className="calendar-reschedule-summary">{purchaseIds.length} compra(s){voucherIds ? ` · ${voucherIds.length} voucher(s)` : ""}{peopleCount !== undefined ? ` · ${peopleCount} pessoa(s)` : ""}{totalValue !== undefined ? ` · R$ ${totalValue.replace(/^R\$\s*/, "")}` : ""}</div>
    {result ? <div className="calendar-reschedule-result" role="status"><p>{result.moved} voucher(s) atualizado(s).</p><p>E-mail: {result.email.sent} enviado(s), {result.email.failed} falha(s), {result.email.skipped} sem envio confirmado.</p>{result.email.failed > 0 || result.email.skipped > 0 ? <p>A alteração foi salva. Confira o envio antes de avisar novamente.</p> : null}<button type="button" onClick={onClose} className="calendar-button-secondary">Concluir</button></div> : <form className="calendar-reschedule-form" onSubmit={apply}>
      <label className="calendar-checkbox"><input type="checkbox" checked={keepVisitDate} disabled={busy} onChange={(event) => { setKeepVisitDate(event.target.checked); setValidityMode(event.target.checked ? "custom" : "destination"); setWarnings([]); setConfirmUnavailable(false); setError(""); }} />Alterar somente a validade, mantendo a visita</label>
      {keepVisitDate ? <p className="calendar-hint">A data de cada voucher será mantida, inclusive em visitas passadas ou fechadas. O prazo conta da data de visita atual de cada voucher.</p> : <label className="calendar-field">Nova data da visita<select required disabled={loading || busy} value={targetDate} onChange={(event) => { setTargetDate(event.target.value); setWarnings([]); setConfirmUnavailable(false); }} className="calendar-input"><option value="">{loading ? "Carregando…" : "Selecione uma data"}</option>{dates.map((date) => <option key={date.date} value={date.date}>{date.date.split("-").reverse().join("/")} · {date.eventTitle || "Day use"} · {calendarValidityLabels[date.validity]}</option>)}</select></label>}
      <label className="calendar-field">Validade<select disabled={busy} value={validityMode} onChange={(event) => setValidityMode(event.target.value as typeof validityMode)} className="calendar-input"><option value="destination">{keepVisitDate ? "Seguir a regra da visita atual de cada voucher" : "Seguir a regra da data de destino"}</option><option value="keep">Manter a validade atual de cada voucher</option><option value="custom">Definir validade para os vouchers selecionados</option></select></label>
      {validityMode === "custom" ? <label className="calendar-field">Prazo<select disabled={busy} value={validity} onChange={(event) => setValidity(event.target.value as CalendarValidity)} className="calendar-input">{Object.entries(calendarValidityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label> : null}
      <label className="calendar-field">Motivo<select value={reason} onChange={(event) => setReason(event.target.value)} disabled={busy} className="calendar-input">{["Chuva", "Evento cancelado", "Pedido do cliente", "Outro"].map((value) => <option key={value}>{value}</option>)}</select></label>
      <label className="calendar-checkbox"><input type="checkbox" checked={notifyEmail} disabled={busy} onChange={(event) => setNotifyEmail(event.target.checked)} />Avisar o cliente por e-mail</label>
      {warnings.length ? <div role="alert" className="calendar-notice calendar-notice-warning"><ul>{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul><label className="calendar-checkbox"><input type="checkbox" checked={confirmUnavailable} onChange={(event) => setConfirmUnavailable(event.target.checked)} />Confirmo os itens preservados no destino.</label></div> : null}
      {error ? <p className="calendar-error" role="alert">{error}</p> : null}
      {!keepVisitDate && !loading && dates.length === 0 ? <p>Nenhuma data futura aberta disponível.</p> : null}
      <div className="calendar-actions"><button type="button" disabled={busy} onClick={onClose} className="calendar-button-secondary">Cancelar</button><button type="submit" disabled={busy || (!keepVisitDate && (loading || !targetDate)) || (warnings.length > 0 && !confirmUnavailable)} className="calendar-button">{busy ? "Aplicando…" : "Aplicar"}</button></div>
    </form>}
    </div>
  </dialog>;
}
