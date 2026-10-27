"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarRescheduleDialog } from "@/components/calendar-reschedule-dialog";
import type { OpsAuditLogItem } from "@/lib/ops-audit-history";

export function CalendarPurchaseActions({ purchaseId, voucherIds, history = false, peopleCount, totalValue, historyVersion, label = "Editar data / validade" }: { purchaseId: number; voucherIds: number[]; history?: boolean; peopleCount?: number; totalValue?: string; historyVersion?: string; label?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<OpsAuditLogItem[] | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(history);
  const loadHistory = useCallback(() => {
    return fetch(`/api/ops/audit-logs?purchaseId=${purchaseId}&limit=100`).then(async (response) => {
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body.error?.message || "Não foi possível carregar o histórico.");
      setItems(body.data.items); setError("");
    }).catch((failure) => {
      setError(failure instanceof Error ? failure.message : "Falha ao carregar histórico.");
    }).finally(() => setLoading(false));
  }, [purchaseId]);
  useEffect(() => { if (history) void loadHistory(); }, [history, loadHistory, historyVersion]);
  if (history) return <div className="calendar-purchase-history">
    <h2>O que aconteceu com esta compra</h2>
    {loading ? <p className="calendar-hint" role="status">Carregando histórico…</p> : null}
    {error ? <p className="calendar-error" role="alert">{error}</p> : null}
    {items ? items.length ? <ol className="calendar-timeline">{items.map((item) => <li key={item.id}>
      <time dateTime={item.createdAt ?? undefined}>{item.createdAt ? new Date(item.createdAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "Data não informada"}</time>
      <div><p>{item.description}</p>{item.reason ? <p>{item.reason}</p> : null}<small>{item.userName || "Operador não informado"}</small></div>
    </li>)}</ol> : <p className="calendar-hint">Nenhum registro.</p> : null}
    <button type="button" disabled={loading} onClick={() => { setLoading(true); void loadHistory(); }} className="calendar-button-secondary">Atualizar histórico</button>
  </div>;
  return <div className="calendar-voucher-actions">
    <button type="button" disabled={!voucherIds.length} onClick={() => setOpen(true)} className={label === "Editar data / validade" ? "calendar-button-secondary" : "calendar-button"}>{label}</button>
    {open ? <CalendarRescheduleDialog purchaseIds={[purchaseId]} voucherIds={voucherIds} peopleCount={peopleCount} totalValue={totalValue} onClose={() => setOpen(false)} onSuccess={() => { router.refresh(); }} /> : null}
  </div>;
}
