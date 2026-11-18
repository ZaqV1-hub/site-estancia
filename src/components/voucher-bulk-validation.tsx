"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PainelConfirmationModal } from "@/components/painel-confirmation-modal";

export function VoucherBulkValidation({ voucherIds, label = "Validar selecionados", onSuccess }: { voucherIds: number[]; label?: string; onSuccess?: () => void }) {
  const router = useRouter();
  const submitting = useRef(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const ids = [...new Set(voucherIds)];
  async function validate() {
    if (submitting.current || !ids.length) return;
    submitting.current = true;
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/painel/bilheteria/vouchers/validate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ voucherIds: ids }) });
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body.error?.message || "Não foi possível validar os ingressos. Nenhuma alteração foi aplicada ao lote.");
      setMessage([body.data.message, ...(body.data.warnings ?? [])].join(" "));
      setOpen(false); onSuccess?.(); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível validar os ingressos."); }
    finally { submitting.current = false; setBusy(false); }
  }
  return <div className="calendar-page">
    <button className="calendar-button-secondary calendar-button-small" type="button" disabled={!ids.length || busy} onClick={() => { setError(""); setOpen(true); }}>{label} ({ids.length})</button>
    {message && <p className="calendar-hint" role="status">{message}</p>}
    <PainelConfirmationModal open={open} title="Validar ingressos em lote" pending={busy} disabled={!ids.length} error={error} onClose={() => setOpen(false)} onConfirm={() => void validate()}>
      <p>Confirmar o uso de {ids.length} ingresso(s)?</p>
      <p>A data de uso será hoje, no horário de São Paulo. Ingressos já usados serão ignorados. Pagamentos e validade serão conferidos antes de salvar.</p>
    </PainelConfirmationModal>
  </div>;
}
