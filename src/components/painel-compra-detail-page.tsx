import { CalendarPurchaseActions } from "@/components/calendar-purchase-actions";
import Link from "next/link";
import { PainelCompraDetailActions } from "@/components/painel-compra-detail-actions";
import {
  formatPainelBilheteriaCpf as formatCpf,
} from "@/lib/painel-bilheteria-format";
import type { PainelPurchaseDetail } from "@/lib/painel-compras";

type PainelCompraDetailPageProps = {
  detail: PainelPurchaseDetail;
  actorName: string | null;
  actorCpf: string | null;
  canManageHistory: boolean;
};

type PurchaseItemSummary = {
  key: string;
  label: string;
  visitDate: string | null;
  schoolName: string | null;
  className: string | null;
  periodName: string | null;
  quantity: number;
  unitValue: string;
  totalValue: string;
};

function parseMoneyLabel(value: string) {
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatMoneyLabel(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function isPassport(voucher: PainelPurchaseDetail["vouchers"][number]) {
  return voucher.kind === "passport";
}

function summarizePurchaseItems(vouchers: PainelPurchaseDetail["vouchers"]) {
  const grouped = new Map<string, PurchaseItemSummary>();

  for (const voucher of vouchers) {
    const key = [
      voucher.voucherTypeLabel,
      voucher.voucherType,
      voucher.visitDate ?? "",
      voucher.schoolName ?? "",
      voucher.className ?? "",
      voucher.periodName ?? "",
      voucher.unitValue,
    ].join("|");
    const current = grouped.get(key);

    if (current) {
      current.quantity += 1;
      current.totalValue = formatMoneyLabel(
        parseMoneyLabel(current.unitValue) * current.quantity,
      );
      continue;
    }

    grouped.set(key, {
      key,
      label: voucher.voucherTypeLabel,
      visitDate: voucher.visitDate,
      schoolName: voucher.schoolName,
      className: voucher.className,
      periodName: voucher.periodName,
      quantity: 1,
      unitValue: voucher.unitValue,
      totalValue: voucher.unitValue,
    });
  }

  return Array.from(grouped.values());
}

export function PainelCompraDetailPage({ detail, actorName, actorCpf, canManageHistory }: PainelCompraDetailPageProps) {
  const passports = detail.vouchers.filter(isPassport);
  const addons = detail.vouchers.filter((voucher) => !isPassport(voucher));
  const items = summarizePurchaseItems(addons);
  const hasSchoolData = detail.vouchers.some((voucher) => voucher.schoolName || voucher.className || voucher.periodName || voucher.voucherType === "escol");
  const movable = detail.vouchers.filter((voucher) => voucher.used === "n" && detail.status === "conc");
  const visits = [...new Set(detail.vouchers.map((voucher) => voucher.visitDate).filter(Boolean))];
  const validity = [...new Set(detail.vouchers.map((voucher) => voucher.validUntil).filter(Boolean))];
  const activeVouchers = detail.vouchers.filter((voucher) => voucher.used !== "inv");
  const situation = detail.status !== "conc" || !activeVouchers.length ? null
    : activeVouchers.some((voucher) => voucher.originalDate) ? "rescheduled"
    : activeVouchers.every((voucher) => voucher.used === "s") ? "used" : "available";
  const situationLabel = situation ? { available: "Disponível", used: "Utilizada", rescheduled: "Reagendada" }[situation] : detail.statusLabel;
  const reschedules = [...new Map(detail.vouchers.filter((voucher) => voucher.originalDate).map((voucher) => [
    [voucher.originalDate, voucher.visitDate, voucher.validUntil, voucher.rescheduleReason].join("|"), voucher,
  ])).values()];
  const source = detail.type === "bilhe" ? "Bilheteria" : detail.type === "ponli" ? "Site" : detail.typeLabel;

  function voucherStatus(voucher: PainelPurchaseDetail["vouchers"][number]) {
    if (voucher.used === "s") return "Utilizado";
    if (voucher.used !== "n") return voucher.usedLabel;
    if (detail.status !== "conc") return detail.statusLabel;
    return voucher.originalDate ? "Reagendado" : "Disponível";
  }

  function voucherDates(voucher: PainelPurchaseDetail["vouchers"][number]) {
    return <>
      <span className="calendar-nowrap">Visita: {voucher.visitDate ?? "Não informada"}</span>
      <small>Válido até {voucher.validUntil ?? voucher.visitDate ?? "Não informado"}</small>
      {voucher.originalDate ? <small className="calendar-rescheduled-text">Reagendado de {voucher.originalDate}{voucher.rescheduleReason ? ` · ${voucher.rescheduleReason}` : ""}</small> : null}
    </>;
  }

  function voucherAction(voucher: PainelPurchaseDetail["vouchers"][number]) {
    return voucher.used === "n" && detail.status === "conc"
      ? <CalendarPurchaseActions purchaseId={detail.purchaseId} voucherIds={[voucher.voucherId]} peopleCount={isPassport(voucher) ? 1 : 0} totalValue={voucher.unitValue} />
      : null;
  }

  return <section className="calendar-purchase-detail">
    <nav className="calendar-crumbs" aria-label="Navegação da compra">
      <Link href="/painel/agenda">Agenda</Link><span>›</span><Link href="/painel/compras">Compras e reservas</Link><span>›</span><span>#{detail.purchaseId}</span>
    </nav>
    <div className="calendar-card">
      <div className="calendar-section-header">
        <div><p className="calendar-eyebrow">Compra</p><h1 className="calendar-heading">Compra #{detail.purchaseId}</h1><p className="calendar-subtitle">{detail.userName || formatCpf(detail.cpf)} · {source}</p></div>
        <div className="calendar-inline-actions">
          {movable.length ? <CalendarPurchaseActions purchaseId={detail.purchaseId} voucherIds={movable.map((voucher) => voucher.voucherId)} peopleCount={movable.filter(isPassport).length} totalValue={formatMoneyLabel(movable.reduce((total, voucher) => total + parseMoneyLabel(voucher.unitValue), 0))} label="Mover ou editar validade" /> : null}
        </div>
      </div>
      {reschedules.length ? <div className="calendar-purchase-reschedule-notice" role="note"><strong>Reagendada.</strong>{reschedules.map((voucher) => <p key={[voucher.originalDate, voucher.visitDate, voucher.validUntil, voucher.rescheduleReason].join("|")}>Visita original em {voucher.originalDate}{voucher.rescheduleReason ? ` (${voucher.rescheduleReason})` : ""}. Nova data: {voucher.visitDate ?? "Não informada"}. Validade: {voucher.validUntil ?? voucher.visitDate ?? "Não informada"}.</p>)}</div> : null}
      <dl className="calendar-purchase-summary">
        <div><dt>Comprador</dt><dd>{detail.userName ?? "Não informado"}</dd></div>
        <div><dt>Data da visita</dt><dd>{visits.join(" · ") || "Não informada"}</dd></div>
        <div><dt>Validade</dt><dd>{validity.join(" · ") || visits.join(" · ") || "Não informada"}</dd></div>
        <div><dt>Pessoas</dt><dd>{passports.filter((voucher) => voucher.used !== "inv").length}</dd></div>
        <div><dt>Valor total</dt><dd>R$ {detail.totalValue}</dd></div>
        <div><dt>Situação</dt><dd><span className={situation ? `calendar-list-status calendar-list-status-${situation}` : `calendar-purchase-status calendar-purchase-status-${detail.status}`}>{situationLabel}</span></dd></div>
      </dl>
    </div>

    <div className="calendar-card">
      <p className="calendar-eyebrow">Passaportes</p><h2>Vouchers de entrada</h2>
      {passports.length ? <div className="calendar-table-scroll calendar-purchase-table-wrap"><table className="calendar-purchases-table calendar-vouchers-table">
        <thead><tr><th>Voucher</th><th>Passaporte</th><th>Valor</th><th>Validade</th><th>Situação</th>{hasSchoolData ? <><th>Escola</th><th>Turma</th><th>Período</th></> : null}</tr></thead>
        <tbody>{passports.map((voucher) => <tr key={voucher.voucherId} className={voucher.used === "s" ? "calendar-voucher-used" : undefined}>
          <td><span className="calendar-voucher-code">{voucher.voucherNumber ?? "-"}</span><small>ID {voucher.voucherId}</small></td>
          <td>{voucher.voucherTypeLabel}</td>
          <td className="calendar-nowrap">R$ {voucher.unitValue}</td>
          <td>{voucherDates(voucher)}{voucherAction(voucher)}</td>
          <td><span className={`calendar-chip${voucher.originalDate && voucher.used === "n" ? " calendar-rescheduled-chip" : ""}`}>{voucherStatus(voucher)}</span>{voucher.usedDate ? <small>{voucher.usedDate} {voucher.usedTime}</small> : null}</td>
          {hasSchoolData ? <><td>{voucher.schoolName && voucher.schoolTripHref ? <Link href={voucher.schoolTripHref}>{voucher.schoolName}</Link> : voucher.schoolName ?? "-"}</td><td>{voucher.className ?? "-"}</td><td>{voucher.periodName ?? "-"}</td></> : null}
        </tr>)}</tbody>
      </table></div> : <p className="calendar-empty-state">Nenhum voucher de entrada encontrado.</p>}
    </div>

    <div className="calendar-purchase-columns">
      <div className="calendar-card">
        <p className="calendar-eyebrow">Adicionais</p><h2>Itens comprados junto</h2>
        {items.length ? <div className="calendar-table-scroll calendar-purchase-table-wrap"><table className="calendar-purchases-table calendar-addons-table">
          <thead><tr><th>Item</th><th>Qtd.</th><th>Valor</th></tr></thead>
          <tbody>{items.map((item) => <tr key={item.key}><td>{item.label}<small>{item.visitDate}</small>{item.schoolName || item.className || item.periodName ? <small>{[item.schoolName, item.className, item.periodName].filter(Boolean).join(" · ")}</small> : null}</td><td>{item.quantity}</td><td className="calendar-nowrap">R$ {item.totalValue}</td></tr>)}</tbody>
        </table></div> : <p className="calendar-empty-state">Nenhum adicional nesta compra.</p>}
        <p className="calendar-hint">Passaportes R$ {formatMoneyLabel(passports.reduce((total, voucher) => total + parseMoneyLabel(voucher.unitValue), 0))} + adicionais R$ {formatMoneyLabel(addons.reduce((total, voucher) => total + parseMoneyLabel(voucher.unitValue), 0))} · Total da compra R$ {detail.totalValue}</p>
        {addons.length ? <details className="calendar-addon-vouchers"><summary>Vouchers dos adicionais</summary><ul>{addons.map((voucher) => <li key={voucher.voucherId} className={voucher.used === "s" ? "calendar-voucher-used" : undefined}><strong>{voucher.voucherTypeLabel} · {voucher.voucherNumber ?? `#${voucher.voucherId}`}</strong><div>{voucherDates(voucher)}</div><small>{voucherStatus(voucher)}{voucher.usedDate ? ` · ${voucher.usedDate} ${voucher.usedTime ?? ""}` : ""}</small>{voucherAction(voucher)}</li>)}</ul></details> : null}
      </div>
      <div className="calendar-card"><p className="calendar-eyebrow">Histórico</p><CalendarPurchaseActions key={detail.purchaseId} purchaseId={detail.purchaseId} voucherIds={[]} history historyVersion={JSON.stringify(detail.vouchers)} /></div>
    </div>

    <div className="calendar-purchase-columns">
      <div className="calendar-card">
        <p className="calendar-eyebrow">Financeiro</p><h2>Pagamento</h2>
        <dl className="calendar-purchase-summary calendar-payment-summary">
          <div><dt>CPF</dt><dd>{formatCpf(detail.cpf)}</dd></div>
          <div><dt>Origem</dt><dd>{source}</dd></div>
          <div><dt>Data da compra</dt><dd>{detail.purchaseDate ?? "Não informada"}</dd></div>
          <div><dt>Situação da compra</dt><dd><span aria-label="Status da compra" className={`calendar-purchase-status calendar-purchase-status-${detail.status}`}>{detail.statusLabel}</span></dd></div>
          <div><dt>Pagamento</dt><dd>{detail.paymentLabel}</dd></div><div><dt>Forma de pagamento</dt><dd>{detail.paymentMethodLabel}</dd></div>
          <div><dt>Data de pagamento</dt><dd>{detail.paymentDate ?? "-"}</dd></div><div><dt>Hora de pagamento</dt><dd>{detail.paymentTime ?? "-"}</dd></div>
          {detail.referralCode ? <div><dt>Código de indicação</dt><dd>{detail.referralCode}</dd></div> : null}
          {detail.gatewayPaymentId ? <><div><dt>ID Pagamento</dt><dd>{detail.gatewayPaymentId}</dd></div><div><dt>Status do gateway</dt><dd>{detail.gatewayStatusCode ? `Cielo ${detail.gatewayStatusCode} - ${detail.gatewayStatusLabel}` : "-"}</dd></div></> : null}
        </dl>
      </div>
      <PainelCompraDetailActions actorCpf={actorCpf} actorName={actorName} canManageHistory={canManageHistory} purchaseId={detail.purchaseId} voucherIds={detail.vouchers.map((voucher) => voucher.voucherId)} />
    </div>
  </section>;
}
