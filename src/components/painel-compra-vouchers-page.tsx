import Link from "next/link";
import type {
  PainelPurchaseVoucherIndicators,
  PainelPurchaseVoucherListFilters,
  PainelPurchaseVoucherListResult,
} from "@/lib/painel-compras";

type PainelCompraVouchersPageProps = {
  result: PainelPurchaseVoucherListResult;
};

const voucherTypeOptions = [
  { value: "norma", label: "Passaporte" },
  { value: "infan", label: "Passaporte Infantil" },
  { value: "isent", label: "Isento" },
  { value: "escol", label: "Escola" },
  { value: "corte", label: "Cortesia" },
  { value: "espec", label: "Ingresso Especial" },
];

const purchaseLocationOptions = [
  { value: "site", label: "Site" },
  { value: "reser", label: "Reserva" },
  { value: "parq", label: "No parque" },
];

const purchaseStatusOptions = [
  { value: "pend", label: "Em processamento" },
  { value: "conc", label: "Concluida" },
  { value: "canc", label: "Cancelada" },
];

const usedStatusOptions = [
  { value: "s", label: "Sim" },
  { value: "n", label: "Nao" },
];

function renderSelect(
  name: string,
  value: string | null,
  options: ReadonlyArray<{ value: string; label: string }>,
) {
  return (
    <select
      className="calendar-input"
      defaultValue={value ?? "-1"}
      name={name}
    >
      <option value="-1">Todos</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function buildVoucherListHref(
  filters: PainelPurchaseVoucherListFilters,
  page: number,
) {
  const params = new URLSearchParams();

  if (filters.voucherId) params.set("idvoucher", filters.voucherId);
  if (filters.purchaseDateFrom) params.set("dtcompra[de]", filters.purchaseDateFrom);
  if (filters.purchaseDateTo) params.set("dtcompra[ate]", filters.purchaseDateTo);
  if (filters.usedDateFrom) params.set("dtuso[de]", filters.usedDateFrom);
  if (filters.usedDateTo) params.set("dtuso[ate]", filters.usedDateTo);
  if (filters.visitDateFrom) params.set("dtagenda[de]", filters.visitDateFrom);
  if (filters.visitDateTo) params.set("dtagenda[ate]", filters.visitDateTo);
  if (filters.voucherType) params.set("tpvoucher", filters.voucherType);
  if (filters.purchaseLocation) params.set("tpcompra", filters.purchaseLocation);
  if (filters.purchaseStatus) params.set("stcompra", filters.purchaseStatus);
  if (filters.usedStatus) params.set("stusado", filters.usedStatus);
  if (page > 1) params.set("page", String(page));

  const query = params.toString();
  return query ? `/painel/compras/vouchers?${query}` : "/painel/compras/vouchers";
}

function hasActiveFilters(filters: PainelPurchaseVoucherListFilters) {
  return Object.values(filters).some((value) => value != null && value !== "");
}

function indicatorCards(indicators: PainelPurchaseVoucherIndicators) {
  return [
    { label: "Passaporte SITE", count: indicators.qtdnormal_site, value: indicators.vlnormal_site },
    {
      label: "Passaporte Infantil SITE",
      count: indicators.qtdinfantil_site,
      value: indicators.vlinfantil_site,
    },
    {
      label: "Passaporte NO PARQUE",
      count: indicators.qtdnormal_parque,
      value: indicators.vlnormal_parque,
    },
    {
      label: "Passaporte Infantil NO PARQUE",
      count: indicators.qtdinfantil_parque,
      value: indicators.vlinfantil_parque,
    },
    { label: "Escolar", count: indicators.qtdescola, value: indicators.vlescola },
    {
      label: "PASSAPORTE RESERVA",
      count: indicators.qtdadulto_reserva,
      value: indicators.vladulto_reserva,
    },
    {
      label: "PASSAPORTE INFANTIL RESERVA",
      count: indicators.qtdinfantil_reserva,
      value: indicators.vlinfantil_reserva,
    },
    { label: "ESPECIAIS", count: indicators.qtespecial, value: indicators.vlespecial },
    { label: "CORTESIAS", count: indicators.qtdcortesia, value: "-" },
    { label: "Isento", count: indicators.qtdisento, value: "-" },
    { label: "Total", count: indicators.totalCount, value: indicators.totalValue },
  ];
}

export function PainelCompraVouchersPage({
  result,
}: PainelCompraVouchersPageProps) {
  const previousHref =
    result.page > 1 ? buildVoucherListHref(result.filters, result.page - 1) : null;
  const nextHref =
    result.page < result.totalPages
      ? buildVoucherListHref(result.filters, result.page + 1)
      : null;
  const filtersActive = hasActiveFilters(result.filters);
  const exportHref = buildVoucherListHref(result.filters, 1).replace(
    "/painel/compras/vouchers",
    "/api/painel/compras/vouchers/export",
  );

  return (
    <section className="calendar-voucher-list grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="calendar-card">
        <div className="calendar-crumbs">
          <Link className="calendar-text-link" href="/painel">
            Home
          </Link>{" "}
          <span className="calendar-muted">&gt;</span>
          <Link className="calendar-text-link" href="/painel/compras">
            Lista de compras / reservas
          </Link>{" "}
          <span className="calendar-muted">&gt;</span>
          <span>Vouchers</span>
        </div>

        <p className="calendar-voucher-list-divider" />

        {result.items.length === 0 ? (
          <h2 className="calendar-heading">Nenhum voucher encontrado</h2>
        ) : (
          <>
            <div className="grid gap-3 lg:grid-cols-4 2xl:grid-cols-6">
              {indicatorCards(result.indicators).map((card) => (
                <div
                  className="calendar-card calendar-voucher-indicator"
                  key={card.label}
                >
                  <strong className="calendar-voucher-indicator-count">{card.count}</strong>
                  <span className="calendar-eyebrow">
                    {card.label}
                  </span>
                  <span className="calendar-muted">
                    {card.value === "-" ? "-" : `R$ ${card.value}`}
                  </span>
                </div>
              ))}
            </div>

            <div className="calendar-table-scroll mt-6">
              <table className="calendar-purchases-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Voucher</th>
                    <th>Data Visita</th>
                    <th>Passaporte</th>
                    <th>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {result.items.map((item) => (
                    <tr
                      key={`${item.purchaseId}-${item.voucherId}`}
                    >
                      <td>{item.voucherId}</td>
                      <td>
                        {item.voucherNumber ?? "-"}
                      </td>
                      <td>{item.visitDate ?? "-"}{item.originalDate ? <span className="mt-1 block text-sm">Reagendado de {item.originalDate}</span> : null}{item.validUntil ? <span className="mt-1 block text-sm">Válido até {item.validUntil}</span> : null}<Link className="mt-1 block underline" href={`/painel/compras/${item.purchaseId}`}>Compra {item.purchaseId}</Link></td>
                      <td>{item.ticketTypeLabel}</td>
                      <td>{item.unitValue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {result.totalPages > 1 ? (
          <div className="mt-5 flex flex-wrap justify-end gap-3">
            {previousHref ? (
              <Link
                className="calendar-button-secondary"
                href={previousHref}
              >
                Pagina anterior
              </Link>
            ) : null}
            {nextHref ? (
              <Link
                className="calendar-button-secondary"
                href={nextHref}
              >
                Proxima pagina
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>

      <aside className="grid content-start gap-5">
        <div className="calendar-card">
          <h2 className="calendar-heading">Ações</h2>
          <ul className="mt-4 grid gap-3 text-sm">
            <li>
              <a className="calendar-text-link" href={exportHref}>
                Exportar (.xls)
              </a>
            </li>
            <li>
              <Link className="calendar-text-link" href="/painel/compras">
                Lista de compras / reservas
              </Link>
            </li>
          </ul>
        </div>

        <div className="calendar-card">
          <div className="flex items-center justify-between gap-3">
            <h2 className="calendar-heading">Filtrar</h2>
            {filtersActive ? (
              <Link
                className="text-sm calendar-text-link"
                href="/painel/compras/vouchers"
              >
                Remover Filtros
              </Link>
            ) : null}
          </div>
          <form action="/painel/compras/vouchers" className="mt-4 grid gap-4" method="get">
            <label className="calendar-field">
              <span>Voucher</span>
              <input
                className="calendar-input"
                defaultValue={result.filters.voucherId ?? ""}
                name="idvoucher"
                type="text"
              />
            </label>

            <div className="grid gap-2">
              <label className="calendar-field">
                <span>Data da compra de</span>
                <input className="calendar-input" defaultValue={result.filters.purchaseDateFrom ?? ""} name="dtcompra[de]" type="text" />
              </label>
              <label className="calendar-field">
                <span>Data da compra ate</span>
                <input className="calendar-input" defaultValue={result.filters.purchaseDateTo ?? ""} name="dtcompra[ate]" type="text" />
              </label>
            </div>

            <div className="grid gap-2">
              <label className="calendar-field">
                <span>Data de uso de</span>
                <input className="calendar-input" defaultValue={result.filters.usedDateFrom ?? ""} name="dtuso[de]" type="text" />
              </label>
              <label className="calendar-field">
                <span>Data de uso ate</span>
                <input className="calendar-input" defaultValue={result.filters.usedDateTo ?? ""} name="dtuso[ate]" type="text" />
              </label>
            </div>

            <div className="grid gap-2">
              <label className="calendar-field">
                <span>Data de visita de</span>
                <input className="calendar-input" defaultValue={result.filters.visitDateFrom ?? ""} name="dtagenda[de]" type="text" />
              </label>
              <label className="calendar-field">
                <span>Data de visita ate</span>
                <input className="calendar-input" defaultValue={result.filters.visitDateTo ?? ""} name="dtagenda[ate]" type="text" />
              </label>
            </div>

            <label className="calendar-field">
              <span>Passaporte</span>
              {renderSelect("tpvoucher", result.filters.voucherType, voucherTypeOptions)}
            </label>
            <label className="calendar-field">
              <span>Onde</span>
              {renderSelect("tpcompra", result.filters.purchaseLocation, purchaseLocationOptions)}
            </label>
            <label className="calendar-field">
              <span>Status</span>
              {renderSelect("stcompra", result.filters.purchaseStatus, purchaseStatusOptions)}
            </label>
            <label className="calendar-field">
              <span>Usado?</span>
              {renderSelect("stusado", result.filters.usedStatus, usedStatusOptions)}
            </label>

            <button
              className="calendar-button"
              type="submit"
            >
              Filtrar
            </button>
          </form>
        </div>
      </aside>
    </section>
  );
}
