"use client";

import { useState, useTransition } from "react";
import { BilheteriaCashHeader } from "@/components/bilheteria-cash-header";
import {
  formatBilheteriaCashDateTime,
  formatBilheteriaCashMoney,
} from "@/lib/bilheteria-cash-view-model";
import type { OperationalCashSummary } from "@/lib/ops-cash-management";

type Props = {
  actorCpf?: string | null;
  actorName?: string | null;
  isManager: boolean;
  summary: OperationalCashSummary;
};

type FundModalState =
  | { kind: "create-fundo" }
  | { kind: "create-sangria" }
  | {
      kind: "edit";
      movementId: number;
      movementType: "fundo" | "sangria";
      responsible: string;
      value: string;
    }
  | {
      kind: "delete";
      movementId: number;
      movementType: "fundo" | "sangria";
    }
  | null;

type CashMovementResponse = {
  ok: true;
  data: {
    summary: OperationalCashSummary;
    message: string;
  };
} | {
  ok: false;
  error: {
    message: string;
  };
};

function parseMoneyInput(value: string) {
  const raw = value.trim().replace(/^R\$\s*/i, "");
  const normalized =
    raw.includes(",") && raw.includes(".")
      ? raw.replace(/\./g, "").replace(",", ".")
      : raw.includes(",")
        ? raw.replace(",", ".")
        : raw;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed.toFixed(2) : "";
}

function movementCreateReason(kind: "fundo" | "sangria") {
  return kind === "fundo"
    ? "Fundo de caixa registrado pela tela dedicada da bilheteria."
    : "Sangria registrada pela tela dedicada da bilheteria.";
}

export function BilheteriaCashFundPage({
  actorCpf = null,
  actorName = null,
  isManager,
  summary,
}: Props) {
  const [currentSummary, setCurrentSummary] = useState(summary);
  const [modalState, setModalState] = useState<FundModalState>(null);
  const [feedback, setFeedback] = useState<{
    tone: "error" | "success";
    message: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  function closeModal() {
    setModalState(null);
  }

  function handleMutation(
    request: Promise<Response>,
    onSuccess?: (payload: Extract<CashMovementResponse, { ok: true }>) => void,
  ) {
    startTransition(async () => {
      setFeedback(null);

      try {
        const response = await request;
        const payload = (await response.json().catch(() => null)) as CashMovementResponse | null;

        if (!response.ok || !payload || !payload.ok) {
          setFeedback({
            tone: "error",
            message:
              payload && !payload.ok
                ? payload.error.message
                : "Nao foi possivel concluir a operacao no caixa.",
          });
          return;
        }

        setCurrentSummary(payload.data.summary);
        setFeedback({
          tone: "success",
          message: payload.data.message,
        });
        closeModal();
        onSuccess?.(payload);
      } catch (error) {
        setFeedback({
          tone: "error",
          message:
            error instanceof Error
              ? error.message
              : "Falha de comunicacao com o caixa.",
        });
      }
    });
  }

  function renderRows(type: "fundo" | "sangria") {
    const items = type === "fundo" ? currentSummary.funds : currentSummary.sangrias;
    const emptyLabel = type === "fundo" ? "- Sem lancamentos -" : "- Sem sangrias -";

    if (items.length === 0) {
      return (
        <tr>
          <td className="border border-[#d2dde6] px-4 py-6 text-center text-[#5f7387]" colSpan={isManager ? 3 : 2}>
            {emptyLabel}
          </td>
        </tr>
      );
    }

    return items.map((item) => (
      <tr key={`${type}-${item.id}`}>
        <td className="border border-[#d2dde6] px-4 py-3">
          <div className="font-semibold text-[#20486b]">{item.responsible}</div>
          <div className="text-xs text-[#688094]">
            {formatBilheteriaCashDateTime(item.createdAt)}
          </div>
        </td>
        <td className="border border-[#d2dde6] px-4 py-3 font-semibold text-[#20486b]">
          {formatBilheteriaCashMoney(item.value)}
        </td>
        {isManager ? (
          <td className="border border-[#d2dde6] px-4 py-3">
            <div className="flex justify-end gap-2">
              <button
                aria-label="Editar lancamento"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#d0dbe7] bg-white text-[#1d3348]"
                onClick={() =>
                  setModalState({
                    kind: "edit",
                    movementId: item.id,
                    movementType: type,
                    responsible: item.responsible,
                    value: String(item.value),
                  })
                }
                type="button"
              >
                ✎
              </button>
              <button
                aria-label="Excluir lancamento"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#f1c9c9] bg-white text-[#d33c3c]"
                onClick={() =>
                  setModalState({
                    kind: "delete",
                    movementId: item.id,
                    movementType: type,
                  })
                }
                type="button"
              >
                ×
              </button>
            </div>
          </td>
        ) : null}
      </tr>
    ));
  }

  return (
    <div className="grid gap-5">
      <BilheteriaCashHeader
        actorName={actorName}
        primaryActions={[
          { href: "/painel/bilheteria/vendas", label: "VENDAS" },
          { href: "/painel/bilheteria/fechamento-caixa", label: "FECHAMENTO DE CAIXA" },
        ]}
      />

      <section className="grid gap-6 rounded-[6px] bg-white p-6 shadow-[0_12px_34px_rgba(31,67,98,0.08)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="legacy-condensed text-5xl text-[#205a7f]">
              FUNDO DE CAIXA
            </h1>
            <p className="mt-2 max-w-[72ch] text-sm leading-6 text-[#5f7387]">
              Lancamentos dedicados de fundo e sangria do periodo aberto, com
              os mesmos blocos separados do legado.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              className="rounded-[4px] bg-[#86efac] px-5 py-3 text-sm font-bold text-[#0f4021] shadow-[0_3px_0_rgba(0,0,0,0.12)]"
              onClick={() => setModalState({ kind: "create-fundo" })}
              type="button"
            >
              FAZER FUNDO DE CAIXA
            </button>
            <button
              className="rounded-[4px] bg-[#fca5a5] px-5 py-3 text-sm font-bold text-[#5c1616] shadow-[0_3px_0_rgba(0,0,0,0.12)]"
              onClick={() => setModalState({ kind: "create-sangria" })}
              type="button"
            >
              FAZER SANGRIA
            </button>
          </div>
        </div>

        {feedback ? (
          <div
            className={`border px-4 py-3 text-sm ${
              feedback.tone === "success"
                ? "border-[#b7dfc0] bg-[#edf8f0] text-[#245336]"
                : "border-[#efc0c0] bg-[#fff0f0] text-[#7a2b2b]"
            }`}
          >
            {feedback.message}
          </div>
        ) : null}

        <div className="grid gap-4">
          <div className="border-2 border-[#22c55e] bg-white px-4 py-3 text-xl font-extrabold text-[#065f46]">
            Dinheiro do Fundo de Caixa:{" "}
            <span>{formatBilheteriaCashMoney(currentSummary.totals.fund)}</span>
          </div>
          <div className="border-2 border-[#22c55e] bg-white px-4 py-3 text-xl font-extrabold text-[#065f46]">
            Dinheiro total no caixa:{" "}
            <span>{formatBilheteriaCashMoney(currentSummary.totals.cashInDrawer)}</span>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <article className="overflow-hidden rounded-[6px] border border-[#d6e1eb] bg-white shadow-[0_6px_18px_rgba(31,67,98,0.08)]">
            <div className="border-b border-[#d6e1eb] px-4 py-4 text-lg font-bold text-[#1d3348]">
              Fundo de Caixa:
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead className="bg-[#5f84a3] text-left text-white">
                  <tr>
                    <th className="border border-[#6f8ea8] px-4 py-3 font-normal">NOME</th>
                    <th className="border border-[#6f8ea8] px-4 py-3 font-normal">Valor</th>
                    {isManager ? <th className="border border-[#6f8ea8] px-4 py-3 text-right font-normal">Acoes</th> : null}
                  </tr>
                </thead>
                <tbody>{renderRows("fundo")}</tbody>
              </table>
            </div>
            <div className="border-t border-[#d6e1eb] px-4 py-3 text-right text-sm font-bold text-[#1d3348]">
              Total: {formatBilheteriaCashMoney(currentSummary.totals.fund)}
            </div>
          </article>

          <article className="overflow-hidden rounded-[6px] border border-[#d6e1eb] bg-white shadow-[0_6px_18px_rgba(31,67,98,0.08)]">
            <div className="border-b border-[#d6e1eb] px-4 py-4 text-lg font-bold text-[#1d3348]">
              Sangrias:
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead className="bg-[#5f84a3] text-left text-white">
                  <tr>
                    <th className="border border-[#6f8ea8] px-4 py-3 font-normal">NOME</th>
                    <th className="border border-[#6f8ea8] px-4 py-3 font-normal">Valor</th>
                    {isManager ? <th className="border border-[#6f8ea8] px-4 py-3 text-right font-normal">Acoes</th> : null}
                  </tr>
                </thead>
                <tbody>{renderRows("sangria")}</tbody>
              </table>
            </div>
            <div className="border-t border-[#d6e1eb] px-4 py-3 text-right text-sm font-bold text-[#1d3348]">
              Total: {formatBilheteriaCashMoney(currentSummary.totals.sangria)}
            </div>
          </article>
        </div>
      </section>

      {modalState ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-8">
          <div className="w-full max-w-[420px] rounded-[8px] bg-white shadow-[0_18px_40px_rgba(0,0,0,0.24)]">
            {modalState.kind === "create-fundo" || modalState.kind === "create-sangria" ? (
              <form
                action={(formData) => {
                  const responsible = String(formData.get("responsible") ?? "").trim();
                  const value = parseMoneyInput(String(formData.get("value") ?? ""));
                  const type = modalState.kind === "create-fundo" ? "fundo" : "sangria";
                  handleMutation(
                    fetch("/api/painel/bilheteria/cash-movements", {
                      body: JSON.stringify({
                        actor: {
                          cpf: actorCpf,
                          name: actorName,
                        },
                        reason: movementCreateReason(type),
                        responsible,
                        type,
                        value,
                      }),
                      credentials: "same-origin",
                      headers: { "content-type": "application/json" },
                      method: "POST",
                    }),
                  );
                }}
              >
                <div className="border-b border-[#e6edf3] px-5 py-4">
                  <h2 className="text-lg font-semibold text-[#1d3348]">
                    {modalState.kind === "create-fundo"
                      ? "Adicionar ao Fundo de Caixa"
                      : "Registrar Sangria"}
                  </h2>
                </div>
                <div className="grid gap-4 px-5 py-5">
                  <label className="grid gap-2 text-sm font-semibold text-[#35576f]">
                    {modalState.kind === "create-fundo"
                      ? "Quem vai adicionar?"
                      : "Quem vai retirar?"}
                    <input
                      className="rounded-[4px] border border-[#cbd5df] px-3 py-2 text-sm text-[#1d3348]"
                      name="responsible"
                      required
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-[#35576f]">
                    Valor
                    <input
                      className="rounded-[4px] border border-[#cbd5df] px-3 py-2 text-sm text-[#1d3348]"
                      name="value"
                      placeholder="0,00"
                      required
                    />
                  </label>
                </div>
                <div className="flex justify-end gap-3 border-t border-[#e6edf3] px-5 py-4">
                  <button
                    className="rounded-[8px] bg-[#e5e7eb] px-4 py-2 text-sm font-semibold text-[#1d3348]"
                    onClick={closeModal}
                    type="button"
                  >
                    Voltar
                  </button>
                  <button
                    className="rounded-[8px] bg-[#246b99] px-4 py-2 text-sm font-semibold text-white"
                    disabled={isPending}
                    type="submit"
                  >
                    {isPending ? "Executando..." : "Confirmar"}
                  </button>
                </div>
              </form>
            ) : null}

            {modalState?.kind === "edit" ? (
              <form
                action={(formData) => {
                  const responsible = String(formData.get("responsible") ?? "").trim();
                  const reason = String(formData.get("reason") ?? "").trim();
                  const value = parseMoneyInput(String(formData.get("value") ?? ""));
                  handleMutation(
                    fetch("/api/painel/bilheteria/cash-movements", {
                      body: JSON.stringify({
                        actor: {
                          cpf: actorCpf,
                          name: actorName,
                        },
                        movementId: modalState.movementId,
                        reason,
                        responsible,
                        value,
                      }),
                      credentials: "same-origin",
                      headers: { "content-type": "application/json" },
                      method: "PATCH",
                    }),
                  );
                }}
              >
                <div className="border-b border-[#e6edf3] px-5 py-4">
                  <h2 className="text-lg font-semibold text-[#1d3348]">
                    Editar lancamento
                  </h2>
                </div>
                <div className="grid gap-4 px-5 py-5">
                  <label className="grid gap-2 text-sm font-semibold text-[#35576f]">
                    {modalState.movementType === "fundo"
                      ? "Quem vai adicionar?"
                      : "Quem vai retirar?"}
                    <input
                      className="rounded-[4px] border border-[#cbd5df] px-3 py-2 text-sm text-[#1d3348]"
                      defaultValue={modalState.responsible}
                      name="responsible"
                      required
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-[#35576f]">
                    Valor
                    <input
                      className="rounded-[4px] border border-[#cbd5df] px-3 py-2 text-sm text-[#1d3348]"
                      defaultValue={modalState.value.replace(".", ",")}
                      name="value"
                      required
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-[#35576f]">
                    Explique o motivo da alteracao
                    <textarea
                      className="min-h-[96px] rounded-[4px] border border-[#cbd5df] px-3 py-2 text-sm text-[#1d3348]"
                      name="reason"
                      required
                    />
                  </label>
                </div>
                <div className="flex justify-end gap-3 border-t border-[#e6edf3] px-5 py-4">
                  <button
                    className="rounded-[8px] bg-[#e5e7eb] px-4 py-2 text-sm font-semibold text-[#1d3348]"
                    onClick={closeModal}
                    type="button"
                  >
                    Voltar
                  </button>
                  <button
                    className="rounded-[8px] bg-[#246b99] px-4 py-2 text-sm font-semibold text-white"
                    disabled={isPending}
                    type="submit"
                  >
                    {isPending ? "Executando..." : "Salvar"}
                  </button>
                </div>
              </form>
            ) : null}

            {modalState?.kind === "delete" ? (
              <form
                action={(formData) => {
                  const reason = String(formData.get("reason") ?? "").trim();
                  handleMutation(
                    fetch("/api/painel/bilheteria/cash-movements", {
                      body: JSON.stringify({
                        actor: {
                          cpf: actorCpf,
                          name: actorName,
                        },
                        movementId: modalState.movementId,
                        reason,
                      }),
                      credentials: "same-origin",
                      headers: { "content-type": "application/json" },
                      method: "DELETE",
                    }),
                  );
                }}
              >
                <div className="border-b border-[#e6edf3] px-5 py-4">
                  <h2 className="text-lg font-semibold text-[#1d3348]">
                    Excluir lancamento
                  </h2>
                </div>
                <div className="grid gap-4 px-5 py-5">
                  <p className="text-sm font-semibold text-[#1d3348]">
                    Tem certeza que deseja excluir este lancamento?
                  </p>
                  <label className="grid gap-2 text-sm font-semibold text-[#35576f]">
                    Explique o motivo da exclusao
                    <textarea
                      className="min-h-[96px] rounded-[4px] border border-[#cbd5df] px-3 py-2 text-sm text-[#1d3348]"
                      name="reason"
                      required
                    />
                  </label>
                </div>
                <div className="flex justify-end gap-3 border-t border-[#e6edf3] px-5 py-4">
                  <button
                    className="rounded-[8px] bg-[#e5e7eb] px-4 py-2 text-sm font-semibold text-[#1d3348]"
                    onClick={closeModal}
                    type="button"
                  >
                    Nao
                  </button>
                  <button
                    className="rounded-[8px] bg-[#d33c3c] px-4 py-2 text-sm font-semibold text-white"
                    disabled={isPending}
                    type="submit"
                  >
                    {isPending ? "Executando..." : "Sim"}
                  </button>
                </div>
              </form>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
