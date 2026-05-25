"use client";

import Link from "next/link";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import type {
  BffErrorResponse,
  PublicAgendaEvent,
  PublicAgendaMonth,
  PublicAgendaResponse,
} from "@/lib/agenda-contracts";
import {
  buildPublicAgendaPurchaseHref,
  buildPublicAgendaSelectionHref,
} from "@/lib/public-agenda-selection";

const monthFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
});

const fullDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const weekdayLabels = [
  { key: "sun", label: "D" },
  { key: "mon", label: "S" },
  { key: "tue", label: "T" },
  { key: "wed", label: "Q" },
  { key: "thu", label: "Q" },
  { key: "fri", label: "S" },
  { key: "sat", label: "S" },
];

type PublicAgendaProps = {
  initialMonth: number;
  initialYear: number;
  availableMonths: PublicAgendaMonth[];
  initialEvents: PublicAgendaEvent[];
  initialError?: string;
  initialSelectedAgendaId?: number | null;
};

type LoadState =
  | { status: "loading"; events: PublicAgendaEvent[]; error?: undefined }
  | { status: "ready"; events: PublicAgendaEvent[]; error?: undefined }
  | { status: "error"; events: PublicAgendaEvent[]; error: string };

type CalendarDay = {
  key: string;
  day: number;
  inMonth: boolean;
};

function getMonthLabel(month: number, year: number) {
  const label = monthFormatter.format(new Date(year, month - 1, 1));

  return label.charAt(0).toUpperCase() + label.slice(1);
}

function getMonthKey(month: number, year: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function buildCalendarDays(month: number, year: number) {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const previousMonthDays = new Date(year, month - 1, 0).getDate();
  const days: CalendarDay[] = [];

  for (let offset = firstDay - 1; offset >= 0; offset -= 1) {
    const day = previousMonthDays - offset;

    days.push({
      key: `prev-${day}`,
      day,
      inMonth: false,
    });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push({
      key: `current-${day}`,
      day,
      inMonth: true,
    });
  }

  let nextMonthDay = 1;

  while (days.length % 7 !== 0) {
    days.push({
      key: `next-${nextMonthDay}`,
      day: nextMonthDay,
      inMonth: false,
    });
    nextMonthDay += 1;
  }

  return days;
}

function formatDateLabel(event: PublicAgendaEvent) {
  const label = fullDateFormatter.format(
    new Date(`${event.date}T12:00:00`),
  );

  return label.charAt(0).toUpperCase() + label.slice(1);
}

function updateUrl(month: number, year: number, selectedAgendaId?: number | null) {
  const url = new URL(window.location.href);
  url.searchParams.set("mes", String(month));
  url.searchParams.set("ano", String(year));

  if (selectedAgendaId) {
    url.searchParams.set("agendaId", String(selectedAgendaId));
  } else {
    url.searchParams.delete("agendaId");
  }

  window.history.replaceState(null, "", url);
}

function isSameMonth(month: number, year: number, now: Date) {
  return month === now.getMonth() + 1 && year === now.getFullYear();
}

export function PublicAgenda({
  initialMonth,
  initialYear,
  availableMonths,
  initialEvents,
  initialError,
  initialSelectedAgendaId = null,
}: PublicAgendaProps) {
  const initialPeriodKey = useRef(`${initialYear}-${initialMonth}`);
  const [period, setPeriod] = useState({
    month: initialMonth,
    year: initialYear,
  });
  const [selectedEventId, setSelectedEventId] = useState<number | null>(
    initialSelectedAgendaId,
  );
  const [state, setState] = useState<LoadState>(
    initialError
      ? {
          status: "error",
          events: [],
          error: initialError,
        }
      : {
          status: "ready",
          events: initialEvents,
        },
  );

  useEffect(() => {
    updateUrl(period.month, period.year, selectedEventId);
  }, [period.month, period.year, selectedEventId]);

  useEffect(() => {
    const periodKey = `${period.year}-${period.month}`;

    if (initialPeriodKey.current === periodKey) {
      initialPeriodKey.current = "";
      return;
    }

    const controller = new AbortController();

    async function loadAgenda() {
      setState((current) => ({
        status: "loading",
        events: current.events,
      }));

      try {
        const response = await fetch(
          `/api/agenda/publica?mes=${period.month}&ano=${period.year}`,
          {
            signal: controller.signal,
          },
        );
        const payload = (await response.json()) as
          | PublicAgendaResponse
          | BffErrorResponse;

        if (!response.ok || !payload.ok) {
          throw new Error(
            payload.ok
              ? "Nao foi possivel consultar a agenda."
              : payload.error.message,
          );
        }

        setState({
          status: "ready",
          events: payload.data.events,
        });
        setSelectedEventId(null);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setState({
          status: "error",
          events: [],
          error:
            error instanceof Error
              ? error.message
              : "Nao foi possivel consultar a agenda.",
        });
      }
    }

    loadAgenda();

    return () => controller.abort();
  }, [period.month, period.year]);

  const eventsByDay = useMemo(
    () => new Map(state.events.map((event) => [event.day, event])),
    [state.events],
  );
  const days = buildCalendarDays(period.month, period.year);
  const sortedEvents = [...state.events].sort((first, second) =>
    first.date.localeCompare(second.date),
  );
  const selectedEvent =
    sortedEvents.find((event) => event.id === selectedEventId) ?? null;
  const now = new Date();
  const currentMonthIndex = availableMonths.findIndex(
    (item) => item.month === period.month && item.year === period.year,
  );
  const previousPeriod =
    currentMonthIndex > 0 ? availableMonths[currentMonthIndex - 1] : null;
  const nextPeriod =
    currentMonthIndex >= 0 && currentMonthIndex < availableMonths.length - 1
      ? availableMonths[currentMonthIndex + 1]
      : null;

  function changeMonth(next: PublicAgendaMonth) {
    if (getMonthKey(next.month, next.year) === getMonthKey(period.month, period.year)) {
      return;
    }

    startTransition(() => {
      setSelectedEventId(null);
      setPeriod({
        month: next.month,
        year: next.year,
      });
    });
  }

  return (
    <div className="min-h-[calc(100vh-108px)] text-[#17312d]">
      <div className="mx-auto w-[min(1240px,calc(100%-40px))] py-14 md:py-20">
        <div className="grid gap-8 text-left md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="mb-4 text-[12px] font-bold uppercase tracking-[0.2em] text-[#1e5564]">
              Agendamento
            </p>
            <h1 className="m-0 max-w-[620px] text-[clamp(2.4rem,5vw,4rem)] font-semibold leading-none text-[#17342d]">
              Escolha a data da visita
            </h1>
          </div>

          <div className="grid grid-cols-4 overflow-hidden rounded-full border border-[rgba(35,73,63,0.12)] bg-white/86 p-1 text-center text-[11px] font-bold text-[#5e746e] shadow-[0_16px_36px_rgba(25,54,48,0.07)] md:min-w-[520px] md:text-[13px]">
            <span className="rounded-full bg-[#17342d] px-3 py-3 text-white">
              Data
            </span>
            <span className="px-3 py-3">Passaportes</span>
            <span className="px-3 py-3">Adicionais</span>
            <span className="px-3 py-3">Pagamento</span>
          </div>
        </div>

        {state.status === "error" ? (
          <div className="mt-8 rounded-[8px] border border-[#efc3c3] bg-[#fff3f1] px-4 py-3 text-left text-sm font-semibold text-[#9f3f36]">
            {state.error}
          </div>
        ) : null}

        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-[8px] border border-[rgba(35,73,63,0.08)] bg-white/92 p-4 shadow-[0_18px_42px_rgba(19,48,41,0.08)] md:p-6">
            <div className="grid grid-cols-[48px_1fr_48px] items-center gap-3">
              <button
                type="button"
                aria-label="Mes anterior"
                disabled={!previousPeriod}
                onClick={() => previousPeriod && changeMonth(previousPeriod)}
                className="flex h-12 w-12 items-center justify-center rounded-full border border-[rgba(35,73,63,0.12)] text-[24px] font-black text-[#23493f] hover:border-[#23493f] disabled:cursor-not-allowed disabled:opacity-35"
              >
                ‹
              </button>
              <h2 className="text-center text-[25px] font-semibold text-[#17342d] md:text-[34px]">
                {getMonthLabel(period.month, period.year)}
              </h2>
              <button
                type="button"
                aria-label="Proximo mes"
                disabled={!nextPeriod}
                onClick={() => nextPeriod && changeMonth(nextPeriod)}
                className="flex h-12 w-12 items-center justify-center rounded-full border border-[rgba(35,73,63,0.12)] text-[24px] font-black text-[#23493f] hover:border-[#23493f] disabled:cursor-not-allowed disabled:opacity-35"
              >
                ›
              </button>
            </div>

            <div className="mt-6 grid grid-cols-7 gap-2 text-center">
              {weekdayLabels.map((weekday) => (
                <div
                  key={weekday.key}
                  className="rounded-[6px] bg-[#f0f3ea] py-3 text-[14px] font-bold text-[#23493f] md:text-[16px]"
                >
                  {weekday.label}
                </div>
              ))}
            </div>

            <div className="mt-2 grid grid-cols-7 gap-2 text-center">
              {days.map((day, index) => {
                const event = day.inMonth ? eventsByDay.get(day.day) : null;
                const isSelected = event?.id === selectedEventId;
                const isToday =
                  day.inMonth &&
                  isSameMonth(period.month, period.year, now) &&
                  day.day === now.getDate();

                if (!event || event.status === "lot") {
                  return (
                    <span
                      key={`${period.year}-${period.month}-${index}-${day.key}`}
                      className={`flex aspect-square min-h-[46px] items-center justify-center rounded-[8px] border text-[16px] font-bold md:min-h-[72px] md:text-[22px] ${
                        day.inMonth
                          ? "border-[#e4e9df] bg-[#f3f4ef] text-[#9aa39a]"
                          : "border-[#f2f4f0] bg-white text-[#c4cac2]"
                      } ${isToday ? "ring-2 ring-[#b6d9ad]" : ""}`}
                    >
                      {day.day}
                    </span>
                  );
                }

                return (
                  <Link
                    key={`${period.year}-${period.month}-${index}-${day.key}`}
                    href={buildPublicAgendaSelectionHref(
                      period.month,
                      period.year,
                      event.id,
                    )}
                    onClick={() => setSelectedEventId(event.id)}
                    className={`flex aspect-square min-h-[46px] items-center justify-center rounded-[8px] text-[16px] font-black transition md:min-h-[72px] md:text-[24px] ${
                      isSelected
                        ? "bg-[#17342d] text-white shadow-[0_10px_24px_rgba(19,52,45,0.22)]"
                        : "bg-[#e8f0df] text-[#23493f] hover:bg-[#17342d] hover:text-white"
                    } ${isToday ? "ring-2 ring-[#7fcf72]" : ""}`}
                  >
                    {day.day}
                  </Link>
                );
              })}
            </div>

            <div className="mt-5 flex flex-wrap gap-3 text-[13px] font-bold text-[#5e746e]">
              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-[#17342d]" />
                Disponível
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-[#f1f3ef]" />
                Indisponível
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-[#7fcf72]" />
                Hoje
              </span>
            </div>
          </section>

          <aside className="h-fit rounded-[8px] border border-[rgba(35,73,63,0.08)] bg-white/92 p-5 text-left shadow-[0_18px_42px_rgba(19,48,41,0.08)] md:p-6">
            {state.status === "loading" ? (
              <div>
                <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-[#1e5564]">
                  Consultando
                </p>
                <h2 className="mt-3 text-[28px] font-semibold leading-tight text-[#17342d]">
                  Carregando agenda
                </h2>
              </div>
            ) : null}

            {state.status !== "loading" && !selectedEvent ? (
              <div>
                <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-[#1e5564]">
                  Dia da visita
                </p>
                <h2 className="mt-3 text-[28px] font-semibold leading-tight text-[#17342d]">
                  Escolha uma data disponível
                </h2>
              </div>
            ) : null}

            {selectedEvent ? (
              <div>
                <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-[#1e5564]">
                  Data escolhida
                </p>
                <div className="mt-4 rounded-[8px] bg-[#17342d] p-5 text-center text-white">
                  <strong className="block text-[72px] font-semibold leading-none">
                    {selectedEvent.day}
                  </strong>
                  <span className="mt-2 block text-[18px] font-bold uppercase leading-6">
                    {formatDateLabel(selectedEvent)}
                  </span>
                </div>

                <Link
                  href={buildPublicAgendaPurchaseHref(selectedEvent)}
                  className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[linear-gradient(135deg,#1e5564_0%,#23493f_100%)] px-5 text-[15px] font-bold text-white shadow-[0_12px_24px_rgba(28,80,84,0.16)] hover:-translate-y-0.5"
                >
                  Escolher passaportes
                </Link>
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </div>
  );
}
