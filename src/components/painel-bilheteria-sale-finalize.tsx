"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  PAINEL_BILHETERIA_SALE_DRAFT_KEY,
  type PainelBilheteriaSaleDraft,
} from "@/lib/painel-bilheteria-sales";

type PaymentRow = {
  id: string;
  method: string;
  value: string;
};

type SaleResponse = {
  ok: boolean;
  data?: {
    purchaseId: number;
    voucherIds: number[];
    message: string;
  };
  error?: {
    message?: string;
  };
};

type WhatsappResponse = {
  ok: boolean;
  data?: {
    ok?: boolean;
    message?: string;
  };
  error?: {
    message?: string;
  };
};

const paymentOptions = [
  { value: "dinhe", label: "Dinheiro" },
  { value: "debit", label: "Débito" },
  { value: "credi", label: "Crédito" },
  { value: "pix", label: "Pix" },
  { value: "chequ", label: "Cheque" },
  { value: "tranb", label: "Trans. bancária" },
];

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function parseMoney(value: string | null | undefined) {
  const raw = String(value ?? "").trim().replace(/^R\$\s*/i, "");
  const normalized =
    raw.includes(",") && raw.includes(".")
      ? raw.replace(/\./g, "").replace(",", ".")
      : raw.includes(",")
        ? raw.replace(",", ".")
        : raw;
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : 0;
}

function createRow(id: string, value: string, method = ""): PaymentRow {
  return { id, method, value };
}

function createId() {
  return `pg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function readSaleDraftFromSessionStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = sessionStorage.getItem(PAINEL_BILHETERIA_SALE_DRAFT_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as PainelBilheteriaSaleDraft;
  } catch {
    return null;
  }
}

export function PainelBilheteriaSaleFinalize() {
  const router = useRouter();
  const [draft] = useState<PainelBilheteriaSaleDraft | null>(() =>
    readSaleDraftFromSessionStorage(),
  );
  const [paymentRows, setPaymentRows] = useState<PaymentRow[]>(() => {
    const initialDraft = readSaleDraftFromSessionStorage();
    return initialDraft ? [createRow("0", initialDraft.totalValue, "")] : [];
  });
  const [cashReceived, setCashReceived] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    purchaseId: number;
    voucherIds: number[];
    message: string;
  } | null>(null);
  const [whatsOpen, setWhatsOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [whatsSubmitting, setWhatsSubmitting] = useState(false);
  const [whatsMessage, setWhatsMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!draft) {
      router.replace("/painel/bilheteria/vendas");
    }
  }, [draft, router]);

  const totalPurchase = useMemo(() => parseMoney(draft?.totalValue), [draft]);
  const totalInformed = useMemo(
    () => paymentRows.reduce((total, payment) => total + parseMoney(payment.value), 0),
    [paymentRows],
  );
  const difference = Math.round((totalInformed - totalPurchase) * 100) / 100;
  const showCashReceived = paymentRows.some((payment) => payment.method === "dinhe");
  const cashChange = Math.max(parseMoney(cashReceived) - totalPurchase, 0);

  function updatePaymentRow(id: string, patch: Partial<PaymentRow>) {
    setPaymentRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  }

  function addPaymentRow() {
    setPaymentRows((current) => [...current, createRow(createId(), "", "")]);
  }

  function removePaymentRow(id: string) {
    setPaymentRows((current) => current.filter((row) => row.id !== id));
  }

  async function handleConfirmPayment() {
    if (!draft) {
      return;
    }

    const normalizedPayments = paymentRows
      .map((payment) => ({
        method: payment.method,
        value: payment.value,
      }))
      .filter((payment) => payment.method && parseMoney(payment.value) > 0);

    if (normalizedPayments.length === 0) {
      setErrorMessage("Informe ao menos uma forma de pagamento.");
      return;
    }

    if (Math.abs(difference) > 0.01) {
      setErrorMessage("O total informado precisa bater com o total da compra.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/painel/bilheteria/sales", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          agendaId: draft.agendaId,
          cpf: draft.cpf,
          items: draft.items.map((item) => ({
            type: item.type,
            quantity: item.quantity,
            discountId: item.discountId ?? undefined,
          })),
          courtesies: draft.courtesies.map((courtesy) => ({
            authorId: courtesy.authorId,
            quantity: courtesy.quantity,
            identification: courtesy.identification,
            note: courtesy.note,
          })),
          payments: normalizedPayments,
          reason: draft.reason,
          idempotencyKey: createId(),
        }),
      });
      const payload = (await response.json().catch(() => null)) as SaleResponse | null;

      if (!response.ok || !payload?.ok || !payload.data) {
        setErrorMessage(
          payload?.error?.message || "Nao foi possivel confirmar a venda agora.",
        );
        return;
      }

      setSuccess({
        purchaseId: payload.data.purchaseId,
        voucherIds: payload.data.voucherIds,
        message: payload.data.message,
      });
      sessionStorage.removeItem(PAINEL_BILHETERIA_SALE_DRAFT_KEY);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSendWhatsapp() {
    if (!success) {
      return;
    }

    setWhatsSubmitting(true);
    setWhatsMessage(null);

    try {
      const response = await fetch(
        `/api/painel/bilheteria/purchases/${success.purchaseId}/whatsapp`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            phoneNumber,
            voucherIds: success.voucherIds,
          }),
        },
      );
      const payload =
        (await response.json().catch(() => null)) as WhatsappResponse | null;

      if (!response.ok || !payload?.ok) {
        setWhatsMessage(
          payload?.error?.message ||
            "Nao foi possivel enviar os ingressos por WhatsApp.",
        );
        return;
      }

      setWhatsMessage(
        payload.data?.message || "Ingressos enviados por WhatsApp com sucesso.",
      );
    } finally {
      setWhatsSubmitting(false);
    }
  }

  if (!draft) {
    return null;
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(380px,520px)] xl:items-start">
      <article className="rounded-[6px] border border-[#d3dde6] bg-white p-6 shadow-[0_8px_22px_rgba(18,73,127,0.08)]">
        <h2 className="legacy-condensed text-3xl text-[#2d4f73]">Resumo da Compra</h2>
        <p className="mt-3 text-sm text-[#55708b]">Realizada em: {draft.agendaLabel}</p>
        <table className="mt-5 w-full text-sm">
          <tbody className="divide-y divide-[#e6edf3]">
            {draft.items.map((item) => (
              <tr key={`${item.type}-${item.discountId ?? "none"}`}>
                <td className="py-3 text-[#33506b]">
                  {item.label} x{item.quantity}
                </td>
                <td className="py-3 text-right font-semibold text-[#184b78]">
                  {formatMoney(parseMoney(item.totalValue))}
                </td>
              </tr>
            ))}
            {draft.courtesies.map((courtesy) => (
              <tr key={`${courtesy.authorId}-${courtesy.identification}-${courtesy.note}`}>
                <td className="py-3 text-[#33506b]">
                  Cortesia {courtesy.authorName} x{courtesy.quantity}
                </td>
                <td className="py-3 text-right font-semibold text-[#184b78]">
                  {formatMoney(0)}
                </td>
              </tr>
            ))}
            <tr>
              <td className="pt-4 text-base font-semibold text-[#2d4f73]">TOTAL</td>
              <td className="pt-4 text-right text-xl font-semibold text-[#2d4f73]">
                {formatMoney(totalPurchase)}
              </td>
            </tr>
          </tbody>
        </table>
      </article>

      <article className="rounded-[6px] border border-[#d3dde6] bg-white p-6 shadow-[0_8px_22px_rgba(18,73,127,0.08)]">
        {!success ? (
          <>
            <h2 className="legacy-condensed text-3xl text-[#2d4f73]">Pagamento</h2>

            <button
              type="button"
              onClick={addPaymentRow}
              className="mt-4 rounded-[4px] border border-[#b8d0e6] px-4 py-2 text-sm font-bold text-[#2b6cb0]"
            >
              + outra forma
            </button>

            <div className="mt-4 space-y-3">
              {paymentRows.map((payment, index) => (
                <div
                  key={payment.id}
                  className="grid gap-3 md:grid-cols-[minmax(0,1fr)_150px_auto]"
                >
                  <select
                    value={payment.method}
                    onChange={(event) =>
                      updatePaymentRow(payment.id, { method: event.target.value })
                    }
                    className="min-h-[44px] border border-[#b8d0e6] px-4 py-2.5 text-sm text-[#1f3650]"
                  >
                    <option value="">Selecione</option>
                    {paymentOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <input
                    value={payment.value}
                    onChange={(event) =>
                      updatePaymentRow(payment.id, { value: event.target.value })
                    }
                    readOnly={index === 0 && paymentRows.length === 1}
                    className="min-h-[44px] border border-[#b8d0e6] px-4 py-2.5 text-sm text-[#1f3650]"
                  />
                  {paymentRows.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removePaymentRow(payment.id)}
                      className="rounded-[4px] border border-[#e2c5c5] px-4 py-3 text-sm font-bold text-[#a14f44]"
                    >
                      Remover
                    </button>
                  ) : (
                    <div />
                  )}
                </div>
              ))}
            </div>

            {showCashReceived ? (
              <div className="mt-4 grid gap-2 border border-[#d7e3f0] bg-[#f8fbfd] p-4">
                <label className="grid gap-2 text-sm font-semibold text-[#46627f]">
                  Valor entregue
                  <input
                    value={cashReceived}
                    onChange={(event) => setCashReceived(event.target.value)}
                    className="min-h-[44px] border border-[#b8d0e6] px-4 py-2.5 text-sm text-[#1f3650]"
                  />
                </label>
                <div className="text-sm text-[#46627f]">
                  Troco: <strong>{formatMoney(cashChange)}</strong>
                </div>
              </div>
            ) : null}

            <div className="mt-5 border border-[#d7e3f0] bg-[#f8fbfd] px-4 py-4 text-sm text-[#46627f]">
              <div>
                Total informado: <strong>{formatMoney(totalInformed)}</strong>
              </div>
              <div className="mt-1">
                Total da compra: <strong>{formatMoney(totalPurchase)}</strong>
              </div>
            </div>

            {errorMessage ? (
              <div className="mt-4 border border-[#f2d6d6] bg-[#fff1f1] px-4 py-3 text-sm text-[#8b2d2d]">
                {errorMessage}
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <Link
                href="/painel/bilheteria/vendas"
                className="rounded-[4px] border border-[#c9d8e3] px-5 py-3 text-sm font-bold text-[#205a7f]"
              >
                Voltar
              </Link>
              <button
                type="button"
                onClick={() => void handleConfirmPayment()}
                disabled={submitting}
                className="rounded-[4px] bg-[linear-gradient(180deg,#3e9ce1_0%,#245f88_100%)] px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
              >
                {submitting ? "Confirmando..." : "Confirmar Pagamento"}
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="legacy-condensed text-3xl text-[#2d4f73]">Pagamento Concluído</h2>
            <p className="mt-4 text-sm text-[#55708b]">
              Compra nº <strong>{success.purchaseId}</strong>
            </p>
            <p className="mt-2 text-sm text-[#55708b]">{success.message}</p>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={`/painel/bilheteria/compras/${success.purchaseId}/imprimir`}
                target="_blank"
                rel="noreferrer"
                className="rounded-[4px] bg-[linear-gradient(180deg,#3e9ce1_0%,#245f88_100%)] px-5 py-3 text-sm font-bold text-white"
              >
                Imprimir QR-Codes
              </a>
              <button
                type="button"
                onClick={() => setWhatsOpen(true)}
                className="rounded-[4px] bg-[#25D366] px-5 py-3 text-sm font-bold text-white"
              >
                Enviar no WhatsApp
              </button>
              <Link
                href="/painel/bilheteria/vendas"
                className="rounded-[4px] border border-[#c9d8e3] px-5 py-3 text-sm font-bold text-[#205a7f]"
              >
                Nova Venda
              </Link>
            </div>
          </>
        )}
      </article>

      {whatsOpen && success ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b223580] p-4">
          <div className="w-full max-w-md rounded-[24px] bg-white p-6 shadow-[0_24px_60px_rgba(16,45,70,0.24)]">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xl font-semibold text-[#2d4f73]">
                Enviar ingressos por WhatsApp
              </h3>
              <button
                type="button"
                onClick={() => setWhatsOpen(false)}
                className="rounded-full border border-[#d7e3f0] px-3 py-1 text-sm font-semibold text-[#46627f]"
              >
                Fechar
              </button>
            </div>
            <label className="mt-5 grid gap-2 text-sm font-semibold text-[#46627f]">
              Telefone com DDD
              <input
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
                placeholder="(DDD) 9xxxx-xxxx"
                className="rounded-[12px] border border-[#b8d0e6] px-4 py-3 text-sm text-[#1f3650]"
              />
            </label>

            {whatsMessage ? (
              <div className="mt-4 rounded-[14px] border border-[#d7e3f0] bg-[#f8fbfd] px-4 py-3 text-sm text-[#46627f]">
                {whatsMessage}
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => void handleSendWhatsapp()}
              disabled={whatsSubmitting}
              className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-[#25D366] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {whatsSubmitting ? "Enviando..." : "Enviar"}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
