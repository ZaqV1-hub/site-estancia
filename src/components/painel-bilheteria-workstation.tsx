"use client";

import Link from "next/link";
import { useState } from "react";
import { legacyPanelContracts } from "@/lib/legacy-panel-contracts";
import { formatPainelBilheteriaDate } from "@/lib/painel-bilheteria-format";
import {
  type PainelBilheteriaCustomerLookupResult,
  type PainelBilheteriaTicketLookupResult,
  type PainelBilheteriaTripLookupResult,
} from "@/lib/painel-bilheteria-workstation";

type WorkstationMessage = {
  tone: "success" | "error" | "warning";
  text: string;
  warnings?: string[];
};

type VoucherValidationResponse = {
  ok: boolean;
  data?: {
    message?: string;
    warnings?: string[];
  };
  error?: {
    message?: string;
  };
};

type LookupResponse<T> = {
  ok: boolean;
  data?: T;
  error?: {
    message?: string;
  };
};

type PainelBilheteriaWorkstationProps = {
  actorName?: string | null;
  actorCpf?: string | null;
  isManager?: boolean;
  initialTicketLookupState?: {
    isOpen: boolean;
    lookup: string;
    result: PainelBilheteriaTicketLookupResult | null;
    error: string | null;
  };
};

function messageToneClasses(tone: WorkstationMessage["tone"]) {
  if (tone === "success") {
    return "border-[#b9dec6] bg-[#eefaf2] text-[#286445]";
  }

  if (tone === "warning") {
    return "border-[#f0d3a8] bg-[#fff6e3] text-[#8a6100]";
  }

  return "border-[#ebccd1] bg-[#f2dede] text-[#a94442]";
}

function actionButtonClasses(active = false) {
  return active
    ? "bg-white text-[#205a7f]"
    : "border border-white/50 bg-white/10 text-white hover:bg-white/20";
}

async function readJson<T>(response: Response) {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export function PainelBilheteriaWorkstation({
  actorName = null,
  actorCpf = null,
  isManager = false,
  initialTicketLookupState,
}: PainelBilheteriaWorkstationProps) {
  const contract = legacyPanelContracts.bilheteriaIndex;
  const [voucherNumber, setVoucherNumber] = useState("");
  const [customerDocument, setCustomerDocument] = useState("");
  const [tripCode, setTripCode] = useState("");
  const [ticketLookup, setTicketLookup] = useState(initialTicketLookupState?.lookup ?? "");
  const [ticketLookupOpen, setTicketLookupOpen] = useState(
    initialTicketLookupState?.isOpen ?? false,
  );
  const [ticketLookupResult, setTicketLookupResult] =
    useState<PainelBilheteriaTicketLookupResult | null>(
      initialTicketLookupState?.result ?? null,
    );
  const [ticketLookupError, setTicketLookupError] = useState<string | null>(
    initialTicketLookupState?.error ?? null,
  );
  const [ticketWhatsappPhone, setTicketWhatsappPhone] = useState("");
  const [ticketWhatsappError, setTicketWhatsappError] = useState<string | null>(null);
  const [ticketWhatsappSuccess, setTicketWhatsappSuccess] = useState<string | null>(
    null,
  );
  const [sendingTicketWhatsapp, setSendingTicketWhatsapp] = useState(false);
  const [message, setMessage] = useState<WorkstationMessage | null>(null);
  const [customerLookup, setCustomerLookup] =
    useState<PainelBilheteriaCustomerLookupResult | null>(null);
  const [tripLookup, setTripLookup] =
    useState<PainelBilheteriaTripLookupResult | null>(null);
  const [selectedCustomerVouchers, setSelectedCustomerVouchers] = useState<
    Record<number, number[]>
  >({});
  const [purchaseWhatsappPhones, setPurchaseWhatsappPhones] = useState<
    Record<number, string>
  >({});
  const [runningActionKey, setRunningActionKey] = useState<string | null>(null);
  const [submittingVoucher, setSubmittingVoucher] = useState(false);
  const [submittingCustomer, setSubmittingCustomer] = useState(false);
  const [submittingTrip, setSubmittingTrip] = useState(false);
  const hasServerDrivenTicketLookup = Boolean(initialTicketLookupState?.isOpen);

  function normalizeVoucherIds(voucherIds: number[]) {
    return [...new Set(voucherIds.filter((voucherId) => voucherId > 0))];
  }

  function updateSelectedPurchaseVouchers(purchaseId: number, voucherIds: number[]) {
    setSelectedCustomerVouchers((current) => ({
      ...current,
      [purchaseId]: normalizeVoucherIds(voucherIds),
    }));
  }

  function toggleSelectedPurchaseVoucher(purchaseId: number, voucherId: number) {
    setSelectedCustomerVouchers((current) => {
      const selected = current[purchaseId] ?? [];
      const next = selected.includes(voucherId)
        ? selected.filter((item) => item !== voucherId)
        : [...selected, voucherId];

      return {
        ...current,
        [purchaseId]: normalizeVoucherIds(next),
      };
    });
  }

  function isActionRunning(actionKey: string) {
    return runningActionKey === actionKey;
  }

  async function loadCustomerLookup(document: string) {
    const response = await fetch("/api/painel/bilheteria/customer-lookup", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        document,
      }),
    });
    const payload =
      await readJson<LookupResponse<PainelBilheteriaCustomerLookupResult>>(response);

    if (!response.ok || !payload?.ok || !payload.data) {
      setMessage({
        tone: "error",
        text: payload?.error?.message || "Nao foi possivel consultar este cliente.",
      });
      setCustomerLookup(null);
      return null;
    }

    const data = payload.data;
    setCustomerLookup(data);
    setSelectedCustomerVouchers(
      Object.fromEntries(data.purchases.map((purchase) => [purchase.purchaseId, []])),
    );
    setMessage({
      tone: data.purchases.length > 0 ? "success" : "warning",
      text:
        data.purchases.length > 0
          ? `${data.purchases.length} compra(s) encontrada(s).`
          : "Nenhuma compra concluida encontrada para este cliente.",
    });
    return data;
  }

  async function loadTripLookup(code: string) {
    const response = await fetch("/api/painel/bilheteria/trip-lookup", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        code,
      }),
    });
    const payload = await readJson<LookupResponse<PainelBilheteriaTripLookupResult>>(response);

    if (!response.ok || !payload?.ok || !payload.data) {
      setMessage({
        tone: "error",
        text: payload?.error?.message || "Nao foi possivel consultar este passeio.",
      });
      setTripLookup(null);
      return null;
    }

    const data = payload.data;
    setTripLookup(data);
    setMessage({
      tone: data.items.length > 0 ? "success" : "warning",
      text:
        data.items.length > 0
          ? `${data.items.length} voucher(s) encontrado(s) para o passeio.`
          : "Nenhum voucher ativo encontrado para este passeio.",
    });
    return data;
  }

  async function runVoucherMutation(
    actionKey: string,
    endpoint: string,
    body: Record<string, unknown>,
  ) {
    setRunningActionKey(actionKey);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const payload = await readJson<VoucherValidationResponse>(response);

      if (!response.ok || !payload?.ok) {
        setMessage({
          tone: "error",
          text: payload?.error?.message || "Nao foi possivel concluir esta acao agora.",
        });
        return false;
      }

      setMessage({
        tone: payload.data?.warnings?.length ? "warning" : "success",
        text: payload.data?.message || "Operacao concluida com sucesso.",
        warnings: payload.data?.warnings || [],
      });
      return true;
    } finally {
      setRunningActionKey(null);
    }
  }

  async function refreshCustomerLookup() {
    if (!customerDocument.trim()) {
      return;
    }

    setSubmittingCustomer(true);

    try {
      await loadCustomerLookup(customerDocument);
    } finally {
      setSubmittingCustomer(false);
    }
  }

  async function refreshTripLookup() {
    if (!tripCode.trim()) {
      return;
    }

    setSubmittingTrip(true);

    try {
      await loadTripLookup(tripCode);
    } finally {
      setSubmittingTrip(false);
    }
  }

  async function handleValidateSelectedPurchase(purchaseId: number, voucherIds: number[]) {
    if (voucherIds.length === 0) {
      setMessage({
        tone: "warning",
        text: "Selecione ao menos um voucher desta compra.",
      });
      return;
    }

    const ok = await runVoucherMutation(
      `validate-purchase-${purchaseId}`,
      "/api/painel/bilheteria/vouchers/validate",
      { voucherIds },
    );

    if (ok) {
      await refreshCustomerLookup();
    }
  }

  async function handleUnvalidateSelectedPurchase(purchaseId: number, voucherIds: number[]) {
    if (voucherIds.length === 0) {
      setMessage({
        tone: "warning",
        text: "Selecione ao menos um voucher desta compra para desvalidar.",
      });
      return;
    }

    const ok = await runVoucherMutation(
      `unvalidate-purchase-${purchaseId}`,
      "/api/painel/bilheteria/vouchers/unvalidate",
      { voucherIds },
    );

    if (ok) {
      await refreshCustomerLookup();
    }
  }

  function handlePrintSelectedPurchase(voucherIds: number[]) {
    if (voucherIds.length === 0 || typeof window === "undefined") {
      setMessage({
        tone: "warning",
        text: "Selecione ao menos um voucher para imprimir.",
      });
      return;
    }

    for (const voucherId of voucherIds) {
      window.open(
        `/painel/bilheteria/vouchers/${voucherId}/imprimir`,
        "_blank",
        "noopener,noreferrer",
      );
    }

    setMessage({
      tone: "success",
      text: `${voucherIds.length} voucher(s) enviado(s) para impressao.`,
    });
  }

  async function handleSendSelectedPurchaseWhatsapp(
    purchaseId: number,
    voucherIds: number[],
  ) {
    if (voucherIds.length === 0) {
      setMessage({
        tone: "warning",
        text: "Selecione ao menos um voucher para enviar no WhatsApp.",
      });
      return;
    }

    const phoneNumber = (purchaseWhatsappPhones[purchaseId] ?? "").replace(/\D+/g, "");

    if (phoneNumber.length < 11) {
      setMessage({
        tone: "warning",
        text: "Informe telefone com DDD para enviar os vouchers selecionados.",
      });
      return;
    }

    setRunningActionKey(`whatsapp-purchase-${purchaseId}`);

    try {
      const response = await fetch(
        `/api/painel/bilheteria/purchases/${purchaseId}/whatsapp`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            phoneNumber,
            voucherIds,
          }),
        },
      );
      const payload = await readJson<{
        ok: boolean;
        data?: {
          message?: string;
        };
        error?: {
          message?: string;
        };
      }>(response);

      if (!response.ok || !payload?.ok) {
        setMessage({
          tone: "error",
          text:
            payload?.error?.message ||
            "Nao foi possivel enviar os vouchers selecionados por WhatsApp.",
        });
        return;
      }

      setMessage({
        tone: "success",
        text:
          payload.data?.message || "Vouchers selecionados enviados por WhatsApp.",
      });
    } finally {
      setRunningActionKey(null);
    }
  }

  async function handleValidateTripVoucher(voucherId: number) {
    const ok = await runVoucherMutation(
      `validate-trip-voucher-${voucherId}`,
      "/api/painel/bilheteria/vouchers/validate",
      { voucherIds: [voucherId] },
    );

    if (ok) {
      await refreshTripLookup();
    }
  }

  async function handleVoucherSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittingVoucher(true);
    setCustomerLookup(null);
    setTripLookup(null);

    try {
      const response = await fetch("/api/painel/bilheteria/vouchers/validate", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          voucherNumber,
          actor: {
            name: actorName,
            cpf: actorCpf,
          },
        }),
      });
      const payload = await readJson<VoucherValidationResponse>(response);

      if (!response.ok || !payload?.ok) {
        setMessage({
          tone: "error",
          text: payload?.error?.message || "Não foi possível validar o voucher agora.",
        });
        return;
      }

      setMessage({
        tone: payload.data?.warnings?.length ? "warning" : "success",
        text: payload.data?.message || "Voucher validado com sucesso.",
        warnings: payload.data?.warnings || [],
      });
      setVoucherNumber("");
    } finally {
      setSubmittingVoucher(false);
    }
  }

  async function handleCustomerSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittingCustomer(true);
    setTripLookup(null);

    try {
      await loadCustomerLookup(customerDocument);
    } finally {
      setSubmittingCustomer(false);
    }
  }

  async function handleTripSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittingTrip(true);
    setCustomerLookup(null);

    try {
      await loadTripLookup(tripCode);
    } finally {
      setSubmittingTrip(false);
    }
  }

  async function handleTripValidation() {
    if (!tripLookup?.schoolId || !tripLookup.agendaId) {
      return;
    }

    setSubmittingTrip(true);

    try {
      const response = await fetch("/api/painel/bilheteria/vouchers/validate", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          schoolId: tripLookup.schoolId,
          agendaId: tripLookup.agendaId,
          actor: {
            name: actorName,
            cpf: actorCpf,
          },
        }),
      });
      const payload = await readJson<VoucherValidationResponse>(response);

      if (!response.ok || !payload?.ok) {
        setMessage({
          tone: "error",
          text: payload?.error?.message || "Não foi possível validar o passeio agora.",
        });
        return;
      }

      setMessage({
        tone: payload.data?.warnings?.length ? "warning" : "success",
        text: payload.data?.message || "Passeio validado com sucesso.",
        warnings: payload.data?.warnings || [],
      });
      await refreshTripLookup();
    } finally {
      setSubmittingTrip(false);
    }
  }

  function handleTicketLookupSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const lookup = ticketLookup.trim();

    if (!lookup) {
      setTicketLookupError("Informe o ID do ingresso para consultar.");
      setTicketLookupResult(null);
      return;
    }
    const href = `/painel/bilheteria?ingresso=${encodeURIComponent(lookup)}`;

    if (typeof window !== "undefined") {
      window.location.assign(href);
    }
  }

  function handleOpenTicketLookup() {
    setTicketLookupOpen(true);
    setTicketLookupError(null);
    setTicketWhatsappError(null);
    setTicketWhatsappSuccess(null);
  }

  function handleCloseTicketLookup() {
    if (hasServerDrivenTicketLookup && typeof window !== "undefined") {
      window.location.assign("/painel/bilheteria");
      return;
    }

    setTicketLookupOpen(false);
    setTicketLookup("");
    setTicketLookupResult(null);
    setTicketLookupError(null);
    setTicketWhatsappPhone("");
    setTicketWhatsappError(null);
    setTicketWhatsappSuccess(null);
  }

  function handlePrintTicketLookup() {
    if (!ticketLookupResult || ticketLookupResult.used) {
      return;
    }

    if (typeof window !== "undefined") {
      window.open(
        `/painel/bilheteria/vouchers/${ticketLookupResult.voucherId}/imprimir`,
        "_blank",
        "noopener,noreferrer",
      );
    }
  }

  async function handleSendTicketLookupWhatsapp() {
    if (!ticketLookupResult?.purchaseId) {
      setTicketWhatsappError("Compra nao localizada para este ingresso.");
      setTicketWhatsappSuccess(null);
      return;
    }

    const phoneNumber = ticketWhatsappPhone.replace(/\D+/g, "");

    if (phoneNumber.length < 11) {
      setTicketWhatsappError("Informe o telefone com DDD para enviar no WhatsApp.");
      setTicketWhatsappSuccess(null);
      return;
    }

    setSendingTicketWhatsapp(true);
    setTicketWhatsappError(null);
    setTicketWhatsappSuccess(null);

    try {
      const response = await fetch(
        `/api/painel/bilheteria/vouchers/${ticketLookupResult.voucherId}/whatsapp`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            purchaseId: ticketLookupResult.purchaseId,
            phoneNumber,
            actor: {
              name: actorName,
              cpf: actorCpf,
            },
          }),
        },
      );
      const payload = await readJson<{
        ok: boolean;
        data?: {
          message?: string;
        };
        error?: {
          message?: string;
        };
      }>(response);

      if (!response.ok || !payload?.ok) {
        setTicketWhatsappError(
          payload?.error?.message || "Nao foi possivel enviar este ingresso agora.",
        );
        return;
      }

      setTicketWhatsappSuccess(
        payload.data?.message || "Ingresso enviado por WhatsApp com sucesso.",
      );
    } finally {
      setSendingTicketWhatsapp(false);
    }
  }

  return (
    <div className="grid gap-6">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="grid gap-5">
          {contract.forms?.map((form) => {
            const field = form.fields[0];
            const isVoucher = form.id === "voucher-validation";
            const isCustomer = form.id === "customer-validation";
            const value = isVoucher
              ? voucherNumber
              : isCustomer
                ? customerDocument
                : tripCode;
            const setValue = isVoucher
              ? setVoucherNumber
              : isCustomer
                ? setCustomerDocument
                : setTripCode;
            const submitting = isVoucher
              ? submittingVoucher
              : isCustomer
                ? submittingCustomer
                : submittingTrip;
            const onSubmit = isVoucher
              ? handleVoucherSubmit
              : isCustomer
                ? handleCustomerSubmit
                : handleTripSubmit;

            return (
              <form
                key={form.id}
                onSubmit={(event) => void onSubmit(event)}
                className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_300px]"
              >
                <label className="grid gap-2">
                  <span className="text-[15px] text-[#205a7f]">{form.title}</span>
                  <input
                    value={value}
                    onChange={(event) => setValue(event.target.value)}
                    placeholder={field?.placeholder || field?.label}
                    className="min-h-[138px] border border-[#b7bcc0] bg-[#efefef] px-7 text-[34px] font-light text-[#787878] shadow-[inset_0_8px_18px_rgba(0,0,0,0.08)] outline-none placeholder:text-[#787878]"
                  />
                </label>
                <button
                  type="submit"
                  disabled={submitting}
                  className="min-h-[138px] bg-[linear-gradient(180deg,#41a0e6_0%,#205a7f_100%)] px-7 text-[34px] font-light text-white shadow-[0_8px_22px_rgba(32,90,127,0.2)] transition hover:brightness-105 disabled:opacity-60"
                >
                  {submitting ? "Aguarde" : form.submitLabel}
                </button>
              </form>
            );
          })}
        </div>

        <aside className="rounded-[6px] border border-[#4f88b0] bg-[linear-gradient(180deg,#3e9ce1_0%,#245f88_100%)] p-6 text-white shadow-[0_12px_24px_rgba(32,90,127,0.22)]">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/80">
            Ações
          </p>
          <div className="mt-5 grid gap-3">
            {contract.header.actions
              ?.filter((action) => !action.managerOnly || isManager)
              .map((action) => (
                action.key === "ticket-lookup" ? (
                  <button
                    key={action.key}
                    type="button"
                    onClick={handleOpenTicketLookup}
                    className={`inline-flex min-h-[42px] items-center justify-center rounded-full px-5 py-2.5 text-center text-base font-bold uppercase tracking-[0.01em] shadow-[0_3px_0_rgba(0,0,0,0.18)] ${
                      actionButtonClasses(ticketLookupOpen)
                    }`}
                  >
                    {action.label}
                  </button>
                ) : (
                  <Link
                    key={action.key}
                    href={action.href}
                    className={`inline-flex min-h-[42px] items-center justify-center rounded-full px-5 py-2.5 text-center text-base font-bold uppercase tracking-[0.01em] shadow-[0_3px_0_rgba(0,0,0,0.18)] ${
                      actionButtonClasses(false)
                    }`}
                  >
                    {action.label}
                  </Link>
                )
              ))}
          </div>

          <div className="mt-8 border-t border-white/20 pt-6 text-sm leading-6 text-white/80">
            <div>Logado como:</div>
            <div className="font-semibold text-white">
              {actorName || actorCpf || "Sessão operacional"}
            </div>
          </div>
        </aside>
      </section>

      {message ? (
        <section
          className={`rounded-[10px] border px-5 py-4 text-sm ${messageToneClasses(message.tone)}`}
        >
          <p>{message.text}</p>
          {message.warnings?.length ? (
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {message.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="painel-bilheteria-ticket-lookup-title"
        className={`fixed inset-0 z-50 flex items-center justify-center bg-[rgba(11,34,53,0.48)] px-4 py-6 transition ${
          ticketLookupOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div className="w-full max-w-[420px] rounded-[6px] border border-[#d7e1e8] bg-white shadow-[0_24px_64px_rgba(31,67,98,0.28)]">
          <div className="flex items-center justify-between gap-3 border-b border-[#d7e1e8] px-5 py-4">
            <h2
              id="painel-bilheteria-ticket-lookup-title"
              className="text-lg font-semibold text-[#205a7f]"
            >
              {contract.modals?.find((modal) => modal.id === "ticket-lookup")?.title ||
                "Consultar Ingresso"}
            </h2>
            <button
              type="button"
              onClick={handleCloseTicketLookup}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#d7e1e8] text-[#5d7282]"
              aria-label="Fechar consulta de ingresso"
            >
              ×
            </button>
          </div>

          <div className="grid gap-4 px-5 py-5">
            <form onSubmit={handleTicketLookupSubmit} className="grid gap-3">
              <label className="grid gap-2 text-sm font-semibold text-[#345062]">
                Inserir ID do Ingresso
                <input
                  value={ticketLookup}
                  onChange={(event) => {
                    setTicketLookup(event.target.value);
                    setTicketLookupError(null);
                    setTicketWhatsappError(null);
                    setTicketWhatsappSuccess(null);
                  }}
                  placeholder="ID do Ingresso"
                  className="min-h-[42px] border border-[#c9d8e3] bg-white px-4 py-2.5 text-sm text-[#1b3447]"
                />
              </label>

              {ticketLookupError ? (
                <div className="rounded-[14px] border border-[#ebccd1] bg-[#f2dede] px-4 py-3 text-sm text-[#a94442]">
                  {ticketLookupError}
                </div>
              ) : null}

              {ticketLookupResult ? (
                <div className="border border-[#d7e1e8] bg-[#f8fbfd] px-4 py-4 text-sm text-[#345062]">
                  <div className="text-base font-semibold text-[#286445]">
                    Ingresso Encontrado!
                  </div>
                  <p className="mt-3">
                    Data da Compra:{" "}
                    <strong>
                      {formatPainelBilheteriaDate(ticketLookupResult.purchaseDate)}
                    </strong>
                  </p>
                  {ticketLookupResult.usedDate ? (
                    <p className="mt-2">
                      Data de Uso:{" "}
                      <strong>
                        {formatPainelBilheteriaDate(ticketLookupResult.usedDate)}
                      </strong>
                    </p>
                  ) : null}
                  {ticketLookupResult.used ? (
                    <p className="mt-3 text-[#8a6100]">
                      Este ingresso ja foi utilizado. Reemissao e envio estao bloqueados.
                    </p>
                  ) : ticketLookupResult.purchaseId ? (
                    <div className="mt-4 grid gap-3">
                      <label className="grid gap-2 text-sm font-semibold text-[#345062]">
                        Telefone com DDD
                        <input
                          value={ticketWhatsappPhone}
                          onChange={(event) => setTicketWhatsappPhone(event.target.value)}
                          placeholder="(DDD) 9xxxx-xxxx"
                          className="min-h-[42px] border border-[#c9d8e3] bg-white px-4 py-2.5 text-sm text-[#1b3447]"
                        />
                      </label>
                      {ticketWhatsappError ? (
                        <p className="text-sm text-[#a94442]">{ticketWhatsappError}</p>
                      ) : null}
                      {ticketWhatsappSuccess ? (
                        <p className="text-sm text-[#286445]">{ticketWhatsappSuccess}</p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="flex flex-wrap justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleCloseTicketLookup}
                  className="rounded-[4px] border border-[#c9d8e3] px-4 py-2.5 text-sm font-bold text-[#5d7282]"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  className="rounded-[4px] bg-[linear-gradient(180deg,#3e9ce1_0%,#245f88_100%)] px-4 py-2.5 text-sm font-bold text-white"
                >
                  {contract.modals?.find((modal) => modal.id === "ticket-lookup")
                    ?.primaryActionLabel || "Procurar"}
                </button>
                <button
                  type="button"
                  onClick={handlePrintTicketLookup}
                  disabled={!ticketLookupResult || ticketLookupResult.used}
                  className="rounded-[4px] bg-[#2f78be] px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Imprimir QR-Code
                </button>
                <button
                  type="button"
                  onClick={() => void handleSendTicketLookupWhatsapp()}
                  disabled={
                    sendingTicketWhatsapp ||
                    !ticketLookupResult ||
                    ticketLookupResult.used ||
                    !ticketLookupResult.purchaseId
                  }
                  className="rounded-[4px] bg-[#2f9e5b] px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sendingTicketWhatsapp ? "Enviando..." : "Enviar no WhatsApp"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {customerLookup ? (
        <section className="rounded-[6px] border border-[#d3dde6] bg-white p-5 shadow-[0_8px_22px_rgba(32,90,127,0.08)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-[#205a7f]">
                Resultado do cliente
              </h2>
              <p className="mt-2 text-sm text-[#5d7282]">
                {customerLookup.customer?.name || "Cliente não identificado"} •{" "}
                {customerLookup.customer?.cpfLabel || "-"}
              </p>
            </div>
            <div className="text-sm text-[#5d7282]">
              Consulta por {customerLookup.documentKind.toUpperCase()}
            </div>
          </div>

          {customerLookup.purchases.length === 0 ? (
            <p className="mt-5 text-sm text-[#5d7282]">
              Nenhuma compra concluida encontrada para este documento.
            </p>
          ) : (
            <div className="mt-5 grid gap-4">
              {customerLookup.purchases.map((purchase) => (
                <article
                  key={purchase.purchaseId}
                  className="rounded-[18px] border border-[#d9e3eb] bg-[#f8fbfd] p-4"
                >
                  {(() => {
                    const purchaseVoucherIds = purchase.vouchers.map((voucher) => voucher.voucherId);
                    const selectedVoucherIds = selectedCustomerVouchers[purchase.purchaseId] ?? [];
                    const allSelected =
                      purchaseVoucherIds.length > 0 &&
                      selectedVoucherIds.length === purchaseVoucherIds.length;

                    return (
                      <>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-lg font-semibold text-[#205a7f]">
                              Compra #{purchase.purchaseId}
                            </div>
                            <div className="mt-1 text-sm text-[#5d7282]">
                              {formatPainelBilheteriaDate(purchase.purchaseDate)} •{" "}
                              {purchase.purchaseTypeLabel} • {purchase.statusLabel}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-[#205a7f]">
                              {purchase.totalValue}
                            </div>
                            <div className="text-xs text-[#5d7282]">
                              {purchase.paymentLabel}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 overflow-x-auto">
                          <table className="min-w-full border-collapse border border-[#d2dde6] text-sm">
                            <thead className="bg-[#5f84a3] text-left text-white">
                              <tr>
                                <th className="border border-[#6f8ea8] px-4 py-3 font-normal">
                                  <label className="inline-flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={allSelected}
                                      onChange={() =>
                                        updateSelectedPurchaseVouchers(
                                          purchase.purchaseId,
                                          allSelected ? [] : purchaseVoucherIds,
                                        )
                                      }
                                    />
                                    <span>Todos</span>
                                  </label>
                                </th>
                                <th className="border border-[#6f8ea8] px-4 py-3 font-normal">Voucher</th>
                                <th className="border border-[#6f8ea8] px-4 py-3 font-normal">Tipo</th>
                                <th className="border border-[#6f8ea8] px-4 py-3 font-normal">Data</th>
                                <th className="border border-[#6f8ea8] px-4 py-3 font-normal">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {purchase.vouchers.map((voucher) => (
                                <tr
                                  key={voucher.voucherId}
                                  className="bg-white"
                                >
                                  <td className="border border-[#d2dde6] px-4 py-3">
                                    <input
                                      type="checkbox"
                                      checked={selectedVoucherIds.includes(voucher.voucherId)}
                                      onChange={() =>
                                        toggleSelectedPurchaseVoucher(
                                          purchase.purchaseId,
                                          voucher.voucherId,
                                        )
                                      }
                                    />
                                  </td>
                                  <td className="border border-[#d2dde6] px-4 py-3 font-semibold text-[#205a7f]">
                                    {voucher.voucherNumber || `#${voucher.voucherId}`}
                                  </td>
                                  <td className="border border-[#d2dde6] px-4 py-3">{voucher.voucherTypeLabel}</td>
                                  <td className="border border-[#d2dde6] px-4 py-3">
                                    {formatPainelBilheteriaDate(voucher.visitDate)}
                                  </td>
                                  <td className="border border-[#d2dde6] px-4 py-3">{voucher.statusLabel}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                void handleValidateSelectedPurchase(
                                  purchase.purchaseId,
                                  selectedVoucherIds,
                                )
                              }
                              disabled={isActionRunning(`validate-purchase-${purchase.purchaseId}`)}
                              className="rounded-[4px] bg-[linear-gradient(180deg,#3e9ce1_0%,#245f88_100%)] px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
                            >
                              Validar selecionados
                            </button>
                            {isManager ? (
                              <button
                                type="button"
                                onClick={() =>
                                  void handleUnvalidateSelectedPurchase(
                                    purchase.purchaseId,
                                    selectedVoucherIds,
                                  )
                                }
                                disabled={isActionRunning(`unvalidate-purchase-${purchase.purchaseId}`)}
                                className="rounded-[4px] border border-[#c9d8e3] bg-white px-4 py-2 text-xs font-bold text-[#205a7f] disabled:opacity-60"
                              >
                                Desvalidar selecionados
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => handlePrintSelectedPurchase(selectedVoucherIds)}
                              className="rounded-[4px] border border-[#c9d8e3] bg-white px-4 py-2 text-xs font-bold text-[#205a7f]"
                            >
                              Imprimir selecionados
                            </button>
                            {purchase.purchaseTypeCode === "reser" ? (
                              <Link
                                href={`/painel/bilheteria/pagar-reserva/${purchase.purchaseId}`}
                                className="rounded-[4px] border border-[#c9d8e3] bg-white px-4 py-2 text-xs font-bold text-[#205a7f]"
                              >
                                Pagar reserva
                              </Link>
                            ) : null}
                          </div>

                          <div className="grid gap-2">
                            <input
                              value={purchaseWhatsappPhones[purchase.purchaseId] ?? ""}
                              onChange={(event) =>
                                setPurchaseWhatsappPhones((current) => ({
                                  ...current,
                                  [purchase.purchaseId]: event.target.value,
                                }))
                              }
                              placeholder="Telefone com DDD"
                              className="min-h-[42px] border border-[#c9d8e3] bg-white px-4 py-2.5 text-sm text-[#1b3447]"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                void handleSendSelectedPurchaseWhatsapp(
                                  purchase.purchaseId,
                                  selectedVoucherIds,
                                )
                              }
                              disabled={isActionRunning(`whatsapp-purchase-${purchase.purchaseId}`)}
                              className="rounded-[4px] bg-[#2f9e5b] px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
                            >
                              Enviar selecionados no WhatsApp
                            </button>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {tripLookup ? (
        <section className="rounded-[6px] border border-[#d3dde6] bg-white p-5 shadow-[0_8px_22px_rgba(32,90,127,0.08)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-[#205a7f]">
                Resultado do passeio
              </h2>
              <p className="mt-2 text-sm text-[#5d7282]">
                {tripLookup.schoolName || "Passeio não encontrado"} •{" "}
                {formatPainelBilheteriaDate(tripLookup.visitDate)} •{" "}
                {tripLookup.statusLabel}
              </p>
            </div>
            {tripLookup.items.length > 0 && tripLookup.schoolId && tripLookup.agendaId ? (
              <button
                type="button"
                onClick={() => void handleTripValidation()}
                disabled={submittingTrip}
                className="rounded-[4px] bg-[linear-gradient(180deg,#3e9ce1_0%,#245f88_100%)] px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
              >
                {submittingTrip ? "Validando..." : "Validar todos do passeio"}
              </button>
            ) : null}
          </div>

          {tripLookup.items.length === 0 ? (
            <p className="mt-5 text-sm text-[#5d7282]">
              Nenhum voucher ativo encontrado para este passeio.
            </p>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full border-collapse border border-[#d2dde6] text-sm">
                <thead className="bg-[#5f84a3] text-left text-white">
                  <tr>
                    <th className="border border-[#6f8ea8] px-4 py-3 font-normal">Aluno</th>
                    <th className="border border-[#6f8ea8] px-4 py-3 font-normal">Voucher</th>
                    <th className="border border-[#6f8ea8] px-4 py-3 font-normal">Tipo</th>
                    <th className="border border-[#6f8ea8] px-4 py-3 font-normal">Status</th>
                    <th className="border border-[#6f8ea8] px-4 py-3 font-normal">Compra</th>
                    <th className="border border-[#6f8ea8] px-4 py-3 font-normal">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {tripLookup.items.map((item) => (
                    <tr key={item.voucherId} className="bg-white">
                      <td className="border border-[#d2dde6] px-4 py-3">
                        {item.studentName || "-"}
                        {(item.className || item.periodName) && (
                          <div className="text-xs text-[#5d7282]">
                            {[item.className, item.periodName].filter(Boolean).join(" • ")}
                          </div>
                        )}
                      </td>
                      <td className="border border-[#d2dde6] px-4 py-3 font-semibold text-[#205a7f]">
                        {item.voucherNumber || `#${item.voucherId}`}
                      </td>
                      <td className="border border-[#d2dde6] px-4 py-3">{item.voucherTypeLabel}</td>
                      <td className="border border-[#d2dde6] px-4 py-3">{item.statusLabel}</td>
                      <td className="border border-[#d2dde6] px-4 py-3">
                        {item.purchaseId ? `#${item.purchaseId}` : "-"} •{" "}
                        {item.purchaseTypeLabel}
                      </td>
                      <td className="border border-[#d2dde6] px-4 py-3">
                        <button
                          type="button"
                          onClick={() => void handleValidateTripVoucher(item.voucherId)}
                          disabled={isActionRunning(`validate-trip-voucher-${item.voucherId}`)}
                          className="rounded-[4px] bg-[linear-gradient(180deg,#3e9ce1_0%,#245f88_100%)] px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
                        >
                          Validar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
