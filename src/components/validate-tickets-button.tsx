"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { PainelConfirmationModal } from "@/components/painel-confirmation-modal";

export function ValidateTicketsButton({ voucherIds, label }: {
  voucherIds: number[];
  label: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const submitting = useRef(false);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ message: string; error: boolean } | null>(null);
  const [validatedIds, setValidatedIds] = useState<number[]>([]);
  const remainingIds = [...new Set(voucherIds)].filter((id) => !validatedIds.includes(id));

  async function validate() {
    if (submitting.current || !remainingIds.length) return;
    submitting.current = true;

    setPending(true);
    setResult(null);
    try {
      const response = await fetch("/api/painel/bilheteria/vouchers/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voucherIds: remainingIds }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        setResult({
          message: payload.error?.message || "Não foi possível validar os ingressos.",
          error: true,
        });
        return;
      }

      setValidatedIds((previous) => [...previous, ...payload.data.affectedVoucherIds]);
      setResult({
        message: [payload.data.message, ...payload.data.warnings].join(" "),
        error: false,
      });
      setOpen(false);
      router.refresh();
    } catch {
      setResult({ message: "Não foi possível confirmar a validação. Atualize a página para conferir os ingressos.", error: true });
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  return (
    <div>
      <button className="calendar-button-secondary calendar-button-small" type="button" disabled={pending || !remainingIds.length} onClick={() => { setResult(null); setOpen(true); }}>
        {pending ? "Validando…" : label}
      </button>
      <PainelConfirmationModal open={open} title="Validar ingressos em lote" pending={pending} disabled={!remainingIds.length} error={result?.error ? result.message : null} onClose={() => setOpen(false)} onConfirm={() => void validate()}>
        <p>Marcar {remainingIds.length} {remainingIds.length === 1 ? "ingresso como utilizado" : "ingressos como utilizados"}?</p>
        <p>A data de uso será hoje, no horário de São Paulo. Pagamentos e validade serão conferidos antes de salvar.</p>
      </PainelConfirmationModal>
      {result && !result.error && <p className={result.error ? "calendar-error" : "calendar-success"} role={result.error ? "alert" : "status"}>{result.message}</p>}
    </div>
  );
}
