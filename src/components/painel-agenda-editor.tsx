"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  PainelAgendaScreenData,
  PainelAgendaStatus,
  PainelAgendaType,
} from "@/lib/painel-agenda";
import {
  formatPainelAgendaDateLabel,
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
  initialType?: PainelAgendaType;
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

function defaultReason(selectedDate: string | null) {
  return selectedDate
    ? `Atualização da agenda de ${formatPainelAgendaDateLabel(selectedDate)}`
    : "Criação de agenda pelo painel";
}

function buildDefaultForm(
  data: PainelAgendaScreenData,
  initialType?: PainelAgendaType,
) {
  const selectedDate = data.selectedDate ?? null;
  const agenda = data.selectedDay?.agenda ?? null;
  const firstPriceTable = data.priceTables[0]?.id ?? 0;
  const firstInformation = data.informationOptions[0]?.id ?? 0;

  return {
    startDate: selectedDate ?? "",
    endDate: selectedDate ?? "",
    priceTableId: agenda?.priceTableId ?? firstPriceTable,
    informationId: agenda?.informationId ?? firstInformation,
    type: (agenda?.type ?? initialType ?? "padra") as PainelAgendaType,
    status: (agenda?.status ?? "abe") as PainelAgendaStatus,
    promotionName: agenda?.promotionName ?? "",
    promotionDescription: agenda?.promotionDescription ?? "",
    reason: defaultReason(selectedDate),
  };
}

const defaultPassports = [
  "Passaporte Explorador",
  "Passaporte Aventura",
  "Passaporte Infantil",
];

const defaultAddons = [
  "Almoço Caipira",
  "Café da Manhã",
  "Ecobag",
  "Kit Bebidas",
];

export function PainelAgendaEditor({
  data,
  actor,
  mode,
  returnHref,
  initialType,
}: PainelAgendaEditorProps) {
  const router = useRouter();
  const selectedAgenda = data.selectedDay?.agenda ?? null;
  const [form, setForm] = useState(() => buildDefaultForm(data, initialType));
  const [rangePreview, setRangePreview] = useState<RangePreviewState>({
    status: "idle",
    existingDates: [],
    hasSchoolDates: false,
  });
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  const [mutationState, setMutationState] = useState<MutationState>({
    status: "idle",
  });

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
            payload.ok
              ? "Não foi possível verificar a faixa."
              : payload.error.message,
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
              : "Não foi possível verificar a faixa.",
        });
      }
    }

    void loadPreview();

    return () => controller.abort();
  }, [form.startDate, form.endDate, selectedAgenda?.id]);

  const typeOptions = getPainelAgendaTypeOptions(selectedAgenda?.type ?? null);
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
          payload.ok ? "Não foi possível salvar a agenda." : payload.error.message,
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
            : "Não foi possível salvar a agenda.",
      });
    }
  }

  async function handleDelete() {
    if (mode !== "edit" || !selectedAgenda) {
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
          reason: "Remoção da agenda pelo painel",
          actor,
        }),
      });
      const payload = (await response.json()) as
        | { ok: true; data: { deletedDate: string } }
        | { ok: false; error: { message: string } };

      if (!response.ok || !payload.ok) {
        throw new Error(
          payload.ok ? "Não foi possível remover a agenda." : payload.error.message,
        );
      }

      router.replace(`/painel/agenda?mes=${data.month}&ano=${data.year}`);
      router.refresh();
    } catch (error) {
      setMutationState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível remover a agenda.",
      });
    }
  }

  return (
    <section className="panel-section p-5">
      <div>
        <p className="panel-eyebrow">
          {mode === "create" ? "Adicionar" : "Editar"}
        </p>
        <h2 className="mt-2 text-[34px] font-black leading-tight text-[#17351f]">
          {data.selectedDate
            ? formatPainelAgendaDateLabel(data.selectedDate)
            : "Nova agenda"}
        </h2>
        <p className="mt-3 text-[15px] leading-7 text-[#5f7564]">
          {mode === "create"
            ? "Configure a data, os passaportes e os itens disponíveis."
            : "Atualize a data, os passaportes e os itens disponíveis."}
        </p>
      </div>

      <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 lg:grid-cols-[0.7fr_0.5fr]">
          <label className="grid gap-2 text-sm font-semibold text-[#17351f]">
            Data
            <input
              type="date"
              value={form.startDate}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  startDate: event.target.value,
                  endDate: event.target.value,
                }))
              }
              className="rounded-[8px] border border-[#dbe7d7] px-4 py-3 text-sm font-normal text-[#17351f]"
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-[#17351f]">
            Tipo da agenda
            <select
              value={form.type}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  type: event.target.value as PainelAgendaType,
                }))
              }
              className="rounded-[8px] border border-[#dbe7d7] px-4 py-3 text-sm font-normal text-[#17351f]"
            >
              {typeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {form.type === "promo" ? (
          <div className="grid gap-4 rounded-[8px] border border-[#dbe7d7] bg-[#fbfdf9] p-4">
            <label className="grid gap-2 text-sm font-semibold text-[#17351f]">
              Nome da promoção
              <input
                type="text"
                value={form.promotionName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    promotionName: event.target.value,
                  }))
                }
                className="rounded-[8px] border border-[#dbe7d7] px-4 py-3 text-sm font-normal text-[#17351f]"
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-[#17351f]">
              Descrição da promoção
              <textarea
                value={form.promotionDescription}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    promotionDescription: event.target.value,
                  }))
                }
                rows={3}
                className="rounded-[8px] border border-[#dbe7d7] px-4 py-3 text-sm font-normal text-[#17351f]"
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-[#17351f]">
              Imagem do evento
              <input
                type="file"
                accept="image/*"
                className="rounded-[8px] border border-dashed border-[#b9d3b1] bg-white px-4 py-3 text-sm font-normal text-[#17351f]"
              />
            </label>
          </div>
        ) : null}

        <section className="grid gap-4 rounded-[8px] border border-[#dbe7d7] bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="panel-eyebrow">Passaportes</p>
              <h3 className="mt-1 text-xl font-black text-[#17351f]">
                Seleção de passaportes
              </h3>
            </div>
            <button
              type="button"
              className="rounded-full border border-[#dbe7d7] px-4 py-2 text-xs font-black text-[#17351f]"
            >
              Adicionar especial
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {defaultPassports.map((item) => (
              <label
                key={item}
                className="flex items-center gap-3 rounded-[8px] border border-[#dbe7d7] bg-[#fbfdf9] p-3 text-sm font-black text-[#17351f]"
              >
                <input type="checkbox" defaultChecked className="h-4 w-4" />
                {item}
              </label>
            ))}
          </div>
        </section>

        <section className="grid gap-4 rounded-[8px] border border-[#dbe7d7] bg-white p-4">
          <div>
            <p className="panel-eyebrow">Itens adicionais</p>
            <h3 className="mt-1 text-xl font-black text-[#17351f]">
              Itens disponíveis na data
            </h3>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            {defaultAddons.map((item) => (
              <label
                key={item}
                className="flex items-center gap-3 rounded-[8px] border border-[#dbe7d7] bg-[#fbfdf9] p-3 text-sm font-black text-[#17351f]"
              >
                <input type="checkbox" defaultChecked className="h-4 w-4" />
                {item}
              </label>
            ))}
          </div>
        </section>

        {rangePreview.status === "error" ? (
          <div className="rounded-[8px] border border-[#f1b1aa] bg-[#fff4f2] px-4 py-3 text-sm text-[#9d3d31]">
            {rangePreview.message}
          </div>
        ) : null}

        {overwriteRequired ? (
          <label className="flex items-start gap-3 rounded-[8px] border border-[#f0d9aa] bg-[#fff7ea] px-4 py-3 text-sm text-[#7a5b20]">
            <input
              type="checkbox"
              checked={confirmOverwrite}
              onChange={(event) => setConfirmOverwrite(event.target.checked)}
              className="mt-1"
            />
            <span>
              Atualizar as datas já existentes:{" "}
              {rangePreview.existingDates
                .map(formatPainelAgendaDateLabel)
                .join(", ")}
            </span>
          </label>
        ) : null}

        {rangePreview.hasSchoolDates && form.type !== "escol" ? (
          <div className="rounded-[8px] border border-[#f1b1aa] bg-[#fff4f2] px-4 py-3 text-sm text-[#9d3d31]">
            A faixa selecionada contém agendas escolares. Só é permitido manter o tipo escolar nesses dias.
          </div>
        ) : null}

        {mutationState.status === "error" ? (
          <div className="rounded-[8px] border border-[#f1b1aa] bg-[#fff4f2] px-4 py-3 text-sm text-[#9d3d31]">
            {mutationState.message}
          </div>
        ) : null}

        {mutationState.status === "success" ? (
          <div className="rounded-[8px] border border-[#c8e5cf] bg-[#f2fbf5] px-4 py-3 text-sm text-[#2f6a3f]">
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
            className="rounded-full bg-[#2b8c46] px-5 py-3 text-sm font-black text-white disabled:opacity-60"
          >
            {mutationState.status === "submitting" ? "Salvando..." : "Salvar agenda"}
          </button>

          <button
            type="button"
            onClick={() => router.replace(returnHref)}
            className="rounded-full border border-[#dbe7d7] px-5 py-3 text-sm font-black text-[#17351f]"
          >
            Voltar
          </button>

          {mode === "edit" && selectedAgenda ? (
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={mutationState.status === "submitting"}
              className="rounded-full border border-[#d05f56] px-5 py-3 text-sm font-black text-[#b24239] disabled:opacity-60"
            >
              Remover dia
            </button>
          ) : null}
        </div>
      </form>
    </section>
  );
}
