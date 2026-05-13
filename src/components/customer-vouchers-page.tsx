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
}: {
  purchase: UserVoucherPurchase;
  voucher: UserVoucher;
  selected: boolean;
  selectable: boolean;
  onToggle: (voucherId: number, checked: boolean) => void;
  onVoucherRescheduled: (voucherId: number, visitDate: string) => void;
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
    <article className="rounded-[24px] border border-[#d6e5ef] bg-white p-5 shadow-[0_12px_32px_rgba(18,68,99,0.07)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="legacy-rounded text-[24px] text-[#1d5b80]">
            Pedido: {purchase.id}
          </h3>
          {purchase.type === "reser" && purchase.status !== "canc" && purchase.canCancelReservation ? (
            <button
              type="button"
              onClick={handleCancelReservation}
              disabled={cancelPending}
              className="mt-2 text-[14px] text-[#1d5b80] underline underline-offset-2"
            >
              {cancelPending ? "Cancelando..." : "Cancelar Agendamento"}
            </button>
          ) : null}
          {purchase.type === "reser" && purchase.status === "canc" ? (
            <p className="mt-2 text-[14px] text-[#9f3f36]">Cancelada</p>
          ) : null}
        </div>

        <div className="text-right">
          <strong className="legacy-rounded text-[20px] text-[#214d6b]">
            Valor Total: {formatCurrency(purchase.totalValue)}
          </strong>
          {purchase.canGenerateVoucher && selectedVoucherIds.length > 0 ? (
            <div className="mt-3">
              <a
                href={buildVoucherExportHref(purchase.id, selectedVoucherIds)}
                target="_blank"
                rel="noreferrer"
                className="legacy-button mt-0 inline-flex"
              >
                Gerar {selectedVoucherIds.length} Voucher
                {selectedVoucherIds.length === 1 ? "" : "s"}
              </a>
            </div>
          ) : null}
        </div>
      </div>

      {purchase.canGenerateVoucher && selectableCount > 0 ? (
        <label className="mt-4 inline-flex items-center gap-2 text-sm text-[#31556d]">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={(event) => toggleAll(event.target.checked)}
          />
          Selecionar Todos
        </label>
      ) : null}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse">
          <thead>
            <tr className="border-b border-[#dce8f0] text-left text-[12px] uppercase tracking-[0.14em] text-[#7892a5]">
              <th className="px-3 py-3 font-normal">tipo do ingresso</th>
              <th className="px-3 py-3 text-center font-normal">data da visita</th>
              <th className="px-3 py-3 text-center font-normal">data de uso</th>
              <th className="px-3 py-3 text-center font-normal">valor do ingresso</th>
              <th className="px-3 py-3 text-center font-normal">Pagamento</th>
              <th className="px-3 py-3 text-right font-normal"></th>
            </tr>
          </thead>
          <tbody>
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
              />
            ))}
          </tbody>
        </table>
      </div>

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
      <h2 className="legacy-rounded text-[24px] text-[#1d5b80]">{title}</h2>
      {purchases.length === 0 ? (
        <div className="rounded-[24px] border border-[#d6e5ef] bg-white px-5 py-8 text-sm text-[#5c7284] shadow-[0_12px_32px_rgba(18,68,99,0.07)]">
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
                className="legacy-rounded inline-flex min-h-[42px] items-center justify-center rounded-full border border-[#c5d8e6] bg-white px-5 text-[14px] text-[#295c7b] shadow-[0_10px_26px_rgba(17,66,97,0.06)] hover:bg-[#f3f9fd] disabled:cursor-not-allowed disabled:text-[#94a9ba]"
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
