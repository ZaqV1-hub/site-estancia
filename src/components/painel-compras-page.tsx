import Link from "next/link";
import type { PainelPurchaseListResult } from "@/lib/painel-compras";

type PainelComprasPageProps = {
  actorName: string | null;
  actorCpf: string | null;
  result: PainelPurchaseListResult;
};

const typeOptions = [
  { value: "bilhe", label: "Bilheteria" },
  { value: "reser", label: "Reserva" },
  { value: "ponli", label: "Compra" },
];

const purchaseStatusOptions = [
  { value: "pend", label: "Em processamento" },
  { value: "conc", label: "Concluída" },
  { value: "canc", label: "Cancelada" },
];

const gatewayPaymentMethodOptions = [
  { value: "1", label: "Cartão de crédito" },
  { value: "2", label: "Boleto" },
  { value: "11", label: "Pix" },
];

const ticketPaymentMethodOptions = [
  { value: "dinhe", label: "Dinheiro" },
  { value: "debit", label: "Débito" },
  { value: "credi", label: "Crédito" },
  { value: "chequ", label: "Cheque" },
  { value: "tranb", label: "Trans. Bancária" },
  { value: "corte", label: "Cortesia" },
  { value: "pix", label: "PIX" },
];

const paymentMethodOptions = [
  ...gatewayPaymentMethodOptions.map((option) => ({
    value: `gateway:${option.value}`,
    label: option.label,
  })),
  ...ticketPaymentMethodOptions.map((option) => ({
    value: `ticket:${option.value}`,
    label: option.label,
  })),
];

const gatewayStatusOptions = [
  { value: "1", label: "Aguardando pagamento" },
  { value: "2", label: "Em análise" },
  { value: "3", label: "Paga" },
  { value: "4", label: "Disponível" },
  { value: "5", label: "Em disputa" },
  { value: "6", label: "Devolvida" },
  { value: "7", label: "Cancelada" },
  { value: "8", label: "Chargeback debitado" },
  { value: "9", label: "Em contestação" },
];

function buildComprasHref(
  filters: PainelPurchaseListResult["filters"],
  page: number,
) {
  const params = new URLSearchParams();

  if (filters.calendar) params.set("calendar", filters.calendar);
  if (filters.origin) params.set("origin", filters.origin);
  if (filters.voucherStatus) params.set("voucherStatus", filters.voucherStatus);
  if (filters.search) params.set("search", filters.search);

  if (filters.dateFrom) {
    params.set("dtcompra[de]", filters.dateFrom);
  }

  if (filters.dateTo) {
    params.set("dtcompra[ate]", filters.dateTo);
  }

  if (filters.visitDateFrom) {
    params.set("dtagenda[de]", filters.visitDateFrom);
  }

  if (filters.visitDateTo) {
    params.set("dtagenda[ate]", filters.visitDateTo);
  }

  if (filters.purchaseId) {
    params.set("idcompra", filters.purchaseId);
  }

  if (filters.type) {
    params.set("tpcompra", filters.type);
  }

  if (filters.purchaseStatus) {
    params.set("stcompra", filters.purchaseStatus);
  }

  if (filters.paymentMethod) {
    params.set("payment", filters.paymentMethod);
  } else if (filters.gatewayPaymentMethod) {
    params.set("paymentmethodtype", filters.gatewayPaymentMethod);
  } else if (filters.ticketPaymentMethod) {
    params.set("formapag", filters.ticketPaymentMethod);
  }

  if (filters.gatewayStatus) {
    params.set("status", filters.gatewayStatus);
  }

  if (filters.cpf) {
    params.set("cpf", filters.cpf);
  }

  if (filters.userName) {
    params.set("nmusuario", filters.userName);
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  const query = params.toString();
  return query ? `/painel/compras?${query}` : "/painel/compras";
}

function renderSelect(
  name: string,
  value: string | null,
  options: ReadonlyArray<{ value: string; label: string }>,
  allLabel = "Todos",
) {
  return (
    <select
      className="calendar-input"
      defaultValue={value ?? "-1"}
      name={name}
    >
      <option value="-1">{allLabel}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function hasActiveFilters(filters: PainelPurchaseListResult["filters"]) {
  return Object.entries(filters).some(([key, value]) => key !== "calendar" && value != null && value !== "");
}

function toDateInputValue(value: string | null) {
  if (!value) {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    const [day, month, year] = value.split("/");
    return `${year}-${month}-${day}`;
  }

  return "";
}

function buildLegacyUserHref(cpf: string) {
  return `/painel/usuario-site/${encodeURIComponent(cpf)}`;
}

export function PainelComprasPage({
  actorName,
  actorCpf,
  result,
}: PainelComprasPageProps) {
  const previousHref =
    result.page > 1 ? buildComprasHref(result.filters, result.page - 1) : null;
  const nextHref =
    result.page < result.totalPages
      ? buildComprasHref(result.filters, result.page + 1)
      : null;
  const listHref = result.filters.calendar ? "/painel/compras?calendar=1" : "/painel/compras";
  const canRefreshPurchases = actorCpf === "00000000191";
  const filtersActive = hasActiveFilters(result.filters);
  const exportHref = buildComprasHref(result.filters, 1).replace(
    "/painel/compras",
    "/api/painel/compras/export",
  );

  const voucherParams = new URLSearchParams();
  if (result.filters.visitDateFrom) voucherParams.set("dtagenda[de]", result.filters.visitDateFrom);
  if (result.filters.visitDateTo) voucherParams.set("dtagenda[ate]", result.filters.visitDateTo);
  const vouchersHref = `/painel/compras/vouchers${voucherParams.size ? `?${voucherParams}` : ""}`;

  const financialFiltersActive = Boolean(result.filters.dateFrom || result.filters.dateTo ||
    result.filters.purchaseId || result.filters.type || result.filters.purchaseStatus ||
    result.filters.paymentMethod || result.filters.gatewayPaymentMethod ||
    result.filters.ticketPaymentMethod || result.filters.gatewayStatus || result.filters.cpf || result.filters.userName);

  return (
    <section className="calendar-page calendar-purchase-list">
      <div className="calendar-card">
        <header className="calendar-page-header">
          <div>
            <p className="calendar-eyebrow">Compras</p>
            <h1 className="calendar-heading">Todas as compras</h1>
            <p className="calendar-muted">A mesma lista de sempre, com filtro por data da visita. O calendário e a lista mostram os mesmos dados.</p>
          </div>
          <div className="calendar-inline-actions">
          <Link className="calendar-button-secondary" href={vouchersHref}>Vouchers por data de visita</Link>
          <nav className="calendar-view-switch" aria-label="Visualização da agenda">
            <Link href="/painel/agenda">Calendário</Link>
            <Link href={listHref} aria-current="page">Lista</Link>
          </nav>
          </div>
        </header>

        <form action="/painel/compras" method="get">
          {result.filters.calendar && <input name="calendar" type="hidden" value="1" />}
          <div className="calendar-list-controls">
            <div className="calendar-list-range">
              <label className="calendar-field">Data da visita de
                <input className="calendar-input" defaultValue={toDateInputValue(result.filters.visitDateFrom)} name="dtagenda[de]" type="date" />
              </label>
              <label className="calendar-field">Até
                <input className="calendar-input" defaultValue={toDateInputValue(result.filters.visitDateTo)} name="dtagenda[ate]" type="date" />
              </label>
            </div>
            <label className="calendar-field">Origem
              {renderSelect("origin", result.filters.origin ?? null, [{ value: "site", label: "Site" }, { value: "bilheteria", label: "Bilheteria" }], "Todas as origens")}
            </label>
            <label className="calendar-field">Situação
              {renderSelect("voucherStatus", result.filters.voucherStatus ?? null, [
                { value: "rescheduled", label: "Reagendadas" }, { value: "available", label: "Disponíveis" }, { value: "used", label: "Utilizadas" },
              ], "Todas as situações")}
            </label>
            <label className="calendar-field">Buscar compra
              <input className="calendar-input" defaultValue={result.filters.search ?? ""} name="search" placeholder="Buscar por ID ou comprador" type="search" />
            </label>
            <button className="calendar-button" type="submit">Filtrar</button>
          </div>

          <details className="calendar-list-advanced" open={financialFiltersActive}>
            <summary>Filtros financeiros e da compra</summary>
            <div className="calendar-list-advanced-grid">
              <label className="calendar-field">Compra de
                <input className="calendar-input" defaultValue={toDateInputValue(result.filters.dateFrom)} name="dtcompra[de]" type="date" />
              </label>
              <label className="calendar-field">Compra até
                <input className="calendar-input" defaultValue={toDateInputValue(result.filters.dateTo)} name="dtcompra[ate]" type="date" />
              </label>
              <label className="calendar-field">ID
                <input className="calendar-input" defaultValue={result.filters.purchaseId ?? ""} min={1} name="idcompra" type="number" />
              </label>
              <label className="calendar-field">Tipo
                {renderSelect("tpcompra", result.filters.type, typeOptions)}
              </label>
              <label className="calendar-field">Status financeiro
                {renderSelect("stcompra", result.filters.purchaseStatus, purchaseStatusOptions)}
              </label>
              <label className="calendar-field">Forma de pgto
                {renderSelect("payment", result.filters.paymentMethod ??
                  (result.filters.gatewayPaymentMethod ? `gateway:${result.filters.gatewayPaymentMethod}` :
                    result.filters.ticketPaymentMethod ? `ticket:${result.filters.ticketPaymentMethod}` : null), paymentMethodOptions)}
              </label>
              <label className="calendar-field">Pagamento
                {renderSelect("status", result.filters.gatewayStatus, gatewayStatusOptions)}
              </label>
              <label className="calendar-field">CPF
                <input className="calendar-input" defaultValue={result.filters.cpf ?? ""} name="cpf" type="text" />
              </label>
              <label className="calendar-field">Usuário
                <input className="calendar-input" defaultValue={result.filters.userName ?? ""} name="nmusuario" type="text" />
              </label>
            </div>
          </details>
        </form>

        {result.items.length === 0 ? <p className="calendar-muted">Nenhuma compra encontrada.</p> : (
          <div className="calendar-table-scroll">
            <table className="calendar-purchases-table">
              <thead><tr>
                <th scope="col">Compra</th><th scope="col">Comprador</th><th scope="col">Data da visita</th>
                <th scope="col">Origem</th><th className="calendar-number" scope="col">Pessoas</th>
                <th className="calendar-number" scope="col">Adicionais</th><th className="calendar-number" scope="col">Valor</th><th scope="col">Situação</th>
              </tr></thead>
              <tbody>{result.items.map((item) => (
                <tr key={item.purchaseId}>
                  <td>
                    <Link aria-label={`Ver detalhes da compra ${item.purchaseId}`} href={`/painel/compras/${item.purchaseId}`}>{item.purchaseId}</Link>
                    <small className="calendar-list-financial">{item.purchaseDate ?? "—"}</small>
                    <small className="calendar-list-financial"><span aria-label="Status da compra" className={`calendar-purchase-status calendar-purchase-status-${item.status}`}>{item.statusLabel}</span></small>
                    <small className="calendar-list-financial">{item.paymentMethodLabel} · {item.paymentLabel}</small>
                  </td>
                  <td>{item.userName && item.cpf ? <a href={buildLegacyUserHref(item.cpf)}>{item.userName}</a> : item.userName ?? "—"}<small>{item.cpf}</small></td>
                  <td className="calendar-nowrap">{item.visitDate ?? "—"}</td>
                  <td><span className="calendar-list-origin">{item.originLabel ?? item.typeLabel}</span></td>
                  <td className="calendar-number">{item.people ?? "—"}</td>
                  <td className="calendar-number">{item.addons ?? 0}</td><td className="calendar-number calendar-nowrap">R$ {item.visitValue ?? item.totalValue}
                    {item.visitValue && item.visitValue !== item.totalValue && <small>Total da compra: R$ {item.totalValue}</small>}
                  </td>
                  <td><span className={`calendar-list-status calendar-list-status-${item.voucherStatus ?? "inactive"}`}>{item.voucherStatusLabel ?? item.statusLabel}</span></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}

        <footer className="calendar-list-footer">
          <div>
            <p className="calendar-muted">{result.total} {result.total === 1 ? "compra encontrada" : "compras encontradas"}</p>
            <small className="calendar-muted">Operador: {actorName || actorCpf || "Sessão operacional"}</small>
          </div>
          <div className="calendar-list-actions">
            <Link className="calendar-button-secondary" href={exportHref}>Exportar Excel</Link><Link className="calendar-button-secondary" target="_blank" href={`${exportHref}${exportHref.includes("?") ? "&" : "?"}format=pdf`}>Exportar PDF</Link>
            {filtersActive && <Link className="calendar-button-secondary" href={listHref}>Limpar filtros</Link>}
            {previousHref && <Link className="calendar-button-secondary" href={previousHref}>Página anterior</Link>}
            {nextHref && <Link className="calendar-button-secondary" href={nextHref}>Próxima página</Link>}
          </div>
        </footer>
        {canRefreshPurchases && <p className="calendar-muted">Atualização manual em fase futura</p>}
      </div>
    </section>
  );
}
