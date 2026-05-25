"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { IngressoShell } from "@/components/ingresso-shell";
import type { AuthErrorResponse, AuthUser } from "@/lib/auth-contracts";
import type {
  UserVoucher,
  UserVoucherPurchase,
  UserVoucherRescheduleOption,
  UserVoucherRescheduleOptionsResponse,
  UserVoucherRescheduleResponse,
} from "@/lib/voucher-contracts";

type CustomerVouchersPageProps = {
  initialPurchases: UserVoucherPurchase[];
  initialTotalPurchases: number;
  pageSize: number;
  user: AuthUser;
};

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  const [year, month, day] = value.split("-");

  if (!year || !month || !day) {
    return value;
  }

  return `${day}/${month}/${year}`;
}

function formatCurrency(value: string | null) {
  if (!value) {
    return "-";
  }

  const amount = Number(value);

  if (Number.isNaN(amount)) {
    return value;
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amount);
}

async function readResponseBody<T>(response: Response) {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function readApiError(response: Response, fallback: string) {
  const payload = await readResponseBody<AuthErrorResponse>(response);

  if (payload && !payload.ok) {
    return payload.error.message;
  }

  return fallback;
}

function buildVoucherExportHref(purchaseId: number, voucherIds: number[]) {
  const params = new URLSearchParams();

  for (const voucherId of voucherIds) {
    params.append("voucherId", String(voucherId));
  }

  const query = params.toString();

  return query
    ? `/api/me/vouchers/${purchaseId}/export?${query}`
    : `/api/me/vouchers/${purchaseId}/export`;
}

function purchaseStatusLabel(purchase: UserVoucherPurchase) {
  if (purchase.type === "reser") {
    return purchase.status === "canc" ? "Cancelada" : "Bilheteria";
  }

  return purchase.payment.statusLabel;
}

function canResumeCheckout(purchase: UserVoucherPurchase) {
  return purchase.type === "ponli" && purchase.status !== "conc" && purchase.status !== "canc";
}

function statusBadgeClass(purchase: UserVoucherPurchase) {
  if (purchase.status === "conc") {
    return "bg-[#e8f4e2] text-[#275330]";
  }

  if (purchase.status === "canc") {
    return "bg-[#fff3f1] text-[#9f3f36]";
  }

  return "bg-[#fff3d8] text-[#7a4b00]";
}

function groupPurchases(purchases: UserVoucherPurchase[]) {
  return purchases.reduce(
    (groups, purchase) => {
      if (purchase.type === "ponli") {
        groups.online.push(purchase);
      } else if (purchase.type === "reser") {
        groups.reservations.push(purchase);
      }

      return groups;
    },
    {
      online: [] as UserVoucherPurchase[],
      reservations: [] as UserVoucherPurchase[],
    },
  );
}

function applyCanceledPurchase(purchase: UserVoucherPurchase) {
  return {
    ...purchase,
    status: "canc" as const,
    statusLabel: "Cancelado",
    canCancelReservation: false,
    canGenerateVoucher: false,
  };
}

function applyRescheduledVoucher(
  purchase: UserVoucherPurchase,
  voucherId: number,
  visitDate: string,
) {
  return {
    ...purchase,
    vouchers: purchase.vouchers.map((voucher) =>
      voucher.id === voucherId
        ? {
            ...voucher,
            visitDate,
            canReschedule: false,
          }
        : voucher,
    ),
  };
}

function VoucherRow({
  purchase,
  voucher,
  selected,
  selectable,
  onToggle,
  onVoucherRescheduled,
  layout = "table",
}: {
  purchase: UserVoucherPurchase;
  voucher: UserVoucher;
  selected: boolean;
  selectable: boolean;
  onToggle: (voucherId: number, checked: boolean) => void;
  onVoucherRescheduled: (voucherId: number, visitDate: string) => void;
  layout?: "table" | "card";
}) {
  const [options, setOptions] = useState<UserVoucherRescheduleOption[] | null>(null);
  const [selectedAgendaId, setSelectedAgendaId] = useState("");
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleLoadOptions() {
    setLoadingOptions(true);
    setActionError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/me/vouchers/${voucher.id}/reschedule`, {
        cache: "no-store",
      });
      const payload = await readResponseBody<
        UserVoucherRescheduleOptionsResponse | AuthErrorResponse
      >(response);

      if (!response.ok || !payload?.ok) {
        setActionError(
          payload && !payload.ok
            ? payload.error.message
            : "Nao foi possivel consultar as datas agora.",
        );
        return;
      }

      setOptions(payload.data.options);
      setSelectedAgendaId(payload.data.options[0]?.id ? String(payload.data.options[0].id) : "");
    } catch (error) {
      console.error("customer-voucher-reschedule-options-failed", error);
      setActionError("Nao foi possivel consultar as datas agora.");
    } finally {
      setLoadingOptions(false);
    }
  }

  async function handleRescheduleSubmit() {
    const agendaId = Number(selectedAgendaId);

    if (!Number.isInteger(agendaId) || agendaId <= 0) {
      setActionError("Escolha uma nova data para reagendamento.");
      return;
    }

    setSubmitting(true);
    setActionError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/me/vouchers/${voucher.id}/reschedule`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ agendaId }),
      });
      const payload = await readResponseBody<
        UserVoucherRescheduleResponse | AuthErrorResponse
      >(response);

      if (!response.ok || !payload?.ok) {
        setActionError(
          payload && !payload.ok
            ? payload.error.message
            : "Nao foi possivel concluir o reagendamento agora.",
        );
        return;
      }

      setSuccessMessage(`Voucher reagendado para ${formatDate(payload.data.visitDate)}.`);
      setOptions(null);
      setSelectedAgendaId("");
      onVoucherRescheduled(voucher.id, payload.data.visitDate);
    } catch (error) {
      console.error("customer-voucher-reschedule-submit-failed", error);
      setActionError("Nao foi possivel concluir o reagendamento agora.");
    } finally {
      setSubmitting(false);
    }
  }

  if (layout === "card") {
    return (
      <div className="overflow-hidden rounded-[24px] border border-[#dbe7d7] bg-[#fbfdf9]">
        <div className="grid gap-4 px-4 py-4 md:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(120px,1fr))] md:items-start md:px-5">
          <div>
            <div className="flex items-start gap-3">
              {selectable ? (
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={(event) => onToggle(voucher.id, event.target.checked)}
                  className="mt-1"
                />
              ) : null}
              <div>
                <p className="text-[20px] font-black text-[#17351f]">
                  {voucher.typeLabel}
                </p>
                {voucher.schoolName ? (
                  <p className="mt-1 text-sm text-[#5b745f]">{voucher.schoolName}</p>
                ) : null}
                {voucher.participantName ? (
                  <p className="mt-1 text-sm font-semibold text-[#275330]">
                    {voucher.participantName}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-[#719168]">Visita</p>
            <p className="mt-2 text-[16px] font-bold text-[#17351f]">
              {formatDate(voucher.visitDate)}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-[#719168]">Uso</p>
            <p className="mt-2 text-[16px] font-bold text-[#17351f]">
              {formatDate(voucher.useDate)}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-[#719168]">Valor</p>
            <p className="mt-2 text-[16px] font-bold text-[#17351f]">
              {formatCurrency(voucher.unitValue)}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-[#719168]">Pagamento</p>
            <span className="mt-2 inline-flex rounded-full bg-[#e8f4e2] px-3 py-1 text-[12px] font-bold text-[#275330]">
              {purchaseStatusLabel(purchase)}
            </span>
          </div>
          <div className="flex flex-col items-start gap-2 md:items-end">
            {voucher.canReschedule ? (
              <button
                id={`reschedule-${purchase.id}-${voucher.id}`}
                type="button"
                onClick={() => void handleLoadOptions()}
                disabled={loadingOptions || submitting}
                className="text-sm font-semibold text-[#2b8c46] underline underline-offset-2"
              >
                {loadingOptions ? "Carregando..." : "Reagendar"}
              </button>
            ) : null}
            {purchase.status === "conc" && !voucher.used && voucher.expiredForGeneration ? (
              <span className="inline-flex rounded-full bg-[#fff3f1] px-3 py-1 text-[12px] font-semibold text-[#9f3f36]">
                Voucher vencido
              </span>
            ) : null}
          </div>
        </div>
        {options || actionError || successMessage ? (
          <div className="border-t border-[#e7efe4] px-4 py-4 md:px-5">
            {options ? (
              <div className="flex flex-col gap-3 rounded-[20px] border border-[#dbe7d7] bg-white p-4 md:flex-row">
                <select
                  value={selectedAgendaId}
                  onChange={(event) => setSelectedAgendaId(event.target.value)}
                  className="estancia-field min-h-[48px] flex-1 px-4"
                >
                  {options.length === 0 ? <option value="">Nenhuma data disponivel</option> : null}
                  {options.map((option) => (
                    <option key={option.id} value={String(option.id)}>
                      {formatDate(option.date)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => void handleRescheduleSubmit()}
                  disabled={submitting || options.length === 0}
                  className="estancia-button px-5 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Salvando..." : "Confirmar reagendamento"}
                </button>
              </div>
            ) : null}
            {successMessage ? (
              <div className="mt-3 rounded-[18px] border border-[#cbe9d7] bg-[#eefaf2] px-4 py-3 text-sm text-[#287450]">
                {successMessage}
              </div>
            ) : null}
            {actionError ? (
              <div className="mt-3 rounded-[18px] border border-[#efc3c3] bg-[#fff3f1] px-4 py-3 text-sm text-[#9f3f36]">
                {actionError}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <tr className="border-t border-[#e7eff5] align-top text-[15px] text-[#2f4d63]">
        <td className="px-3 py-3">
          {selectable ? (
            <input
              type="checkbox"
              checked={selected}
              onChange={(event) => onToggle(voucher.id, event.target.checked)}
              className="mr-2"
            />
          ) : null}
          {voucher.typeLabel}
          {voucher.schoolName ? (
            <>
              <br />
              <span className="text-[13px] text-[#5c7284]">{voucher.schoolName}</span>
            </>
          ) : null}
          {voucher.participantName ? (
            <>
              <br />
              <strong className="text-[14px] text-[#204e6b]">
                {voucher.participantName}
              </strong>
            </>
          ) : null}
        </td>
        <td className="px-3 py-3 text-center">
          <strong>{formatDate(voucher.visitDate)}</strong>
          {voucher.canReschedule ? (
            <>
              <br />
              <button
                type="button"
                onClick={handleLoadOptions}
                disabled={loadingOptions || submitting}
                className="mt-2 text-[13px] text-[#1d5b80] underline underline-offset-2"
              >
                {loadingOptions ? "Carregando..." : "Reagendar"}
              </button>
            </>
          ) : null}
        </td>
        <td className="px-3 py-3 text-center">
          <strong>{formatDate(voucher.useDate)}</strong>
        </td>
        <td className="px-3 py-3 text-center">{formatCurrency(voucher.unitValue)}</td>
        <td className="px-3 py-3 text-center">
          <span className="inline-flex rounded-full bg-[#eef6fb] px-3 py-1 text-[12px] text-[#2c6485]">
            {purchaseStatusLabel(purchase)}
          </span>
        </td>
        <td className="px-3 py-3 text-right text-[13px]">
          {purchase.status === "conc" && !voucher.used && voucher.expiredForGeneration ? (
            <span className="inline-flex rounded-full bg-[#fff3f1] px-3 py-1 text-[#9f3f36]">
              Voucher vencido
            </span>
          ) : null}
        </td>
      </tr>
      {options || actionError || successMessage ? (
        <tr className="border-t border-[#eef4f8]">
          <td colSpan={6} className="px-3 py-3">
            {options ? (
              <div className="flex flex-col gap-3 rounded-[18px] border border-[#dbe8f1] bg-[#f8fbfe] p-4 md:flex-row">
                <select
                  value={selectedAgendaId}
                  onChange={(event) => setSelectedAgendaId(event.target.value)}
                  className="min-h-[44px] flex-1 rounded-[16px] border border-[#c9d7e3] bg-white px-4 text-sm text-[#214d6b] outline-none"
                >
                  {options.length === 0 ? <option value="">Nenhuma data disponivel</option> : null}
                  {options.map((option) => (
                    <option key={option.id} value={String(option.id)}>
                      {formatDate(option.date)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleRescheduleSubmit}
                  disabled={submitting || options.length === 0}
                  className="legacy-button mt-0"
                >
                  {submitting ? "salvando..." : "confirmar reagendamento"}
                </button>
              </div>
            ) : null}
            {successMessage ? (
              <div className="mt-3 rounded-[18px] border border-[#cbe9d7] bg-[#eefaf2] px-4 py-3 text-sm text-[#287450]">
                {successMessage}
              </div>
            ) : null}
            {actionError ? (
              <div className="mt-3 rounded-[18px] border border-[#efc3c3] bg-[#fff3f1] px-4 py-3 text-sm text-[#9f3f36]">
                {actionError}
              </div>
            ) : null}
          </td>
        </tr>
      ) : null}
    </>
  );
}

function PurchaseTicket({
  purchase,
  onPurchaseCanceled,
  onVoucherRescheduled,
}: {
  purchase: UserVoucherPurchase;
  onPurchaseCanceled: (purchaseId: number) => void;
  onVoucherRescheduled: (purchaseId: number, voucherId: number, visitDate: string) => void;
}) {
  const exportableVoucherIds = purchase.vouchers
    .filter((voucher) => voucher.canSelectForVoucher)
    .map((voucher) => voucher.id);
  const [selectedVoucherIds, setSelectedVoucherIds] = useState<number[]>(exportableVoucherIds);
  const [cancelPending, setCancelPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const selectableCount = exportableVoucherIds.length;
  const allSelected =
    selectableCount > 0 &&
    exportableVoucherIds.every((voucherId) => selectedVoucherIds.includes(voucherId));

  function toggleVoucherSelection(voucherId: number, checked: boolean) {
    setSelectedVoucherIds((current) =>
      checked
        ? current.includes(voucherId)
          ? current
          : [...current, voucherId]
        : current.filter((currentVoucherId) => currentVoucherId !== voucherId),
    );
  }

  function toggleAll(checked: boolean) {
    setSelectedVoucherIds(checked ? exportableVoucherIds : []);
  }

  async function handleCancelReservation() {
    setCancelPending(true);
    setActionError(null);

    try {
      const response = await fetch(`/api/me/vouchers/${purchase.id}/cancel`, {
        method: "POST",
      });

      if (!response.ok) {
        setActionError(
          await readApiError(response, "Nao foi possivel cancelar a reserva agora."),
        );
        return;
      }

      onPurchaseCanceled(purchase.id);
    } catch (error) {
      console.error("customer-cancel-reservation-failed", error);
      setActionError("Nao foi possivel cancelar a reserva agora.");
    } finally {
      setCancelPending(false);
    }
  }

  return (
    <article className="estancia-card p-6">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="min-w-0">
          <p className="text-[12px] uppercase tracking-[0.18em] text-[#719168]">
            {purchase.type === "reser" ? "Reserva" : "Compra"}
          </p>
          <h3 className="mt-2 text-[30px] font-black text-[#17351f]">
            Pedido #{purchase.id}
          </h3>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className={`inline-flex rounded-full px-3 py-1 text-[12px] font-black ${statusBadgeClass(purchase)}`}>
              {purchaseStatusLabel(purchase)}
            </span>
            <span className="inline-flex rounded-full bg-[#f2f7ef] px-3 py-1 text-[12px] font-bold text-[#4f6953]">
              {purchase.voucherCount} item(ns)
            </span>
          </div>
          {purchase.type === "reser" && purchase.status !== "canc" && purchase.canCancelReservation ? (
            <button
              type="button"
              onClick={handleCancelReservation}
              disabled={cancelPending}
              className="mt-3 text-[14px] font-semibold text-[#a34335] underline underline-offset-2"
            >
              {cancelPending ? "Cancelando..." : "Cancelar Agendamento"}
            </button>
          ) : null}
          {purchase.type === "reser" && purchase.status === "canc" ? (
            <p className="mt-3 text-[14px] font-semibold text-[#9f3f36]">Cancelada</p>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-[minmax(0,220px)_auto] lg:min-w-[440px]">
          <div className="rounded-[24px] border border-[#dbe7d7] bg-[#f7fbf5] px-5 py-4 text-left sm:text-right">
            <p className="text-[12px] uppercase tracking-[0.18em] text-[#719168]">
              Valor total
            </p>
            <strong className="mt-2 block text-[30px] font-black text-[#17351f]">
              {formatCurrency(purchase.totalValue)}
            </strong>
          </div>
          <div className="flex flex-col gap-2 sm:min-w-[190px]">
            <button
              type="button"
              onClick={() => setExpanded((current) => !current)}
              className="inline-flex min-h-[46px] items-center justify-center rounded-full border border-[#cfe0ca] bg-white px-5 text-sm font-black text-[#17351f] transition hover:border-[#2b8c46]"
            >
              {expanded ? "Recolher" : "Ver detalhes"}
            </button>
          {canResumeCheckout(purchase) ? (
              <a
                href={`/checkout/${purchase.id}`}
                className="inline-flex min-h-[46px] items-center justify-center rounded-full bg-[#5464ff] px-5 text-sm font-black text-white shadow-[0_14px_28px_rgba(84,100,255,0.22)] transition hover:bg-[#4150df]"
              >
                Continuar pagamento
              </a>
          ) : null}
          </div>
        </div>
      </div>

      {expanded ? (
        <>
          {purchase.canGenerateVoucher && selectableCount > 0 ? (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#e7efe4] pt-5">
              <label className="inline-flex items-center gap-2 text-sm font-semibold text-[#4f6953]">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(event) => toggleAll(event.target.checked)}
                />
                Selecionar todos
              </label>
              {selectedVoucherIds.length > 0 ? (
                <a
                  href={buildVoucherExportHref(purchase.id, selectedVoucherIds)}
                  target="_blank"
                  rel="noreferrer"
                  className="estancia-button mt-0 inline-flex px-5 py-3 text-sm"
                >
                  Gerar {selectedVoucherIds.length} Voucher
                  {selectedVoucherIds.length === 1 ? "" : "s"}
                </a>
              ) : null}
            </div>
          ) : null}

          <div className="mt-5 space-y-3">
            {purchase.vouchers.map((voucher) => (
              <VoucherRow
                key={voucher.id}
                purchase={purchase}
                voucher={voucher}
                selected={selectedVoucherIds.includes(voucher.id)}
                selectable={voucher.canSelectForVoucher}
                onToggle={toggleVoucherSelection}
                onVoucherRescheduled={(voucherId, visitDate) =>
                  onVoucherRescheduled(purchase.id, voucherId, visitDate)
                }
                layout="card"
              />
            ))}
          </div>
        </>
      ) : null}

      {actionError ? (
        <div className="mt-4 rounded-[18px] border border-[#efc3c3] bg-[#fff3f1] px-4 py-3 text-sm text-[#9f3f36]">
          {actionError}
        </div>
      ) : null}
    </article>
  );
}

function PurchaseGroup({
  title,
  purchases,
  emptyMessage,
  onPurchaseCanceled,
  onVoucherRescheduled,
}: {
  title: string;
  purchases: UserVoucherPurchase[];
  emptyMessage: string;
  onPurchaseCanceled: (purchaseId: number) => void;
  onVoucherRescheduled: (purchaseId: number, voucherId: number, visitDate: string) => void;
}) {
  return (
    <section className="space-y-4">
      <div>
        <p className="text-[12px] uppercase tracking-[0.18em] text-[#719168]">
          Area do cliente
        </p>
        <h2 className="mt-2 text-[30px] font-black text-[#17351f]">{title}</h2>
      </div>
      {purchases.length === 0 ? (
        <div className="estancia-card px-5 py-8 text-sm text-[#5c745f]">
          {emptyMessage}
        </div>
      ) : (
        purchases.map((purchase) => (
          <PurchaseTicket
            key={purchase.id}
            purchase={purchase}
            onPurchaseCanceled={onPurchaseCanceled}
            onVoucherRescheduled={onVoucherRescheduled}
          />
        ))
      )}
    </section>
  );
}

export function CustomerVouchersPage({
  initialPurchases,
  initialTotalPurchases,
  pageSize,
  user,
}: CustomerVouchersPageProps) {
  const router = useRouter();
  const [purchases, setPurchases] = useState(initialPurchases);
  const [totalPurchases, setTotalPurchases] = useState(initialTotalPurchases);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLoadMore() {
    setLoadingMore(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/me/vouchers?limit=${pageSize}&offset=${purchases.length}`,
        { cache: "no-store" },
      );

      if (response.status === 401) {
        router.replace("/login?redirect=%2Fmeus-ingressos");
        return;
      }

      if (!response.ok) {
        setError(await readApiError(response, "Nao foi possivel consultar mais pedidos agora."));
        return;
      }

      const payload = await readResponseBody<{
        ok: true;
        data: {
          totalPurchases: number;
          purchases: UserVoucherPurchase[];
        };
      }>(response);

      if (!payload?.ok) {
        setError("Nao foi possivel consultar mais pedidos agora.");
        return;
      }

      setPurchases((current) => [...current, ...payload.data.purchases]);
      setTotalPurchases(payload.data.totalPurchases);
    } catch (error) {
      console.error("customer-vouchers-load-more-failed", error);
      setError("Nao foi possivel consultar mais pedidos agora.");
    } finally {
      setLoadingMore(false);
    }
  }

  function handlePurchaseCanceled(purchaseId: number) {
    setPurchases((current) =>
      current.map((purchase) =>
        purchase.id === purchaseId ? applyCanceledPurchase(purchase) : purchase,
      ),
    );
  }

  function handleVoucherRescheduled(
    purchaseId: number,
    voucherId: number,
    visitDate: string,
  ) {
    setPurchases((current) =>
      current.map((purchase) =>
        purchase.id === purchaseId
          ? applyRescheduledVoucher(purchase, voucherId, visitDate)
          : purchase,
      ),
    );
  }

  const groups = groupPurchases(purchases);
  const hasMore = purchases.length < totalPurchases;

  return (
    <IngressoShell active="tickets" user={user}>
      <div className="mx-auto w-full max-w-[1180px] px-4 pt-6 md:px-6">
        <div className="mt-6 space-y-8">
          <section className="overflow-hidden rounded-[32px] border border-[#dce8d8] bg-[linear-gradient(135deg,#1f6b36,#2c7b40_52%,#7bc043_100%)] px-6 py-7 text-white shadow-[0_24px_60px_rgba(24,67,34,0.18)]">
            <p className="text-[12px] uppercase tracking-[0.22em] text-white/70">
              Area do cliente
            </p>
            <h1 className="mt-3 text-[34px] font-black leading-tight md:text-[42px]">
              Meus ingressos e pedidos
            </h1>
            <p className="mt-3 max-w-[760px] text-[15px] leading-7 text-white/84">
              Consulte compras, gere vouchers e acompanhe reagendamentos em um
              unico lugar.
            </p>
          </section>

          {error ? (
            <div className="rounded-[24px] border border-[#efc3c3] bg-[#fff3f1] px-5 py-4 text-left text-sm text-[#9f3f36]">
              {error}
            </div>
          ) : null}

          <PurchaseGroup
            title="Pedidos (Compra)"
            purchases={groups.online}
            emptyMessage="Nenhuma compra realizada."
            onPurchaseCanceled={handlePurchaseCanceled}
            onVoucherRescheduled={handleVoucherRescheduled}
          />

          <PurchaseGroup
            title="Pedidos (Reservas)"
            purchases={groups.reservations}
            emptyMessage="Nenhuma reserva encontrada."
            onPurchaseCanceled={handlePurchaseCanceled}
            onVoucherRescheduled={handleVoucherRescheduled}
          />

          {hasMore ? (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="estancia-button-secondary"
              >
                {loadingMore ? "Carregando..." : "Carregar mais pedidos"}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </IngressoShell>
  );
}
