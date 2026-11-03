"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ValidateTicketsButton({ voucherIds, label }: {
  voucherIds: number[];
  label: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ message: string; error: boolean } | null>(null);
  const [validatedIds, setValidatedIds] = useState<number[]>([]);
  const remainingIds = voucherIds.filter((id) => !validatedIds.includes(id));

  async function validate() {
    if (pending || !remainingIds.length) return;
    const tickets = remainingIds.length === 1 ? "1 ingresso" : `${remainingIds.length} ingressos`;
    if (!window.confirm(`Marcar ${tickets} como utilizados?`)) return;

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
      router.refresh();
    } catch {
      setResult({ message: "Não foi possível confirmar a validação. Atualize a página para conferir os ingressos.", error: true });
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <button className="calendar-button-secondary calendar-button-small" type="button" disabled={pending || !remainingIds.length} onClick={validate}>
        {pending ? "Validando…" : label}
      </button>
      {result && <p className={result.error ? "calendar-error" : "calendar-success"} role={result.error ? "alert" : "status"}>{result.message}</p>}
    </div>
  );
}
