"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { CalendarMonth } from "@/lib/operational-calendar-contracts";

type CalendarFilter = "all" | "upcoming" | "events" | "rescheduled";
type CalendarEntry = CalendarMonth["days"][number];

export const calendarMoney = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const calendarDateLabel = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" });

export function matchesCalendarFilter(day: CalendarEntry, filter: CalendarFilter, today: string) {
  return filter === "all" || (filter === "upcoming" && day.date >= today) || (filter === "events" && day.rule.type === "event") || (filter === "rescheduled" && day.summary.rescheduled > 0);
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
  const visibleDays = data.days.filter((day) => day.rule.status !== "fec" && matchesCalendarFilter(day, filter, data.today));

  return <div className="calendar-page">
    <header className="calendar-page-header">
      <div><p className="calendar-eyebrow">Operação do parque</p><h1 className="calendar-heading">Agenda</h1><p className="calendar-muted">Cada data, suas vendas e a operação do dia.</p></div>
      <Link className="calendar-button" href="/painel/agenda/adicionar">+ Abrir data</Link>
    </header>
    <section className="calendar-card" aria-label="Calendário mensal">
      <div className="calendar-toolbar">
        <div className="calendar-tabs"><span aria-current="page">Calendário</span><Link href="/painel/compras">Lista</Link></div>
        <div className="calendar-month-nav"><Link href={monthHref(-1)} aria-label="Mês anterior">‹</Link><h2>{currentMonth.toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" })}</h2><Link href={monthHref(1)} aria-label="Próximo mês">›</Link></div>
      </div>
      <div className="calendar-filter-row" aria-label="Filtrar datas">{([["all", "Todas"], ["upcoming", "Próximas"], ["events", "Eventos"], ["rescheduled", "Com reagendados"]] as const).map(([value, label]) => <button type="button" key={value} aria-pressed={filter === value} onClick={() => setFilter(value)} className={`calendar-filter ${filter === value ? "is-active" : ""}`}>{label}</button>)}</div>
      <div className="calendar-weekdays" aria-hidden="true">{["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => <span key={day}>{day}</span>)}</div>
      <div className="calendar-month-grid">
        {Array.from({ length: currentMonth.getUTCDay() }, (_, i) => <span key={`pad-${i}`} className="calendar-padding-day" aria-hidden="true" />)}
        {Array.from({ length: daysInMonth }, (_, index) => {
          const date = `${data.year}-${String(data.month).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`;
          const day = entries.get(date);
          const dayLabel = new Date(`${date}T12:00:00Z`).toLocaleDateString("pt-BR", { weekday: "short", timeZone: "UTC" });
          if (day) {
            const shown = matchesCalendarFilter(day, filter, data.today);
            return <Link key={date} href={`/painel/agenda/${date}`} aria-label={`${calendarDateLabel(date)}${day.rule.eventTitle ? `, ${day.rule.eventTitle}` : ""}, ${day.rule.status === "fec" ? "Fechada" : `${day.summary.people} pessoas`}`} className={`calendar-day ${day.rule.type === "event" ? "calendar-day-event" : ""} ${day.rule.status === "fec" ? "calendar-day-closed" : ""} ${!shown ? "calendar-day-filtered" : ""} ${date === data.today ? "calendar-day-today" : ""}`}>
              <div className="calendar-day-date"><span>{index + 1}</span><small>{dayLabel}</small></div>
              {day.rule.status === "fec" ? <span className="calendar-chip">Fechada</span> : <><strong className="calendar-day-people">{day.summary.people}<small>pessoas previstas</small></strong><p className="calendar-day-sales">{day.summary.purchases} compras <b>{calendarMoney(day.summary.revenueCents)}</b></p></>}
              <div className="calendar-day-markers">{day.rule.eventTitle && <span className="calendar-event-label">{day.rule.eventTitle}</span>}{date < data.today && <span className="calendar-chip">Realizado</span>}{day.summary.rescheduled > 0 && <span className="calendar-chip calendar-rescheduled-chip">{day.summary.rescheduled} reagendadas</span>}</div>
            </Link>;
          }
          return <button type="button" key={date} disabled={date <= data.today || filter !== "all"} className="calendar-day calendar-day-empty" aria-label={`${calendarDateLabel(date)}, sem data aberta`} onClick={() => { setSelectedDate(date); choice.current?.showModal(); }}><span className="calendar-day-date">{index + 1}</span>{date > data.today && filter === "all" && <span className="calendar-empty-add">+ Abrir data</span>}</button>;
        })}
      </div>
      {!visibleDays.length && <p className="calendar-empty-state">Nenhuma data aberta para este filtro. Use “Abrir data” para configurar a operação.</p>}
      <div className="calendar-legend"><span><i /> Day use</span><span><i className="is-event" /> Evento</span><span className="calendar-muted">Selecione uma data para ver o relatório.</span></div>
    </section>
    <dialog ref={choice} className="calendar-dialog" aria-label="Escolher operação da data" onClick={(event) => { if (event.target === event.currentTarget) choice.current?.close(); }}>
      <div className="calendar-dialog-content"><div className="calendar-page-header"><div><p className="calendar-eyebrow">Nova data</p><h2>O que vai acontecer?</h2></div><button className="calendar-icon-button" type="button" aria-label="Fechar escolha de data" onClick={() => choice.current?.close()}>×</button></div><p className="calendar-muted">{selectedDate && calendarDateLabel(selectedDate)}</p><div className="calendar-choice-grid"><Link className="calendar-choice" href={`/painel/agenda/adicionar?dia=${selectedDate}`}><strong>Abrir data de day use</strong><span>Defina a oferta e a validade dos vouchers.</span></Link><Link className="calendar-choice calendar-event-choice" href={`/painel/site/eventos/novo?dia=${selectedDate}&from=calendar`}><strong>Criar evento</strong><span>Publique o evento e configure a data.</span></Link></div><button className="calendar-button-secondary" type="button" onClick={() => choice.current?.close()}>Cancelar</button></div>
    </dialog>
  </div>;
}
