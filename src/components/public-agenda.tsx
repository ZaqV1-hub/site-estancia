"use client";

import Link from "next/link";
import { startTransition, useEffect, useRef, useState } from "react";
import type {
  BffErrorResponse,
  PublicAgendaEvent,
  PublicAgendaMonth,
  PublicAgendaResponse,
} from "@/lib/agenda-contracts";
import { buildPublicAgendaSelectionHref } from "@/lib/public-agenda-selection";

const monthFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
});

const dayFormatter = new Intl.DateTimeFormat("pt-BR", { month: "long" });
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

function formatPrice(value: string | null) {
  if (!value) {
    return null;
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return null;
  }

  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericValue);
}

function getEventLabel(event: PublicAgendaEvent) {
  if (event.status === "lot") {
    return "Lotado";
  }

  if (event.type === "promo") {
    return event.promotional.name ?? "Tarifa especial";
  }

  return "Tarifa comum";
}

function getEventColorClasses(event: PublicAgendaEvent) {
  if (event.status === "lot") {
    return {
      badge: "bg-[#c90011]",
      info: "bg-[#c90011]",
      note: "bg-[#c90011]",
      link: "bg-[#c90011] hover:bg-[#a70011]",
    };
  }

  if (event.type === "promo") {
    return {
      badge: "bg-[#ff6138]",
      info: "bg-[#ff6138]",
      note: "bg-[#c3492a]",
      link: "bg-[#ff6138] hover:bg-[#c3492a]",
    };
  }

  return {
    badge: "bg-[#8dc72b]",
    info: "bg-[#8dc72b]",
    note: "bg-[#6f9f1f]",
    link: "bg-[#8dc72b] hover:bg-[#7aae24]",
  };
}

function formatFullDate(event: PublicAgendaEvent) {
  const monthLabel = dayFormatter.format(
    new Date(event.year, event.month - 1, event.day),
  );

  return `de ${monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)} de ${event.year}`;
}

function isSameMonth(month: number, year: number, now: Date) {
  return month === now.getMonth() + 1 && year === now.getFullYear();
}

function hasOnlinePrice(event: PublicAgendaEvent) {
  return (
    formatPrice(event.priceTable.normal) !== null &&
    formatPrice(event.priceTable.child) !== null
  );
}

function hasGatePrice(event: PublicAgendaEvent) {
  return (
    formatPrice(event.priceTable.gateNormal) !== null &&
    formatPrice(event.priceTable.gateChild) !== null
  );
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

  const eventsByDay = new Map(state.events.map((event) => [event.day, event]));
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
  const hidePreviousMonth = previousPeriod === null;

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
    <div className="mt-6 w-full overflow-x-hidden">
      <div className="w-full bg-white">
        <div className="grid items-start gap-6 lg:justify-center lg:grid-cols-[minmax(0,620px)_320px] lg:gap-8">
          <div className="box-border min-w-0 lg:max-w-[620px] lg:pr-2">
            <h2 className="legacy-rounded mx-auto mb-4 max-w-[320px] text-center text-[18px] leading-tight text-[#3393d6] sm:max-w-none sm:text-[25px]">
              Escolha a data da visita ao parque
            </h2>

            <div className="overflow-hidden">
              <div className="grid grid-cols-[36px_1fr_36px] items-center bg-[#3394d6] text-center">
                <div>
                  {hidePreviousMonth ? (
                    <span className="block h-10 w-9" />
                  ) : (
                    <button
                      type="button"
                      aria-label="Mes anterior"
                      onClick={() => previousPeriod && changeMonth(previousPeriod)}
                      className="block h-10 w-9 bg-[url('/theme/arrow-left.png')] bg-center bg-no-repeat"
                    />
                  )}
                </div>
                <div className="px-2 legacy-condensed text-[20px] uppercase text-white sm:text-[26px]">
                  {getMonthLabel(period.month, period.year)}
                </div>
                <div>
                  {nextPeriod ? (
                    <button
                      type="button"
                      aria-label="Proximo mes"
                      onClick={() => changeMonth(nextPeriod)}
                      className="ml-auto block h-10 w-9 bg-[url('/theme/arrow-right.png')] bg-center bg-no-repeat"
                    />
                  ) : (
                    <span className="ml-auto block h-10 w-9" />
                  )}
                </div>
              </div>

              <div className="mt-[3px] grid grid-cols-7 gap-[3px] text-center sm:mt-[5px] sm:gap-[5px]">
                {weekdayLabels.map((weekday) => (
                  <div
                    key={weekday.key}
                    className="legacy-condensed bg-[#20618b] py-[4px] text-[18px] text-white sm:py-[5px] sm:text-[24px]"
                  >
                    {weekday.label}
                  </div>
                ))}
              </div>

              <div className="mt-[3px] grid grid-cols-7 gap-[3px] text-center sm:mt-[5px] sm:gap-[5px]">
                {days.map((day, index) => {
                  const event = day.inMonth ? eventsByDay.get(day.day) : null;
                  const isOutsideMonth = !day.inMonth;
                  const isToday =
                    !isOutsideMonth &&
                    isSameMonth(period.month, period.year, now) &&
                    day.day === now.getDate();
                  const colorClasses = event ? getEventColorClasses(event) : null;

                  return event ? (
                    <Link
                      key={`${period.year}-${period.month}-${index}-${day.key}`}
                      onClick={() => setSelectedEventId(event.id)}
                      href={buildPublicAgendaSelectionHref(
                        period.month,
                        period.year,
                        event.id,
                      )}
                      className={`legacy-condensed flex aspect-square min-h-[38px] w-full items-center justify-center text-[18px] font-bold text-white sm:min-h-[50px] sm:text-[24px] ${colorClasses?.link} ${
                        selectedEventId === event.id
                          ? "shadow-[inset_0_0_0_3px_#20618b]"
                          : ""
                      }`}
                    >
                      {day.day}
                    </Link>
                  ) : (
                    <span
                      key={`${period.year}-${period.month}-${index}-${day.key}`}
                      className={`legacy-condensed flex aspect-square min-h-[38px] w-full items-center justify-center border text-[18px] sm:min-h-[50px] sm:text-[24px] ${
                        isOutsideMonth
                          ? "border-[#eaeaea] bg-white text-[#a8a8a8]"
                          : "border-transparent bg-[#eaeaea] text-[#9d9d9d]"
                      } ${isToday ? "shadow-[inset_0_0_0_2px_rgba(32,97,139,0.25)]" : ""}`}
                    >
                      {day.day}
                    </span>
                  );
                })}
              </div>
            </div>

            <ul className="box-border flex w-full flex-wrap items-center justify-center gap-x-4 gap-y-2 px-[5px] py-[5px] text-[11px] text-[#333] sm:justify-start sm:text-[12px]">
              <li className="relative pl-[15px]">
                <span className="absolute left-0 top-0 h-3 w-3 bg-[#8dc72b]" />
                Tarifa Comum
              </li>
              <li className="relative pl-[15px]">
                <span className="absolute left-0 top-0 h-3 w-3 bg-[#ff6138]" />
                Tarifas / Dias especiais
              </li>
              <li className="relative pl-[15px]">
                <span className="absolute left-0 top-0 h-3 w-3 bg-[#ccc]" />
                Fechado
              </li>
              <li className="relative pl-[15px]">
                <span className="absolute left-0 top-0 h-3 w-3 bg-[#a70011]" />
                Esgotado
              </li>
            </ul>
          </div>

          <aside className="box-border min-w-0 lg:border-l lg:border-[#eaeaea] lg:pl-6">
            {state.status === "error" ? (
              <div className="mt-5 rounded bg-[#c90011] px-4 py-3 text-white">
                <strong className="block font-medium">Agenda indisponivel.</strong>
                <span className="text-[14px]">{state.error}</span>
              </div>
            ) : null}

            {state.status === "loading" && !selectedEvent ? (
              <h2 className="mt-2 inline-block rounded-[3px] bg-[#c30] px-[10px] py-[10px] text-[18px] font-medium text-white sm:mt-5 sm:text-[20px]">
                Consultando agenda...
              </h2>
            ) : null}

            {state.status === "ready" && !selectedEvent ? (
              <h2 className="mt-2 inline-block rounded-[3px] bg-[#c30] px-[10px] py-[10px] text-[18px] font-medium text-white sm:mt-5 sm:text-[20px]">
                Escolha um dia.
              </h2>
            ) : null}

            {selectedEvent ? (
              <>
                <div
                  className={`mt-3 box-border w-full px-4 py-3 text-center sm:mt-[45px] sm:px-5 ${getEventColorClasses(selectedEvent).info}`}
                >
                  <span className="legacy-condensed text-[16px] font-bold uppercase text-white">
                    Dia Escolhido
                  </span>
                  <br />
                  <strong className="legacy-condensed inline-block h-[54px] overflow-hidden text-[52px] font-bold leading-[54px] text-white sm:h-[60px] sm:text-[60px] sm:leading-[60px]">
                    {selectedEvent.day}
                  </strong>
                  <br />
                  <span className="legacy-condensed text-[16px] font-bold uppercase text-white">
                    {formatFullDate(selectedEvent)}
                  </span>
                  <br />
                  <em className="mt-2 inline-block border-t border-white px-[10px] pt-[15px] text-[16px] not-italic text-white">
                    {getEventLabel(selectedEvent)}
                  </em>
                </div>

                {selectedEvent.promotional.description ? (
                  <p
                    className={`w-full px-[10px] py-[10px] text-center text-[12px] text-white ${getEventColorClasses(selectedEvent).note}`}
                  >
                    {selectedEvent.promotional.description}
                  </p>
                ) : null}

                {selectedEvent.status !== "lot" ? (
                  <div className="box-border w-full bg-[#eaeaea] px-4 py-5 text-center sm:px-5">
                    <div className="grid gap-4">
                      <div className="grid gap-3 sm:grid-cols-3">
                        <strong className="legacy-condensed col-span-full text-center text-[12px] uppercase text-[#333]">
                          Valores por pessoa (R$)
                        </strong>
                        <span className="text-center">
                          <strong className="legacy-condensed relative top-[5px] inline-block text-[24px] text-[#333]">
                            {formatPrice(selectedEvent.priceTable.normal) ?? "-"}
                          </strong>
                          <span className="block text-[12px] font-semibold text-[#333]">
                            a partir de 10 anos
                          </span>
                        </span>
                        <span className="text-center">
                          <strong className="legacy-condensed relative top-[5px] inline-block text-[24px] text-[#333]">
                            {formatPrice(selectedEvent.priceTable.child) ?? "-"}
                          </strong>
                          <span className="block text-[12px] font-semibold text-[#333]">
                            de 4 a 9 anos
                          </span>
                        </span>
                        <span className="text-center">
                          <span className="mt-[10px] inline-block text-[12px] font-semibold leading-[15px] text-[#333]">
                            Isento de 0 a 3 anos
                          </span>
                        </span>
                      </div>

                      {hasGatePrice(selectedEvent) ? (
                        <div className="grid gap-3 border-t border-[#ccc] pt-[10px] sm:grid-cols-3">
                          <strong className="legacy-condensed col-span-full text-center text-[12px] uppercase text-[#333]">
                            Valores por pessoa (R$) (Pagamento no parque)
                          </strong>
                          <span className="text-center">
                            <strong className="legacy-condensed relative top-[5px] inline-block text-[24px] text-[#333]">
                              {formatPrice(selectedEvent.priceTable.gateNormal) ?? "-"}
                            </strong>
                            <span className="block text-[12px] font-semibold text-[#333]">
                              a partir de 10 anos
                            </span>
                          </span>
                          <span className="text-center">
                            <strong className="legacy-condensed relative top-[5px] inline-block text-[24px] text-[#333]">
                              {formatPrice(selectedEvent.priceTable.gateChild) ?? "-"}
                            </strong>
                            <span className="block text-[12px] font-semibold text-[#333]">
                              de 4 a 9 anos
                            </span>
                          </span>
                          <span className="text-center">
                            <span className="mt-[10px] inline-block text-[12px] font-semibold leading-[15px] text-[#333]">
                              Isento de 0 a 3 anos
                            </span>
                          </span>
                        </div>
                      ) : null}

                      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
                        {hasOnlinePrice(selectedEvent) ? (
                          <Link
                            href={`/comprar/${selectedEvent.legacyEncodedId}`}
                            className="inline-flex w-full items-center justify-center rounded-full border-2 border-white bg-[#3394d6] px-[15px] py-[15px] pl-[56px] text-[16px] text-white shadow-[2px_2px_4px_rgba(0,0,0,0.2)] transition hover:bg-[#246b99] sm:w-auto"
                            style={{
                              backgroundImage: "url('/theme/ticket-icon.png')",
                              backgroundPosition: "10px center",
                              backgroundRepeat: "no-repeat",
                            }}
                          >
                            Pagar On-line
                          </Link>
                        ) : null}

                        <Link
                          href={`/agendar/${selectedEvent.legacyEncodedId}`}
                          className="inline-flex w-full items-center justify-center rounded-full border-2 border-white bg-[#3394d6] px-[20px] py-[15px] text-[16px] text-white shadow-[2px_2px_4px_rgba(0,0,0,0.2)] transition hover:bg-[#246b99] sm:w-auto"
                        >
                          Pagar no Parque
                        </Link>
                      </div>
                    </div>
                  </div>
                ) : (
                  <h2 className="mt-3 inline-block rounded-[3px] bg-[#c30] px-[10px] py-[10px] text-[18px] font-medium text-white sm:mt-5 sm:text-[20px]">
                    Esta data esta esgotada.
                  </h2>
                )}
              </>
            ) : null}
          </aside>
        </div>
      </div>

      <div className="mt-6 text-right">
        <Link
          href="/login?redirect=%2Fagenda"
          className="inline-flex w-full items-center justify-center rounded-full bg-[#3394d6] px-5 py-4 text-center text-[16px] text-white shadow-[2px_2px_4px_rgba(0,0,0,0.2)] transition hover:bg-[#246b99] sm:w-auto sm:px-5 sm:py-5 sm:text-[18px]"
        >
          Compre seu ingresso ou agende sua visita
        </Link>
      </div>
    </div>
  );
}
