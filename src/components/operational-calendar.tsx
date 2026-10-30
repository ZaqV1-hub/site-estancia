"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { CalendarMonth } from "@/lib/operational-calendar-contracts";

type CalendarFilter = "all" | "upcoming" | "events" | "rescheduled" | "schools";
type CalendarEntry = CalendarMonth["days"][number];

export const calendarMoney = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const calendarDateLabel = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" });

export function matchesCalendarFilter(day: CalendarEntry, filter: CalendarFilter, today: string) {
  return (filter === "schools" && !!day.schoolTrips?.length) || filter === "all" || (filter === "upcoming" && day.date >= today) || (filter === "events" && day.rule.type === "event") || (filter === "rescheduled" && day.summary.rescheduled > 0);
}

export function OperationalCalendar({ data }: { data: CalendarMonth }) {
  const [filter, setFilter] = useState<CalendarFilter>("all");
  const [selectedDate, setSelectedDate] = useState("");
  const choice = useRef<HTMLDialogElement>(null);
  const currentMonth = new Date(Date.UTC(data.year, data.month - 1, 1));
  const daysInMonth = new Date(Date.UTC(data.year, data.month, 0)).getUTCDate();
  const entries = new Map(data.days.map((day) => [day.date, day]));
  const monthHref = (offset: number) => {
    const target = new Date(Date.UTC(data.year, data.month - 1 + offset, 1));
    return `/painel/agenda?mes=${target.getUTCMonth() + 1}&ano=${target.getUTCFullYear()}`;
  };
  const visibleDays = data.days.filter((day) => (day.rule.status !== "fec" || !!day.schoolTrips?.length) && matchesCalendarFilter(day, filter, data.today));

  return <div className="calendar-page">
    {data.schoolTripsUnavailable && <p className="calendar-card" role="alert">Consulta dos passeios escolares indisponível. Esta agenda está mostrando somente os dados do DayUse. Atualize a página para tentar novamente.</p>}<section className="calendar-card" aria-label="Calendário mensal">
      <header className="calendar-page-header calendar-agenda-header">
        <div><p className="calendar-eyebrow">Agenda</p><h1 className="calendar-heading">Agenda de DayUse, eventos e passeios escolares</h1><p className="calendar-page-sub">As datas reúnem DayUse e passeios escolares. O selo de passeio mostra os ingressos pagos no B2B. Clique numa data para abrir o relatório. Clique numa data vazia para abrir day use ou criar um evento.</p></div>
        <div className="calendar-tabs"><span aria-current="page">Calendário</span><Link href="/painel/compras?calendar=1">Lista</Link></div>
      </header>
      <div className="calendar-toolbar calendar-monthbar">
        <div className="calendar-month-nav"><Link href={monthHref(-1)} aria-label="Mês anterior">‹</Link><h2>{currentMonth.toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).replace(/^./, (letter) => letter.toUpperCase())}</h2><Link href={monthHref(1)} aria-label="Próximo mês">›</Link></div>
      <div className="calendar-filter-row" aria-label="Filtrar datas">{([["all", "Todas"], ["upcoming", "Próximas"], ["events", "Eventos"], ["schools", "Passeios escolares"], ["rescheduled", "Com reagendados"]] as const).map(([value, label]) => <button type="button" key={value} aria-pressed={filter === value} onClick={() => setFilter(value)} className={`calendar-filter ${filter === value ? "is-active" : ""}`}>{label}</button>)}</div>
      </div>
      <div className="calendar-weekdays" aria-hidden="true">{["D", "S", "T", "Q", "Q", "S", "S"].map((day, index) => <span key={index}>{day}</span>)}</div>
      <div className="calendar-month-grid">
        {Array.from({ length: currentMonth.getUTCDay() }, (_, i) => <span key={`pad-${i}`} className="calendar-padding-day" aria-hidden="true" />)}
        {Array.from({ length: daysInMonth }, (_, index) => {
          const date = `${data.year}-${String(data.month).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`;
          const day = entries.get(date);
          const dayLabel = new Date(`${date}T12:00:00Z`).toLocaleDateString("pt-BR", { weekday: "short", timeZone: "UTC" });
          if (day) {
            const shown = matchesCalendarFilter(day, filter, data.today);
            const hasDayUse = !day.b2bOnly && day.rule.type !== "event" && day.rule.status !== "fec";
            const hasSchools = !!day.schoolTrips?.length;
            return <Link key={date} href={`/painel/agenda/${date}`} aria-label={`${calendarDateLabel(date)}${day.rule.eventTitle ? `, ${day.rule.eventTitle}` : ""}, ${day.b2bOnly ? `${day.schoolTrips?.reduce((sum,trip)=>sum+trip.paid,0)??0} ingressos pagos em passeios escolares` : day.rule.status === "fec" ? "Fechada" : `${day.summary.people} pessoas`}`} className={`calendar-day ${hasDayUse ? "calendar-day-dayuse" : ""} ${hasSchools ? "calendar-day-schools" : ""} ${day.rule.type === "event" ? "calendar-day-event" : ""} ${day.rule.status === "fec" ? "calendar-day-closed" : ""} ${!shown ? "calendar-day-filtered" : ""} ${date === data.today ? "calendar-day-today" : ""} ${date < data.today ? "calendar-day-past" : ""}`}>
              <div className="calendar-day-date"><span>{index + 1}</span><small>{dayLabel}</small></div>
              {day.b2bOnly ? <span className="calendar-chip calendar-school-chip">Passeios escolares</span> : day.rule.status === "fec" ? <span className="calendar-chip">Fechada</span> : <><strong className="calendar-day-people">{day.summary.people}<small>pessoas</small></strong><p className="calendar-day-sales">{day.summary.purchases} compras <b>{calendarMoney(day.summary.revenueCents)}</b></p></>}
              <div className="calendar-day-markers">{hasDayUse && <span className="calendar-chip calendar-dayuse-chip">DayUse</span>}{hasSchools && <span className="calendar-chip calendar-school-chip">{day.schoolTrips?.length} passeio(s) · {day.schoolTrips?.reduce((sum,t)=>sum+t.paid,0) ?? 0} pagos</span>}{day.rule.eventTitle && <span className="calendar-day-event-label">{day.rule.eventTitle}</span>}{date < data.today && <span className="calendar-chip calendar-ok-chip">Realizado</span>}{day.summary.rescheduled > 0 && <span className="calendar-chip calendar-rescheduled-chip">{day.summary.rescheduled} reagendadas</span>}</div>
            </Link>;
          }
          return <button type="button" key={date} disabled={date <= data.today || filter !== "all"} className="calendar-day calendar-day-empty" aria-label={`${calendarDateLabel(date)}, sem data aberta`} onClick={() => { setSelectedDate(date); choice.current?.showModal(); }}><span className="calendar-day-date">{index + 1}</span>{date > data.today && filter === "all" && <span className="calendar-empty-add">+ Abrir data</span>}</button>;
        })}
      </div>
      {!visibleDays.length && <p className="calendar-empty-state">Nenhuma data aberta para este filtro. Use “Abrir data” para configurar a operação.</p>}
      <div className="calendar-legend"><span><i className="is-dayuse" />DayUse</span><span><i className="is-school" />Passeio escolar</span><span><i className="is-mixed" />DayUse e passeio</span><span><i className="is-event" />Evento</span><span><i className="is-empty" />Sem data aberta</span></div>
    </section>
    <dialog ref={choice} className="calendar-dialog" aria-label="Escolher operação da data" onClick={(event) => { if (event.target === event.currentTarget) choice.current?.close(); }}>
      <div className="calendar-dialog-content"><div className="calendar-page-header"><div><h2>Nova data</h2></div><button className="calendar-icon-button" type="button" aria-label="Fechar escolha de data" onClick={() => choice.current?.close()}>×</button></div><p className="calendar-muted">{selectedDate && calendarDateLabel(selectedDate)}</p><div className="calendar-choice-grid"><Link className="calendar-choice" href={`/painel/agenda/adicionar?dia=${selectedDate}`}><strong>Abrir data de day use</strong><span>Configure passaportes, adicionais e validade para esta data.</span></Link><Link className="calendar-choice calendar-event-choice" href={`/painel/site/eventos/novo?dia=${selectedDate}&from=calendar`}><strong>Criar evento</strong><span>Evento promocional que também aparece na tela inicial do site.</span></Link></div><button className="calendar-button-secondary" type="button" onClick={() => choice.current?.close()}>Cancelar</button></div>
    </dialog>
  </div>;
}
