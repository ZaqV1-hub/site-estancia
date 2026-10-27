"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarRescheduleDialog } from "@/components/calendar-reschedule-dialog";
import type { OpsAuditLogItem } from "@/lib/ops-audit-history";
export function CalendarPurchaseActions({ purchaseId, voucherIds, history = false }: { purchaseId: number; voucherIds: number[]; history?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<OpsAuditLogItem[] | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function loadHistory() {
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/ops/audit-logs?purchaseId=${purchaseId}&limit=100`);
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body.error?.message || "Não foi possível carregar o histórico.");
      setItems(body.data.items);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Falha ao carregar histórico."); }
    finally { setLoading(false); }
  }
  return <div className="grid gap-3 text-sm">
    <button type="button" disabled={!voucherIds.length} onClick={() => setOpen(true)} className="rounded-lg border border-[var(--panel-border)] px-3 py-2 disabled:opacity-50">{history ? "Mover vouchers disponíveis" : "Editar data / validade"}</button>
    {history ? <><button type="button" disabled={loading} onClick={loadHistory} className="rounded-lg border border-[var(--panel-border)] px-3 py-2">{loading ? "Carregando…" : "Ver histórico da compra"}</button><a href={`/api/painel/compras/${purchaseId}/resumo`} target="_blank" rel="noreferrer" className="underline">Resumo da compra em PDF</a></> : null}
    {error ? <p role="alert">{error}</p> : null}
    {items ? <div><h3 className="font-semibold">Histórico da compra</h3>{items.length ? <ol className="mt-2 grid gap-3">{items.map((item) => <li key={item.id}><p>{item.description}</p><p>{item.reason}</p><small>{item.userName || "Operador não informado"} · {item.createdAt ? new Date(item.createdAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "Data não informada"}</small></li>)}</ol> : <p>Nenhum registro.</p>}</div> : null}
    {open ? <CalendarRescheduleDialog purchaseIds={[purchaseId]} voucherIds={voucherIds} onClose={() => setOpen(false)} onSuccess={() => { router.refresh(); if (items) void loadHistory(); }} /> : null}
  </div>;
}
