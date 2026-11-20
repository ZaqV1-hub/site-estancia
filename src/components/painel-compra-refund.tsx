"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PainelModal } from "@/components/painel-modal";

export type RefundState = "pending" | "uncertain" | "refunded" | "denied" | null;

const stateMessages = {
  pending: "Estorno pendente de confirmação. Consulte o resultado antes de qualquer outra ação.",
  uncertain: "Não foi possível confirmar o resultado. Consulte o estorno; nenhuma nova solicitação será enviada.",
  refunded: "Estorno confirmado.",
  denied: "Estorno negado. Verifique o motivo antes de prosseguir.",
};

export function PainelCompraRefund({ purchaseId, totalValue, refundState = null, reconciliationPending = false }: {
  purchaseId: number;
  totalValue: string;
  refundState?: RefundState;
  reconciliationPending?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<RefundState>(refundState);
  const [message, setMessage] = useState("");
  const [needsReconciliation, setNeedsReconciliation] = useState(reconciliationPending);
  const inFlight = useRef(false);
  const submitted = useRef(refundState !== null);

  async function requestRefund(consult: boolean) {
    if (inFlight.current || (!consult && (submitted.current || !reason.trim()))) return;
    inFlight.current = true;
    submitted.current = true;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/painel/compras/estorno", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(consult ? { purchaseId, consult: true } : { purchaseId, reason: reason.trim() }),
      });
      const body = await response.json();
      if (!response.ok) {
        if (body?.noRequest === true && state !== "refunded") {
          setState(null);
          setNeedsReconciliation(false);
          submitted.current = false;
        } else if (state !== "refunded") setState("uncertain");
        setMessage(typeof body?.message === "string" ? body.message : typeof body?.error?.message === "string" ? body.error.message : "Não foi possível consultar o resultado do estorno.");
      } else if (["confirmed", "pending", "denied"].includes(body?.status)) {
        setState(body.status === "confirmed" ? "refunded" : body.status);
        setNeedsReconciliation(body.reconciliationPending === true);
        setMessage(typeof body.message === "string" ? body.message : "");
        router.refresh();
      } else {
        if (state !== "refunded") setState("uncertain");
        setMessage("Não foi possível consultar o resultado do estorno.");
      }
    } catch {
      if (state !== "refunded") setState("uncertain");
      setMessage("Falha de comunicação. Consulte o estorno para verificar o resultado.");
    } finally {
      setOpen(false);
      setBusy(false);
      inFlight.current = false;
    }
  }

  return <div className="calendar-page">
    {state ? <div role={state === "denied" || state === "uncertain" ? "alert" : "status"} className={state === "refunded" ? "calendar-success" : "calendar-hint"}>
      <p>{stateMessages[state]}</p>
      {state === "refunded" && needsReconciliation ? <p>O estorno foi confirmado, mas o processamento da compra ainda tem pendências. Consulte para acompanhar a conclusão.</p> : null}
      {message ? <p>{message}</p> : null}
    </div> : <div><button type="button" className="calendar-button-secondary" onClick={() => setOpen(true)}>Estornar valor total</button></div>}
    {!state && message ? <p role="alert">{message}</p> : null}
    {state === "pending" || state === "uncertain" || needsReconciliation ? <div><button type="button" className="calendar-button-secondary" disabled={busy} onClick={() => void requestRefund(true)}>{busy ? "Consultando…" : "Consultar estorno"}</button></div> : null}
    <PainelModal open={open} title="Confirmar estorno total" onClose={() => { if (!inFlight.current) setOpen(false); }}>
      <form className="calendar-page" aria-busy={busy} onSubmit={event => { event.preventDefault(); void requestRefund(false); }}>
        <p>Solicitar o estorno integral de <strong>R$ {totalValue}</strong> da compra <strong>#{purchaseId}</strong>?</p>
        <p>Confirme o pedido do comprador. Após a confirmação da Cielo, os ingressos serão invalidados. Para cancelamento por risco de fraude, use o portal da Cielo.</p>
        <label className="calendar-field">Motivo do estorno
          <textarea className="calendar-input" required maxLength={500} value={reason} disabled={busy} onChange={event => setReason(event.target.value)} />
        </label>
        <div className="calendar-inline-actions">
          <button type="button" className="calendar-button-secondary" disabled={busy} onClick={() => setOpen(false)}>Cancelar</button>
          <button type="submit" className="calendar-button" disabled={busy || !reason.trim()}>{busy ? "Solicitando…" : "Confirmar estorno total"}</button>
        </div>
      </form>
    </PainelModal>
  </div>;
}
