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
  FlowStepper,
  IconBubble,
  PrimaryFlowButton,
} from "@/components/order-flow-ui";
import {
  buildPublicAgendaPurchaseHref,
  buildPublicAgendaSelectionHref,
} from "@/lib/public-agenda-selection";

const monthFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
});

const selectedDateFormatter = new Intl.DateTimeFormat("pt-BR", {
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

function formatSelectedDate(event: PublicAgendaEvent) {
  return selectedDateFormatter.format(new Date(`${event.date}T12:00:00`));
}

function updateUrl(
  month: number,
  year: number,
  selectedAgendaId?: number | null,
) {
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
              ? "Não foi possível consultar a agenda."
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
              : "Não foi possível consultar a agenda.",
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
    if (
      getMonthKey(next.month, next.year) ===
      getMonthKey(period.month, period.year)
    ) {
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

  const selectedDateLabel = selectedEvent ? formatSelectedDate(selectedEvent) : "";

  return (
    <div className="min-h-[calc(100vh-78px)] pb-36 text-[#073f35] lg:pb-12">
      <div className="mx-auto w-[min(1450px,calc(100%-32px))] py-8 lg:py-9">
        <FlowStepper current="date" />

        {state.status === "error" ? (
          <div className="mt-8 rounded-[18px] border border-[#efc3c3] bg-[#fff3f1] px-4 py-3 text-left text-sm font-semibold text-[#9f3f36]">
            {state.error}
          </div>
        ) : null}

        <div className="mt-9 grid gap-7 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start">
          <section className="rounded-[18px] border border-[#dfe8dc] bg-white/82 p-6 text-left shadow-[0_22px_55px_rgba(18,52,45,0.08)] lg:p-8">
            <p className="text-[13px] font-black uppercase tracking-[0.36em] text-[#087842]">
              {getMonthLabel(period.month, period.year)}
            </p>
            <h1 className="mt-5 max-w-[760px] text-[38px] font-black leading-[1.04] text-[#073f35] sm:text-[52px]">
              Escolha a data da visita
            </h1>
            <p className="mt-4 max-w-[580px] text-[20px] font-medium leading-[1.38] text-[#626469] sm:text-[24px]">
              Selecione o dia em que você deseja visitar a Estância e Parque
              Ecológico das Águas.
            </p>

            {selectedEvent ? (
              <div className="mt-8 flex max-w-[560px] items-center gap-5 rounded-[18px] border border-[#dce8d8] bg-white p-5 shadow-[0_14px_28px_rgba(18,52,45,0.05)]">
                <IconBubble name="calendar" />
                <div>
                  <p className="text-[13px] font-black uppercase tracking-[0.28em] text-[#087842]">
                    Dia da visita
                  </p>
                  <strong className="mt-1 block text-[26px] font-black text-[#073f35]">
                    {selectedDateLabel}
                  </strong>
                </div>
              </div>
            ) : null}

            <div className="mt-6 rounded-[18px] border border-[#dfe8dc] bg-white p-4 shadow-[0_18px_42px_rgba(18,52,45,0.06)] sm:p-7">
              <div className="grid grid-cols-[48px_1fr_48px] items-center gap-2">
                <button
                  type="button"
                  aria-label="Mês anterior"
                  disabled={!previousPeriod}
                  onClick={() => previousPeriod && changeMonth(previousPeriod)}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-[#d8dfd7] bg-white text-[30px] font-black leading-none text-[#073f35] hover:border-[#073f35] disabled:cursor-not-allowed disabled:opacity-35"
                >
                  ‹
                </button>
                <h2 className="text-center text-[24px] font-black text-[#073f35] md:text-[31px]">
                  {getMonthLabel(period.month, period.year)}
                </h2>
                <button
                  type="button"
                  aria-label="Próximo mês"
                  disabled={!nextPeriod}
                  onClick={() => nextPeriod && changeMonth(nextPeriod)}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-[#d8dfd7] bg-white text-[30px] font-black leading-none text-[#073f35] hover:border-[#073f35] disabled:cursor-not-allowed disabled:opacity-35"
                >
                  ›
                </button>
              </div>

            <div className="mt-7 grid grid-cols-7 gap-2 text-center sm:gap-3">
              {weekdayLabels.map((weekday) => (
                <div
                  key={weekday.key}
                  className="py-1.5 text-[14px] font-black text-[#073f35]"
                >
                  {weekday.label}
                </div>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-7 gap-2 text-center sm:gap-3">
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
                      className={`flex aspect-square min-h-[42px] items-center justify-center rounded-[12px] border text-[16px] font-black sm:min-h-[70px] sm:text-[22px] ${
                        day.inMonth
                          ? "border-transparent bg-[#f4f2ed] text-[#9aa39a]"
                          : "border-[#ece9e2] bg-white text-[#b9b8b4]"
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
                    className={`flex aspect-square min-h-[42px] items-center justify-center rounded-[12px] border text-[16px] font-black transition sm:min-h-[70px] sm:text-[22px] ${
                      isSelected
                        ? "border-[#18ac26] bg-[#073f35] text-white shadow-[0_12px_28px_rgba(7,63,53,0.25)]"
                        : "border-transparent bg-[#f4f2ed] text-[#073f35] hover:border-[#18ac26]"
                    } ${isToday ? "ring-2 ring-[#7fcf72]" : ""}`}
                  >
                    {day.day}
                  </Link>
                );
              })}
            </div>
            </div>
          </section>

          <aside className="hidden h-fit rounded-[18px] border border-[#dfe8dc] bg-white p-8 text-left shadow-[0_22px_55px_rgba(18,52,45,0.08)] lg:block">
            {state.status === "loading" ? (
              <div>
                <p className="text-[13px] font-black uppercase tracking-[0.28em] text-[#087842]">
                  Consultando
                </p>
                <h2 className="mt-3 text-[24px] font-black leading-tight text-[#073f35]">
                  Carregando agenda
                </h2>
              </div>
            ) : null}

            {state.status !== "loading" && !selectedEvent ? (
              <div>
                <p className="text-[13px] font-black uppercase tracking-[0.28em] text-[#087842]">
                  Dia da visita
                </p>
                <h2 className="mt-3 text-[24px] font-black leading-tight text-[#073f35]">
                  {sortedEvents.length > 0
                    ? "Escolha uma data disponível"
                    : "Não há eventos atuais"}
                </h2>
                {sortedEvents.length === 0 ? (
                  <p className="mt-3 text-[15px] leading-7 text-[#626469]">
                    No momento não existem datas abertas para compra ou
                    agendamento.
                  </p>
                ) : null}
              </div>
            ) : null}

            {selectedEvent ? (
              <div>
                <div className="flex items-center gap-5">
                  <IconBubble name="calendar" />
                  <div>
                    <p className="text-[16px] font-bold text-[#626469]">
                      Data selecionada
                    </p>
                    <strong className="mt-1 block text-[25px] font-black text-[#073f35]">
                      {selectedDateLabel}
                    </strong>
                  </div>
                </div>

                <PrimaryFlowButton
                  href={buildPublicAgendaPurchaseHref(selectedEvent)}
                  className="mt-7"
                >
                  Continuar para passaportes
                </PrimaryFlowButton>
                <p className="mt-7 flex gap-3 text-[16px] leading-7 text-[#626469]">
                  <span className="text-[#20aa1f]">↱</span>
                  Após escolher a data, você seguirá para a seleção de
                  passaportes.
                </p>
              </div>
            ) : null}
          </aside>
        </div>
      </div>

      {selectedEvent ? (
        <div className="fixed inset-x-0 bottom-0 z-40 rounded-t-[28px] border border-[#e2e8df] bg-white/96 px-6 pb-[calc(env(safe-area-inset-bottom)+18px)] pt-6 text-left shadow-[0_-18px_46px_rgba(18,52,45,0.13)] backdrop-blur lg:hidden">
          <div className="mb-5 flex items-center gap-4">
            <IconBubble name="calendar" className="h-14 w-14" />
            <div>
              <p className="text-[17px] font-bold text-[#626469]">
                Data selecionada
              </p>
              <strong className="block text-[22px] font-black text-[#073f35]">
                {selectedDateLabel}
              </strong>
            </div>
          </div>
          <PrimaryFlowButton href={buildPublicAgendaPurchaseHref(selectedEvent)}>
            Continuar para passaportes
          </PrimaryFlowButton>
        </div>
      ) : null}
    </div>
  );
}
