"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import {
  type PainelAgendaDayDetail,
  type PainelAgendaMonthEntry,
  type PainelAgendaScreenData,
} from "@/lib/painel-agenda";
import {
  buildPainelAgendaCalendar,
  formatPainelAgendaDateLabel,
  formatPainelAgendaMonthLabel,
} from "@/lib/painel-agenda-ui";

type PainelAgendaManagerProps = {
  data: PainelAgendaScreenData;
};

type AgendaToneInput = Pick<PainelAgendaMonthEntry, "status" | "type">;

function addMonths(month: number, year: number, delta: number) {
  const date = new Date(year, month - 1 + delta, 1);

  return {
    month: date.getMonth() + 1,
    year: date.getFullYear(),
  };
}

function formatMoney(value: string | null) {
  if (!value) {
    return "-";
  }

  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return "-";
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(numeric);
}

function getAgendaBaseToneClasses(entry?: AgendaToneInput) {
  if (!entry) {
    return "border-[#d9e3eb] bg-white text-[#a9b8c4]";
  }

  if (entry.status === "lot") {
    return "border-[#c90011] bg-[#c90011] text-white";
  }

  if (entry.status === "fec") {
    return "border-[#90a9bd] bg-[#dce8f2] text-[#24455d]";
  }

  if (entry.type === "promo") {
    return "border-[#ff6138] bg-[#ff6138] text-white";
  }

  if (entry.type === "escol") {
    return "border-[#2e60ff] bg-[#2e60ff] text-white";
  }

  return "border-[#8dc72b] bg-[#8dc72b] text-white";
}

export function getAgendaToneClasses(
  entry: AgendaToneInput | undefined,
  active: boolean,
) {
  const baseClasses = getAgendaBaseToneClasses(entry);

  if (!active) {
    return baseClasses;
  }

  return `${baseClasses} ring-2 ring-[#205a7f] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.38)]`;
}

function getSelectedDayCardClasses(entry: AgendaToneInput | undefined) {
  if (!entry) {
    return "border-[#d9e3eb] bg-[#f7fafc] text-[#345062]";
  }

  if (entry.status === "lot") {
    return "border-[#f2b1b6] bg-[#fff3f4] text-[#8f1e26]";
  }

  if (entry.status === "fec") {
    return "border-[#bfd0de] bg-[#eef4f8] text-[#24455d]";
  }

  if (entry.type === "promo") {
    return "border-[#ffd0c0] bg-[#fff4ef] text-[#9f4420]";
  }

  if (entry.type === "escol") {
    return "border-[#bfd0ff] bg-[#edf3ff] text-[#244a9f]";
  }

  return "border-[#cfe7a1] bg-[#f6fbeb] text-[#355824]";
}

function buildQuery(month: number, year: number, selectedDate?: string | null) {
  const params = new URLSearchParams();
  params.set("mes", String(month));
  params.set("ano", String(year));

  if (selectedDate) {
    params.set("dia", selectedDate);
  }

  return params.toString();
}

function buildAgendaHref(
  month: number,
  year: number,
  selectedDate?: string | null,
) {
  const query = buildQuery(month, year, selectedDate ? null : undefined);

  if (selectedDate) {
    return `/painel/agenda/${selectedDate}?${query}`;
  }

  return `/painel/agenda?${query}`;
}

function buildAgendaAddHref(
  month: number,
  year: number,
  selectedDate?: string | null,
) {
  const params = new URLSearchParams();
  params.set("mes", String(month));
  params.set("ano", String(year));

  if (selectedDate) {
    params.set("dia", selectedDate);
  }

  return `/painel/agenda/adicionar?${params.toString()}`;
}

function buildAgendaDayApiHref(selectedDate: string) {
  const params = new URLSearchParams();
  params.set("date", selectedDate);

  return `/api/painel/agenda?${params.toString()}`;
}

type SelectedDayResponse = {
  ok: true;
  data: PainelAgendaDayDetail;
};

type SelectedDayErrorResponse = {
  ok: false;
  error?: {
    code?: string;
    message?: string;
  };
};

async function readResponseBody<T>(response: Response) {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export function PainelAgendaManager({ data }: PainelAgendaManagerProps) {
  const entriesByDate = useMemo(
    () => new Map(data.entries.map((entry) => [entry.date, entry])),
    [data.entries],
  );
  const calendarCells = useMemo(
    () => buildPainelAgendaCalendar(data.month, data.year),
    [data.month, data.year],
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(data.selectedDate);
  const [selectedDay, setSelectedDay] = useState<PainelAgendaDayDetail | null>(
    data.selectedDay,
  );
  const [loadingDate, setLoadingDate] = useState<string | null>(null);
  const [selectedDayError, setSelectedDayError] = useState<string | null>(null);
  const [dayCache, setDayCache] = useState<Record<string, PainelAgendaDayDetail>>(() =>
    data.selectedDate && data.selectedDay ? { [data.selectedDate]: data.selectedDay } : {},
  );
  const requestSequenceRef = useRef(0);
  const selectedAgenda = selectedDay?.agenda ?? null;
  const previousMonth = addMonths(data.month, data.year, -1);
  const nextMonth = addMonths(data.month, data.year, 1);
  const isDayLoading = loadingDate === selectedDate;
  const selectedVoucherCount = selectedDay?.vouchers.length ?? 0;

  async function handleDateSelection(nextSelectedDate: string) {
    if (nextSelectedDate === selectedDate) {
      return;
    }

    setSelectedDate(nextSelectedDate);
    setSelectedDayError(null);

    if (typeof window !== "undefined") {
      window.history.replaceState(
        null,
        "",
        buildAgendaHref(data.month, data.year, nextSelectedDate),
      );
    }

    if (dayCache[nextSelectedDate]) {
      setSelectedDay(dayCache[nextSelectedDate]);
      setLoadingDate(null);
      return;
    }

    setSelectedDay(null);
    setLoadingDate(nextSelectedDate);
    const requestSequence = requestSequenceRef.current + 1;
    requestSequenceRef.current = requestSequence;

    try {
      const response = await fetch(buildAgendaDayApiHref(nextSelectedDate), {
        cache: "no-store",
      });
      const payload = await readResponseBody<
        SelectedDayResponse | SelectedDayErrorResponse
      >(response);

      if (!response.ok || !payload?.ok) {
        throw new Error(
          payload && !payload.ok
            ? payload.error?.message || "Nao foi possivel carregar o dia."
            : "Nao foi possivel carregar o dia.",
        );
      }

      if (requestSequenceRef.current !== requestSequence) {
        return;
      }

      setDayCache((current) => ({
        ...current,
        [nextSelectedDate]: payload.data,
      }));
      setSelectedDay(payload.data);
    } catch (error) {
      if (requestSequenceRef.current !== requestSequence) {
        return;
      }

      console.error("painel-agenda-day-selection-failed", error);
      setSelectedDayError("Nao foi possivel carregar o dia agora.");
    } finally {
      if (requestSequenceRef.current === requestSequence) {
        setLoadingDate(null);
      }
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-[1260px] gap-4">
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,780px)_minmax(320px,1fr)]">
        <section className="rounded-[28px] border border-[#d7e5ef] bg-white p-4 shadow-[0_12px_28px_rgba(31,67,98,0.08)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#5d7282]">
                Agenda
              </p>
              <h1 className="legacy-condensed mt-1 text-[2.8rem] leading-none text-[#205a7f]">
                {formatPainelAgendaMonthLabel(data.month, data.year)}
              </h1>
            </div>

            <Link
              href={buildAgendaAddHref(
                data.month,
                data.year,
                selectedDate,
              )}
              className="rounded-full border border-[#c9d8e3] px-4 py-2 text-sm font-semibold text-[#205a7f] hover:bg-[#edf5fa]"
            >
              Adicionar
            </Link>
          </div>

          <div className="mt-4 rounded-[24px] border border-[#d9e3eb]">
            <div className="grid grid-cols-[56px_1fr_56px] items-center rounded-t-[24px] bg-[#3394d6] text-white">
              <Link
                href={buildAgendaHref(
                  previousMonth.month,
                  previousMonth.year,
                )}
                className="flex h-12 items-center justify-center text-3xl font-semibold hover:bg-white/10"
              >
                {"<"}
              </Link>
              <div className="text-center text-[1.9rem] font-semibold">
                {formatPainelAgendaMonthLabel(data.month, data.year)}
              </div>
              <Link
                href={buildAgendaHref(nextMonth.month, nextMonth.year)}
                className="flex h-12 items-center justify-center text-3xl font-semibold hover:bg-white/10"
              >
                {">"}
              </Link>
            </div>

            <div className="grid grid-cols-7 border-b border-[#d9e3eb] bg-[#225f88] text-center text-sm font-semibold text-white">
              {["D", "S", "T", "Q", "Q", "S", "S"].map((label, index) => (
                <div key={`${label}-${index}`} className="px-2 py-2.5">
                  {label}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 bg-[#edf3f7] p-1">
              {calendarCells.map((cell) => {
                const entry = entriesByDate.get(cell.date);
                const active = cell.date === selectedDate;
                const classes = `min-h-[78px] rounded-[16px] border px-2.5 py-2.5 text-left transition hover:opacity-95 ${getAgendaToneClasses(
                  entry,
                  active,
                )}`;

                if (!cell.inMonth) {
                  return (
                    <div key={cell.key} className={classes}>
                      <div className="text-lg font-semibold">{cell.day}</div>
                    </div>
                  );
                }

                return (
                  <button
                    key={cell.key}
                    type="button"
                    onClick={() => void handleDateSelection(cell.date)}
                    disabled={loadingDate === cell.date}
                    className={`${classes} disabled:cursor-wait disabled:opacity-80`}
                  >
                    <div className="text-lg font-semibold">{cell.day}</div>
                    {entry ? (
                      <div className="mt-1.5 text-[11px] leading-4">
                        <div>{entry.typeLabel}</div>
                        <div>{entry.statusLabel}</div>
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-[#4f6472]">
            <div className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 rounded bg-[#8dc72b]" />
              Data padrao
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 rounded bg-[#ff6138]" />
              Data promocional
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 rounded bg-[#2e60ff]" />
              Data escolar
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 rounded bg-[#c90011]" />
              Data esgotada
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-[#d7e5ef] bg-white p-4 shadow-[0_12px_28px_rgba(31,67,98,0.08)] xl:sticky xl:top-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#5d7282]">
              Dia selecionado
            </p>
            <h2 className="legacy-condensed mt-1 text-[2.8rem] leading-none text-[#205a7f]">
              {selectedDate
                ? formatPainelAgendaDateLabel(selectedDate)
                : "Selecione um dia"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#5d7282]">
              Consulte o resumo do dia e edite a agenda quando precisar.
            </p>
          </div>

          {isDayLoading ? (
            <div className="mt-4 rounded-[20px] border border-dashed border-[#c8d8e3] bg-[#f8fbfd] px-4 py-4 text-sm text-[#5d7282]">
              Carregando dados do dia...
            </div>
          ) : null}

          {selectedDayError ? (
            <div className="mt-4 rounded-[22px] border border-[#efc3c3] bg-[#fff3f1] px-4 py-3 text-sm text-[#9f3f36]">
              {selectedDayError}
            </div>
          ) : null}

          {selectedAgenda ? (
            <div
              className={`mt-4 rounded-[20px] border p-4 text-sm ${getSelectedDayCardClasses(
                selectedAgenda,
              )}`}
            >
              <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
                <div>
                  <span className="font-semibold">Tipo:</span> {selectedAgenda.typeLabel}
                </div>
                <div>
                  <span className="font-semibold">Status:</span> {selectedAgenda.statusLabel}
                </div>
                <div>
                  <span className="font-semibold">Tabela:</span>{" "}
                  {selectedAgenda.priceTableName || "-"}
                </div>
                <div>
                  <span className="font-semibold">Informacao:</span>{" "}
                  {selectedAgenda.informationName || "-"}
                </div>
                <div>
                  <span className="font-semibold">Adulto:</span>{" "}
                  {formatMoney(selectedAgenda.normalValue)}
                </div>
                <div>
                  <span className="font-semibold">Infantil:</span>{" "}
                  {formatMoney(selectedAgenda.childValue)}
                </div>
                <div className="sm:col-span-2">
                  <span className="font-semibold">Vouchers do dia:</span>{" "}
                  {selectedVoucherCount}
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-3">
            {selectedDate ? (
              <Link
                href={`/painel/agenda/${selectedDate}/editar?mes=${data.month}&ano=${data.year}`}
                className="rounded-full bg-[#246b99] px-5 py-3 text-sm font-semibold text-white"
              >
                Editar dia
              </Link>
            ) : (
              <Link
                href={buildAgendaAddHref(data.month, data.year, data.selectedDate)}
                className="rounded-full bg-[#246b99] px-5 py-3 text-sm font-semibold text-white"
              >
                Adicionar agenda
              </Link>
            )}
          </div>
        </section>
      </div>

      {selectedDay && selectedDay.vouchers.length > 0 ? (
        <section className="rounded-[28px] border border-[#d7e5ef] bg-white p-4 shadow-[0_12px_28px_rgba(31,67,98,0.08)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#5d7282]">
                Vouchers do dia
              </p>
              <h2 className="legacy-condensed mt-2 text-4xl text-[#205a7f]">
                {formatPainelAgendaDateLabel(selectedDay.selectedDate)}
              </h2>
            </div>
            <div className="text-sm text-[#5d7282]">
              {selectedDay.vouchers.length} voucher(s)
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 overflow-hidden rounded-[22px] border border-[#d9e3eb] text-sm">
              <thead className="bg-[#edf5fa] text-left text-[#345062]">
                <tr>
                  <th className="px-4 py-3">Compra</th>
                  <th className="px-4 py-3">Usuario</th>
                  <th className="px-4 py-3">Telefone</th>
                  <th className="px-4 py-3">Celular</th>
                  <th className="px-4 py-3">E-mail</th>
                  <th className="px-4 py-3">Voucher</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Valor</th>
                  <th className="px-4 py-3">Data de uso</th>
                  <th className="px-4 py-3">Usado?</th>
                </tr>
              </thead>
              <tbody>
                {selectedDay.vouchers.map((voucher, index) => (
                  <tr
                    key={`${voucher.purchaseId}-${voucher.voucherNumber}-${index}`}
                    className={index % 2 === 0 ? "bg-white" : "bg-[#f8fbfd]"}
                  >
                    <td className="px-4 py-3 font-semibold text-[#205a7f]">
                      {voucher.purchaseId}
                    </td>
                    <td className="px-4 py-3">{voucher.customerName || "-"}</td>
                    <td className="px-4 py-3">{voucher.phone || "-"}</td>
                    <td className="px-4 py-3">{voucher.mobile || "-"}</td>
                    <td className="px-4 py-3">{voucher.email || "-"}</td>
                    <td className="px-4 py-3">{voucher.voucherNumber || "-"}</td>
                    <td className="px-4 py-3">{voucher.voucherTypeLabel || "-"}</td>
                    <td className="px-4 py-3">{formatMoney(voucher.unitValue)}</td>
                    <td className="px-4 py-3">
                      {voucher.useDate
                        ? formatPainelAgendaDateLabel(voucher.useDate)
                        : "-"}
                    </td>
                    <td className="px-4 py-3">{voucher.used ? "Sim" : "Nao"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
