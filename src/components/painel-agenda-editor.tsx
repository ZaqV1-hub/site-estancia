"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  PainelAgendaOption,
  PainelAgendaScreenData,
  PainelAgendaStatus,
  PainelAgendaType,
} from "@/lib/painel-agenda";
import {
  formatPainelAgendaDateLabel,
  getPainelAgendaStatusOptions,
  getPainelAgendaTypeOptions,
} from "@/lib/painel-agenda-ui";

type PainelAgendaEditorProps = {
  data: PainelAgendaScreenData;
  actor: {
    name: string | null;
    cpf: string | null;
  };
  mode: "create" | "edit";
  returnHref: string;
};

type RangePreviewState =
  | { status: "idle"; existingDates: string[]; hasSchoolDates: boolean }
  | { status: "loading"; existingDates: string[]; hasSchoolDates: boolean }
  | { status: "ready"; existingDates: string[]; hasSchoolDates: boolean }
  | {
      status: "error";
      existingDates: string[];
      hasSchoolDates: boolean;
      message: string;
    };

type MutationState =
  | { status: "idle"; message?: undefined }
  | { status: "submitting"; message?: undefined }
  | { status: "error"; message: string }
  | { status: "success"; message: string };

function toDateInputValue(value: string | null) {
  return value ?? "";
}

function buildDefaultForm(data: PainelAgendaScreenData) {
  const selectedDate = data.selectedDate ?? null;
  const agenda = data.selectedDay?.agenda ?? null;
  const firstPriceTable = data.priceTables[0]?.id ?? 0;
  const firstInformation = data.informationOptions[0]?.id ?? 0;

  return {
    startDate: toDateInputValue(selectedDate),
    endDate: toDateInputValue(selectedDate),
    priceTableId: agenda?.priceTableId ?? firstPriceTable,
    informationId: agenda?.informationId ?? firstInformation,
    type: (agenda?.type ?? "padra") as PainelAgendaType,
    status: (agenda?.status ?? "abe") as PainelAgendaStatus,
    promotionName: agenda?.promotionName ?? "",
    promotionDescription: agenda?.promotionDescription ?? "",
    reason: "",
  };
}

export function PainelAgendaEditor({
  data,
  actor,
  mode,
  returnHref,
}: PainelAgendaEditorProps) {
  const router = useRouter();
  const selectedAgenda = data.selectedDay?.agenda ?? null;
  const [form, setForm] = useState(() => buildDefaultForm(data));
  const [rangePreview, setRangePreview] = useState<RangePreviewState>({
    status: "idle",
    existingDates: [],
    hasSchoolDates: false,
  });
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  const [mutationState, setMutationState] = useState<MutationState>({
    status: "idle",
  });
  const [deleteReason, setDeleteReason] = useState("");

  useEffect(() => {
    if (!form.startDate || !form.endDate) {
      return;
    }

    const controller = new AbortController();

    async function loadPreview() {
      setRangePreview((current) => ({
        status: "loading",
        existingDates: current.existingDates,
        hasSchoolDates: current.hasSchoolDates,
      }));

      try {
        const response = await fetch("/api/painel/agenda/range-check", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            excludeAgendaId: selectedAgenda?.id ?? null,
            startDate: form.startDate,
            endDate: form.endDate,
          }),
          signal: controller.signal,
        });
        const payload = (await response.json()) as
          | {
              ok: true;
              data: {
                existingDates: string[];
                hasSchoolDates: boolean;
              };
            }
          | {
              ok: false;
              error: {
                message: string;
              };
            };

        if (!response.ok || !payload.ok) {
          throw new Error(
            payload.ok ? "Nao foi possivel verificar a faixa." : payload.error.message,
          );
        }

        setRangePreview({
          status: "ready",
          existingDates: payload.data.existingDates,
          hasSchoolDates: payload.data.hasSchoolDates,
        });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setRangePreview({
          status: "error",
          existingDates: [],
          hasSchoolDates: false,
          message:
            error instanceof Error
              ? error.message
              : "Nao foi possivel verificar a faixa.",
        });
      }
    }

    void loadPreview();

    return () => controller.abort();
  }, [form.startDate, form.endDate, selectedAgenda?.id]);

  const typeOptions = getPainelAgendaTypeOptions(selectedAgenda?.type ?? null);
  const statusOptions = getPainelAgendaStatusOptions();
  const overwriteRequired = rangePreview.existingDates.length > 0;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMutationState({ status: "submitting" });

    try {
      const response = await fetch("/api/painel/agenda", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agendaId: selectedAgenda?.id ?? null,
          ...form,
          confirmOverwrite,
          actor,
        }),
      });
      const payload = (await response.json()) as
        | { ok: true; data: { message: string } }
        | { ok: false; error: { message: string } };

      if (!response.ok || !payload.ok) {
        throw new Error(
          payload.ok ? "Nao foi possivel salvar a agenda." : payload.error.message,
        );
      }

      setMutationState({
        status: "success",
        message: payload.data.message,
      });
      router.replace(returnHref);
      router.refresh();
    } catch (error) {
      setMutationState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Nao foi possivel salvar a agenda.",
      });
    }
  }

  async function handleDelete() {
    if (mode !== "edit" || !selectedAgenda) {
      return;
    }

    if (!deleteReason.trim()) {
      setMutationState({
        status: "error",
        message: "Informe o motivo da exclusao da agenda.",
      });
      return;
    }

    setMutationState({ status: "submitting" });

    try {
      const response = await fetch(`/api/painel/agenda/${selectedAgenda.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: deleteReason,
          actor,
        }),
      });
      const payload = (await response.json()) as
        | { ok: true; data: { deletedDate: string } }
        | { ok: false; error: { message: string } };

      if (!response.ok || !payload.ok) {
        throw new Error(
          payload.ok ? "Nao foi possivel remover a agenda." : payload.error.message,
        );
      }

      router.replace(
        `/painel/agenda?mes=${data.month}&ano=${data.year}`,
      );
      router.refresh();
    } catch (error) {
      setMutationState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Nao foi possivel remover a agenda.",
      });
    }
  }

  return (
    <section className="rounded-[28px] border border-[#d7e5ef] bg-white p-6 shadow-[0_12px_34px_rgba(31,67,98,0.08)]">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#5d7282]">
          {mode === "create" ? "Adicionar" : "Editar"}
        </p>
        <h2 className="legacy-condensed mt-2 text-4xl text-[#205a7f]">
          {data.selectedDate
            ? formatPainelAgendaDateLabel(data.selectedDate)
            : "Nova agenda"}
        </h2>
        <p className="mt-3 text-sm leading-6 text-[#5d7282]">
          {mode === "create"
            ? "Crie uma agenda por dia ou replique a configuracao para uma faixa de datas."
            : "Atualize a configuracao do dia selecionado ou replique a alteracao para a faixa informada."}
        </p>
      </div>

      <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold text-[#345062]">
            Dia inicio
            <input
              type="date"
              value={form.startDate}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  startDate: event.target.value,
                }))
              }
              className="rounded-2xl border border-[#c8d8e3] px-4 py-3 text-sm font-normal text-[#1b3447]"
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-[#345062]">
            Dia fim
            <input
              type="date"
              value={form.endDate}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  endDate: event.target.value,
                }))
              }
              className="rounded-2xl border border-[#c8d8e3] px-4 py-3 text-sm font-normal text-[#1b3447]"
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold text-[#345062]">
            Tabela de preco
            <select
              value={form.priceTableId}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  priceTableId: Number(event.target.value),
                }))
              }
              className="rounded-2xl border border-[#c8d8e3] px-4 py-3 text-sm font-normal text-[#1b3447]"
            >
              {data.priceTables.map((option: PainelAgendaOption) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-semibold text-[#345062]">
            Informacoes
            <select
              value={form.informationId}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  informationId: Number(event.target.value),
                }))
              }
              className="rounded-2xl border border-[#c8d8e3] px-4 py-3 text-sm font-normal text-[#1b3447]"
            >
              {data.informationOptions.map((option: PainelAgendaOption) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold text-[#345062]">
            Tipo da agenda
            <select
              value={form.type}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  type: event.target.value as PainelAgendaType,
                }))
              }
              className="rounded-2xl border border-[#c8d8e3] px-4 py-3 text-sm font-normal text-[#1b3447]"
            >
              {typeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-semibold text-[#345062]">
            Status da agenda
            <select
              value={form.status}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  status: event.target.value as PainelAgendaStatus,
                }))
              }
              className="rounded-2xl border border-[#c8d8e3] px-4 py-3 text-sm font-normal text-[#1b3447]"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {form.type === "promo" ? (
          <div className="grid gap-4">
            <label className="grid gap-2 text-sm font-semibold text-[#345062]">
              Nome promocional
              <input
                type="text"
                value={form.promotionName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    promotionName: event.target.value,
                  }))
                }
                className="rounded-2xl border border-[#c8d8e3] px-4 py-3 text-sm font-normal text-[#1b3447]"
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-[#345062]">
              Descricao promocional
              <textarea
                value={form.promotionDescription}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    promotionDescription: event.target.value,
                  }))
                }
                rows={3}
                className="rounded-2xl border border-[#c8d8e3] px-4 py-3 text-sm font-normal text-[#1b3447]"
              />
            </label>
          </div>
        ) : null}

        <label className="grid gap-2 text-sm font-semibold text-[#345062]">
          Motivo da alteracao
          <textarea
            value={form.reason}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                reason: event.target.value,
              }))
            }
            rows={3}
            className="rounded-2xl border border-[#c8d8e3] px-4 py-3 text-sm font-normal text-[#1b3447]"
          />
        </label>

        {rangePreview.status === "error" ? (
          <div className="rounded-2xl border border-[#f1b1aa] bg-[#fff4f2] px-4 py-3 text-sm text-[#9d3d31]">
            {rangePreview.message}
          </div>
        ) : null}

        {overwriteRequired ? (
          <label className="flex items-start gap-3 rounded-2xl border border-[#f0d9aa] bg-[#fff7ea] px-4 py-3 text-sm text-[#7a5b20]">
            <input
              type="checkbox"
              checked={confirmOverwrite}
              onChange={(event) => setConfirmOverwrite(event.target.checked)}
              className="mt-1"
            />
            <span>
              Atualizar as datas ja existentes:{" "}
              {rangePreview.existingDates
                .map(formatPainelAgendaDateLabel)
                .join(", ")}
            </span>
          </label>
        ) : null}

        {rangePreview.hasSchoolDates && form.type !== "escol" ? (
          <div className="rounded-2xl border border-[#f1b1aa] bg-[#fff4f2] px-4 py-3 text-sm text-[#9d3d31]">
            A faixa selecionada contem agendas escolares. So e permitido manter o tipo escolar nesses dias.
          </div>
        ) : null}

        {mutationState.status === "error" ? (
          <div className="rounded-2xl border border-[#f1b1aa] bg-[#fff4f2] px-4 py-3 text-sm text-[#9d3d31]">
            {mutationState.message}
          </div>
        ) : null}

        {mutationState.status === "success" ? (
          <div className="rounded-2xl border border-[#c8e5cf] bg-[#f2fbf5] px-4 py-3 text-sm text-[#2f6a3f]">
            {mutationState.message}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={
              mutationState.status === "submitting" ||
              (overwriteRequired && !confirmOverwrite) ||
              (rangePreview.hasSchoolDates && form.type !== "escol")
            }
            className="rounded-full bg-[#246b99] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {mutationState.status === "submitting" ? "Salvando..." : "Salvar agenda"}
          </button>

          <button
            type="button"
            onClick={() => router.replace(returnHref)}
            className="rounded-full border border-[#c8d8e3] px-5 py-3 text-sm font-semibold text-[#35576f]"
          >
            Voltar
          </button>
          {mode === "edit" && selectedAgenda ? (
            <>
              <input
                type="text"
                value={deleteReason}
                onChange={(event) => setDeleteReason(event.target.value)}
                placeholder="Motivo da exclusao"
                className="min-w-[220px] rounded-full border border-[#c8d8e3] px-4 py-3 text-sm text-[#1b3447]"
              />
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={mutationState.status === "submitting"}
                className="rounded-full border border-[#d05f56] px-5 py-3 text-sm font-semibold text-[#b24239] disabled:opacity-60"
              >
                Remover dia
              </button>
            </>
          ) : null}
        </div>
      </form>
    </section>
  );
}
