"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CalendarRescheduleDialog } from "@/components/calendar-reschedule-dialog";
import { calendarMoney, calendarDateLabel } from "@/components/operational-calendar";
import { calendarValidityLabels, type CalendarDay, type CalendarPurchase, type CalendarBar } from "@/lib/operational-calendar-contracts";

export function filterCalendarPurchases(purchases: CalendarPurchase[], search: string, origin: "all" | "site" | "bilheteria") {
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const query = normalize(search.trim());
  return purchases.filter((purchase) => (origin === "all" || purchase.origin === origin) && (!query || normalize(`${purchase.id} ${purchase.customerName} ${purchase.customerId}`).includes(query)));
}

export function movableCalendarVoucherIds(purchases: CalendarPurchase[], selectedIds: number[]) {
  return purchases.filter((purchase) => selectedIds.includes(purchase.id)).flatMap((purchase) => purchase.vouchers.filter((voucher) => !voucher.used && !voucher.invalid).map((voucher) => voucher.id));
}

function CalendarBars({ title, items }: { title: string; items: CalendarBar[] }) {
  const sold = items.filter((item) => item.quantity > 0);
  const maximum = Math.max(1, ...sold.map((item) => item.quantity));
  return <section className="calendar-card"><h2>{title}</h2>{sold.length ? <div className="calendar-chart">{sold.map((item, index) => <div className="calendar-chart-row" key={`${item.title}-${index}`}><div><span>{item.title}</span><strong>{item.quantity}</strong></div><div className="calendar-chart-track"><span className={`calendar-chart-fill calendar-chart-color-${index % 5 + 1}`} style={{ width: `${item.quantity / maximum * 100}%` }} /></div></div>)}</div> : <p className="calendar-empty-state">Nenhum item vendido nesta data.</p>}</section>;
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

  return <div className="calendar-page">
    <header className="calendar-page-header"><div><Link href={`/painel/agenda?mes=${Number(data.date.slice(5, 7))}&ano=${data.date.slice(0, 4)}`} className="calendar-back-link">‹ Calendário</Link><p className={`calendar-eyebrow ${event ? "calendar-event-label" : ""}`}>{event ? "Relatório do evento" : "Relatório do dia"}</p><h1 className="calendar-heading">{event ? rule?.eventTitle || "Evento" : calendarDateLabel(data.date)}</h1>{event && <p className="calendar-muted">{calendarDateLabel(data.date)}</p>}<p className="calendar-muted">Tudo nesta tela já está filtrado para esta data de visita.</p></div>{rule && !archivedEvent && <Link className="calendar-button" href={editHref}>{event ? "Editar evento" : "Editar data"}</Link>}</header>
    {archivedEvent && <p className="calendar-catalog-note">Evento arquivado. A data, as compras e o histórico permanecem disponíveis neste relatório.</p>}
    {data.event?.pageEnabled && <section className="calendar-card calendar-page"><p className="calendar-eyebrow">Página do evento</p><h2>{data.event.pageTitle || data.event.title}</h2><p className="whitespace-pre-wrap break-words">{data.event.pageContent}</p></section>}
    <div className="calendar-metrics">
      <article className="calendar-card calendar-metric"><p>Pessoas previstas</p><strong>{summary.people}</strong><small>{summary.passports.filter((item) => item.quantity > 0).map((item) => `${item.quantity} ${item.title}`).join(" · ") || "Nenhum passaporte vendido"}</small></article>
      <article className="calendar-card calendar-metric"><p>Compras</p><strong>{summary.purchases}</strong><small>{summary.rescheduled > 0 ? `${summary.rescheduled} reagendadas` : "Compras desta data"}</small></article>
      <article className="calendar-card calendar-metric"><p>Itens adicionais</p><strong>{summary.addons}</strong><small>Itens para esta visita</small></article>
      <article className="calendar-card calendar-metric"><p>Faturamento da data</p><strong>{calendarMoney(summary.revenueCents)}</strong><small>Passaportes e adicionais</small></article>
    </div>
    <section className="calendar-card"><div className="calendar-source-header"><h2>Site e bilheteria</h2><span className="calendar-muted">Participação no faturamento</span></div><div className="calendar-source-bar" role="img" aria-label={`Site ${sitePercent}%, bilheteria ${boxPercent}%`}><span style={{ width: `${sitePercent}%` }} /><span style={{ width: `${boxPercent}%` }} /></div><div className="calendar-source-labels"><p><i /> Site <strong>{calendarMoney(summary.siteCents)}</strong><span>{sitePercent}%</span></p><p><i className="is-box-office" /> Bilheteria <strong>{calendarMoney(summary.boxOfficeCents)}</strong><span>{boxPercent}%</span></p></div></section>
    <div className="calendar-report-columns"><CalendarBars title="Passaportes vendidos" items={summary.passports} /><CalendarBars title="Itens adicionais vendidos" items={summary.addonItems} /></div>
    <section className="calendar-card"><div className="calendar-page-header"><h2>Regra desta data</h2>{rule && !archivedEvent && <Link className="calendar-button-secondary" href={editHref}>{event ? "Editar evento" : "Editar"}</Link>}</div>{rule ? <><div className="calendar-rule-summary"><p><span className="calendar-muted">Validade</span><strong>{calendarValidityLabels[rule.validity]}</strong></p><p><span className="calendar-muted">Status</span><strong>{rule.status === "fec" ? "Fechada" : rule.status === "lot" ? "Lotada" : "Aberta"}</strong></p><p><span className="calendar-muted">Operação</span><strong>{event ? "Evento" : "Day use"}</strong></p></div><div className="calendar-rule-products">{(["passport", "addon"] as const).map((kind) => { const ids = kind === "passport" ? rule.passportIds : rule.addonIds; return <div key={kind}><h3>{kind === "passport" ? "Passaportes disponíveis" : "Adicionais disponíveis"}</h3><div className="calendar-chips">{ids.length ? ids.map((id) => <span className="calendar-chip" key={id}>{data.products.find((product) => product.id === id)?.title ?? id}</span>) : <span className="calendar-muted">Nenhum selecionado</span>}</div></div>; })}</div><p className="calendar-muted">Alterações na oferta valem para próximas compras. Vouchers vendidos preservam preço e validade.</p></> : <p className="calendar-muted">Esta data ainda não tem regra cadastrada.</p>}</section>
    <section className="calendar-card">
      <div className="calendar-page-header"><div><h2>Compras desta data</h2><p className="calendar-muted">{purchases.length} {purchases.length === 1 ? "compra" : "compras"}</p></div><Link className="calendar-button-secondary" href={`/painel/compras?dtagenda%5Bde%5D=${shortDate(data.date)}&dtagenda%5Bate%5D=${shortDate(data.date)}`}>Ver lista de compras e vouchers</Link></div>
      <div className="calendar-purchase-filters"><label className="calendar-field">Buscar compra ou comprador<input className="calendar-input" type="search" placeholder="ID, nome ou ID do comprador" value={search} onChange={(e) => setSearch(e.target.value)} /></label><label className="calendar-field">Origem<select className="calendar-input" value={origin} onChange={(e) => setOrigin(e.target.value as typeof origin)}><option value="all">Todas as origens</option><option value="site">Site</option><option value="bilheteria">Bilheteria</option></select></label></div>
      {!!selectedIds.length && <div className="calendar-selection-bar"><span>{selectedIds.length} compras selecionadas · {voucherIds.length} vouchers disponíveis</span><button className="calendar-button" type="button" disabled={!voucherIds.length} onClick={() => setRescheduling({ purchaseIds: selectedIds, voucherIds })}>Mover vouchers</button><button className="calendar-button-secondary" type="button" onClick={() => setSelectedIds([])}>Limpar seleção</button><small>Vouchers usados ou cancelados permanecem na data atual.</small></div>}
      <div className="calendar-table-scroll"><table className="calendar-purchases-table"><thead><tr><th><input type="checkbox" aria-label="Selecionar todas as compras disponíveis" checked={selectedAll} disabled={!movablePurchases.length} onChange={(e) => setSelectedIds(e.target.checked ? [...new Set([...selectedIds, ...movablePurchases.map((purchase) => purchase.id)])] : selectedIds.filter((id) => !movablePurchases.some((purchase) => purchase.id === id)))} /></th><th>ID</th><th>Comprador</th><th>Origem</th><th>Pessoas</th><th>Adicionais</th><th>Valor</th><th>Validade</th><th>Situação</th></tr></thead><tbody>{purchases.map((purchase) => { const validities = [...new Set(purchase.vouchers.map((voucher) => voucher.validUntil).filter(Boolean))] as string[]; return <tr key={purchase.id}><td><input type="checkbox" aria-label={`Selecionar compra ${purchase.id}`} checked={selectedIds.includes(purchase.id)} disabled={!purchase.vouchers.some((voucher) => !voucher.used && !voucher.invalid)} onChange={(e) => setSelectedIds(e.target.checked ? [...selectedIds, purchase.id] : selectedIds.filter((id) => id !== purchase.id))} /></td><td><Link href={`/painel/compras/${purchase.id}`}>#{purchase.id}</Link></td><td><strong>{purchase.customerName}</strong><small>ID do comprador {purchase.customerId}</small>{purchase.originalDate && <span className="calendar-chip calendar-rescheduled-chip">Reagendada de {shortDate(purchase.originalDate)}</span>}</td><td><span className="calendar-chip">{purchase.origin === "site" ? "Site" : "Bilheteria"}</span></td><td>{purchase.people}</td><td>{purchase.addons}</td><td className="calendar-nowrap">{calendarMoney(purchase.valueCents)}</td><td>{validities.length ? validities.map((value) => <small key={value}>Até {shortDate(value)}</small>) : <span>Não informada</span>}</td><td>{purchase.status}</td></tr>; })}</tbody></table></div>
      {!purchases.length && <p className="calendar-empty-state">Nenhuma compra encontrada para esta data e estes filtros.</p>}
    </section>
    {rescheduling && <CalendarRescheduleDialog purchaseIds={rescheduling.purchaseIds} voucherIds={rescheduling.voucherIds} onClose={() => { setRescheduling(null); setSelectedIds([]); }} onSuccess={() => router.refresh()} />}
  </div>;
}
