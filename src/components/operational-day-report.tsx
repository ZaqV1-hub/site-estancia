"use client";

import Link from "next/link";
import { SchoolTripsPanel } from "@/components/school-trips-panel";
import { ReportPrintButton } from "@/components/report-print-button";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CalendarRescheduleDialog } from "@/components/calendar-reschedule-dialog";
import { calendarMoney, calendarDateLabel } from "@/components/operational-calendar";
import { calendarValidityLabels, type CalendarDay, type CalendarPurchase, type CalendarBar } from "@/lib/operational-calendar-contracts";

export { filterCalendarPurchases } from "@/lib/calendar-purchase-filters";
import { filterCalendarPurchases } from "@/lib/calendar-purchase-filters";

export function movableCalendarVoucherIds(purchases: CalendarPurchase[], selectedIds: number[]) {
  return purchases.filter((purchase) => selectedIds.includes(purchase.id)).flatMap((purchase) => purchase.vouchers.filter((voucher) => !voucher.used && !voucher.invalid).map((voucher) => voucher.id));
}

function CalendarBars({ title, caption, items }: { title: string; caption: string; items: CalendarBar[] }) {
  const sold = items.filter((item) => item.quantity > 0);
  const maximum = Math.max(1, ...sold.map((item) => item.quantity));
  return <section className="calendar-card calendar-chart-card"><h2>{title}</h2><p className="calendar-chart-caption">{caption}</p>{sold.length ? <div className="calendar-chart">{sold.map((item, index) => <div className="calendar-chart-row" key={`${item.title}-${index}`}><span>{item.title}</span><div className="calendar-chart-track"><span className="calendar-chart-fill calendar-chart-color-2" style={{ width: `${item.quantity / maximum * 100}%` }} /></div><strong>{item.quantity}</strong></div>)}</div> : <p className="calendar-empty-state">Nenhum item vendido nesta data.</p>}</section>;
}

function shortDate(date: string) { return date.slice(0, 10).split("-").reverse().join("/"); }

export function OperationalDayReport({ data }: { data: CalendarDay }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [origin, setOrigin] = useState<"all" | "site" | "bilheteria">("all");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [rescheduling, setRescheduling] = useState<{ purchaseIds: number[]; voucherIds: number[] } | null>(null);
  const { summary, rule } = data;
  const event = rule?.type === "event";
  const archivedEvent = event && data.event === null;
  const editHref = event && rule?.eventId ? `/painel/site/eventos/${encodeURIComponent(rule.eventId)}/editar` : `/painel/agenda/${data.date}/editar`;
  const purchases = filterCalendarPurchases(data.purchases, search, origin);
  const movablePurchases = purchases.filter((purchase) => purchase.vouchers.some((voucher) => !voucher.used && !voucher.invalid));
  const voucherIds = movableCalendarVoucherIds(data.purchases, selectedIds);
  const selectedAll = movablePurchases.length > 0 && movablePurchases.every((purchase) => selectedIds.includes(purchase.id));
  const sourceTotal = summary.siteCents + summary.boxOfficeCents;
  const sitePercent = sourceTotal ? Math.round(summary.siteCents / sourceTotal * 100) : 0;
  const boxPercent = sourceTotal ? 100 - sitePercent : 0;

  const monthHref = `/painel/agenda?mes=${Number(data.date.slice(5, 7))}&ano=${data.date.slice(0, 4)}`;
  const selectedVouchers = data.purchases.flatMap((purchase) => purchase.vouchers).filter((voucher) => rescheduling?.voucherIds.includes(voucher.id));

  if (!data.rule) return <div className="calendar-page calendar-day-report"><nav className="calendar-crumbs"><Link href={monthHref}>Agenda</Link><span>› {shortDate(data.date)}</span></nav><header className="calendar-page-header"><div><p className="calendar-eyebrow">Consulta escolar</p><h1 className="calendar-heading">Passeios escolares · {shortDate(data.date)}</h1></div><div className="calendar-inline-actions"><ReportPrintButton date={data.date}/></div></header><SchoolTripsPanel trips={data.schoolTrips??[]} unavailable={data.schoolTripsUnavailable}/></div>;
  return <div className="calendar-page calendar-day-report">
    <nav className="calendar-crumbs" aria-label="Navegação da data"><Link href={monthHref}>Agenda</Link><span>›</span><b>{calendarDateLabel(data.date)}</b></nav>
    <section className="calendar-card">
      <header className="calendar-page-header calendar-report-header"><div><p className={`calendar-eyebrow ${event ? "calendar-event-label" : ""}`}>{event ? "Relatório do evento" : "Relatório do dia"}</p><h1 className="calendar-heading">{event ? rule?.eventTitle || "Evento" : calendarDateLabel(data.date)}</h1><p className="calendar-page-sub">{event ? calendarDateLabel(data.date) : "Tudo nesta tela já está filtrado para esta data de visita"}</p></div><div className="calendar-inline-actions"><ReportPrintButton date={data.date} search={search} origin={origin}/>{rule && !archivedEvent && <Link className="calendar-button" href={editHref}>{event ? "Editar evento" : "Editar data"}</Link>}</div></header>
      {archivedEvent && <p className="calendar-catalog-note">Evento arquivado. A data, as compras e o histórico permanecem disponíveis neste relatório.</p>}
      <div className="calendar-metrics">
        <article className="calendar-metric calendar-metric-highlight"><p>Pessoas previstas</p><strong>{summary.people}</strong><small>{summary.passports.filter((item) => item.quantity > 0).map((item) => `${item.quantity} ${item.title}`).join(" · ") || "Nenhum passaporte vendido"}</small></article>
        <article className="calendar-metric"><p>Compras</p><strong>{summary.purchases}</strong><small>{summary.rescheduled > 0 ? `${summary.rescheduled} reagendadas` : "nenhuma reagendada"}</small></article>
        <article className="calendar-metric"><p>Itens adicionais</p><strong>{summary.addons}</strong><small>cafés, tirolesas, kits e estacionamento</small></article>
        <article className="calendar-metric"><p>Faturamento da data</p><strong>{calendarMoney(summary.revenueCents)}</strong><small>site {sitePercent}% · bilheteria {boxPercent}%</small></article>
      </div>
      <div className="calendar-source-bar" role="img" aria-label={`Site ${sitePercent}%, bilheteria ${boxPercent}%`}><span style={{ width: `${sitePercent}%` }}>{sitePercent > 0 && `Site ${calendarMoney(summary.siteCents)} · ${sitePercent}%`}</span><span style={{ width: `${boxPercent}%` }}>{boxPercent > 0 && `Bilheteria ${calendarMoney(summary.boxOfficeCents)} · ${boxPercent}%`}</span></div>
      <div className="calendar-source-labels"><span>Compras no site</span><span>Compras na bilheteria</span></div>
    </section>
    <SchoolTripsPanel trips={data.schoolTrips??[]} unavailable={data.schoolTripsUnavailable} dayuseCents={summary.revenueCents}/>
    {data.event?.pageEnabled && <section className="calendar-card calendar-page"><p className="calendar-eyebrow">Página do evento</p><h2>{data.event.pageTitle || data.event.title}</h2><p className="calendar-page-text">{data.event.pageContent}</p></section>}
    <div className="calendar-report-columns"><CalendarBars title="Passaportes vendidos" caption="Quantidade por tipo de passaporte para esta data" items={summary.passports} /><CalendarBars title="Itens adicionais" caption="Quantidade por item comprado junto com o passaporte" items={summary.addonItems} /></div>
    <section className="calendar-card"><div className="calendar-page-header calendar-rule-header"><div><p className="calendar-eyebrow">Regra desta data</p><h2>O que está à venda nesta data</h2></div>{rule && !archivedEvent && <Link className="calendar-button-secondary calendar-button-small" href={editHref}>Editar</Link>}</div>{rule ? <div className="calendar-rule-layout"><div className="calendar-rule-summary"><div><p className="calendar-muted">Validade dos vouchers</p><strong>{calendarValidityLabels[rule.validity]}</strong><p className="calendar-hint">{rule.validity === "day" || rule.validity === "1d" ? "Quem não usar na data da visita perde o ingresso." : "O prazo começa na data da visita e inclui esse dia."}</p></div><div><p className="calendar-muted">Status da data</p><b>{rule.status === "fec" ? "Fechada" : rule.status === "lot" ? "Lotada" : "Aberta"}</b></div></div><div className="calendar-rule-products">{(["passport", "addon"] as const).map((kind) => { const ids = kind === "passport" ? rule.passportIds : rule.addonIds; return <div key={kind}><h3>{kind === "passport" ? "Passaportes disponíveis" : "Adicionais disponíveis"}</h3><div className="calendar-chips">{ids.length ? ids.map((id) => <span className="calendar-chip" key={id}>{data.products.find((product) => product.id === id)?.title ?? id}</span>) : <span className="calendar-muted">Nenhum selecionado</span>}</div></div>; })}</div></div> : <p className="calendar-muted">Esta data ainda não tem regra cadastrada.</p>}</section>
    <section className="calendar-card">
      <div className="calendar-page-header calendar-purchases-header"><div><p className="calendar-eyebrow">Compras desta data</p><h2>Lista de compras e vouchers</h2></div><Link className="calendar-text-link" href={`/painel/compras?calendar=1&dtagenda%5Bde%5D=${shortDate(data.date)}&dtagenda%5Bate%5D=${shortDate(data.date)}`}>Ver lista de compras e vouchers</Link></div>
      <div className="calendar-purchase-filters"><div className="calendar-filter-row" aria-label="Origem das compras">{([["all", "Todas"], ["site", "Site"], ["bilheteria", "Bilheteria"]] as const).map(([value, label]) => <button key={value} className={`calendar-filter ${origin === value ? "is-active" : ""}`} type="button" aria-pressed={origin === value} onClick={() => setOrigin(value)}>{label}</button>)}</div><input aria-label="Buscar compra ou comprador" className="calendar-input calendar-search" type="search" placeholder="Buscar por ID ou comprador" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      {!!selectedIds.length && <div className="calendar-selection-bar"><b>{selectedIds.length} compras selecionadas · {voucherIds.length} vouchers disponíveis</b><button className="calendar-button-secondary calendar-button-small calendar-bulk-clear" type="button" onClick={() => setSelectedIds([])}>Limpar seleção</button><button className="calendar-button-secondary calendar-button-small" type="button" disabled={!voucherIds.length} onClick={() => setRescheduling({ purchaseIds: selectedIds, voucherIds })}>Mover ou editar vouchers</button></div>}
      <div className="calendar-table-scroll"><table className="calendar-purchases-table"><thead><tr><th><input type="checkbox" aria-label="Selecionar todas as compras disponíveis" checked={selectedAll} disabled={!movablePurchases.length} onChange={(e) => setSelectedIds(e.target.checked ? [...new Set([...selectedIds, ...movablePurchases.map((purchase) => purchase.id)])] : selectedIds.filter((id) => !movablePurchases.some((purchase) => purchase.id === id)))} /></th><th>Compra</th><th>Comprador</th><th>Origem</th><th className="calendar-number">Pessoas</th><th className="calendar-number">Adic.</th><th className="calendar-number">Valor</th><th>Validade</th><th>Situação</th><th><span className="sr-only">Ações</span></th></tr></thead><tbody>{purchases.map((purchase) => { const validities = [...new Set(purchase.vouchers.map((voucher) => voucher.validUntil).filter(Boolean))] as string[]; const movable = purchase.vouchers.filter((voucher) => !voucher.used && !voucher.invalid); return <tr key={purchase.id} className={selectedIds.includes(purchase.id) ? "is-selected" : undefined}><td><input type="checkbox" aria-label={`Selecionar compra ${purchase.id}`} checked={selectedIds.includes(purchase.id)} disabled={!movable.length} onChange={(e) => setSelectedIds(e.target.checked ? [...selectedIds, purchase.id] : selectedIds.filter((id) => id !== purchase.id))} /></td><td><Link href={`/painel/compras/${purchase.id}`}>#{purchase.id}</Link></td><td><strong>{purchase.customerId ? <Link href={`/painel/usuario-site/${encodeURIComponent(purchase.customerId)}`}>{purchase.customerName}</Link> : purchase.customerName}</strong>{purchase.originalDate && <span className="calendar-chip calendar-rescheduled-chip">Reagendada de {shortDate(purchase.originalDate)}</span>}</td><td><span className={`calendar-badge ${purchase.origin === "bilheteria" ? "calendar-origin-box" : "calendar-origin-site"}`}>{purchase.origin === "site" ? "Site" : "Bilheteria"}</span></td><td className="calendar-number">{purchase.people}</td><td className="calendar-number">{purchase.addons}</td><td className="calendar-number calendar-nowrap">{calendarMoney(purchase.valueCents)}</td><td>{validities.length ? validities.map((value) => <small key={value}>Até {shortDate(value)}</small>) : <span>Não informada</span>}</td><td><span className="calendar-badge calendar-ok-chip">{purchase.status}</span></td><td><button className="calendar-text-link" type="button" aria-label={`Editar vouchers da compra ${purchase.id}`} disabled={!movable.length} onClick={() => setRescheduling({ purchaseIds: [purchase.id], voucherIds: movable.map((voucher) => voucher.id) })}>Editar</button></td></tr>; })}</tbody></table></div>
      {!purchases.length && <p className="calendar-empty-state">Nenhuma compra encontrada para esta data e estes filtros.</p>}
      <p className="calendar-hint">Marque várias compras para mover em lote, por exemplo quando chove. Para uma compra só, use Editar na linha.</p>
    </section>
    {rescheduling && <CalendarRescheduleDialog purchaseIds={rescheduling.purchaseIds} voucherIds={rescheduling.voucherIds} peopleCount={selectedVouchers.filter((voucher) => voucher.kind === "passport").length} totalValue={calendarMoney(selectedVouchers.reduce((sum, voucher) => sum + voucher.valueCents, 0))} onClose={() => { setRescheduling(null); setSelectedIds([]); }} onSuccess={() => router.refresh()} />}
  </div>;
}
