import Link from "next/link";
import { PanelActionIcon } from "./panel-action-icon";
import type {
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
  { value: "conc", label: "Concluída" },
  { value: "canc", label: "Cancelada" },
];

const usedStatusOptions = [
  { value: "s", label: "Sim" },
  { value: "n", label: "Não" },
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

function dateInput(value:string|null) {
  if(!value)return "";
  return /^\d{2}\/\d{2}\/\d{4}$/.test(value)?value.split("/").reverse().join("-"):value;
}
export function PainelCompraVouchersPage({result}:PainelCompraVouchersPageProps) {
  const previousHref=result.page>1?buildVoucherListHref(result.filters,result.page-1):null;
  const nextHref=result.page<result.totalPages?buildVoucherListHref(result.filters,result.page+1):null;
  const filtersActive=hasActiveFilters(result.filters);
  const exportHref=buildVoucherListHref(result.filters,1).replace("/painel/compras/vouchers","/api/painel/compras/vouchers/export");
  const dates=[
    ["Data da compra de","dtcompra[de]",result.filters.purchaseDateFrom],
    ["Data da compra até","dtcompra[ate]",result.filters.purchaseDateTo],
    ["Data de uso de","dtuso[de]",result.filters.usedDateFrom],
    ["Data de uso até","dtuso[ate]",result.filters.usedDateTo],
    ["Data de visita de","dtagenda[de]",result.filters.visitDateFrom],
    ["Data de visita até","dtagenda[ate]",result.filters.visitDateTo],
  ] as const;
  return <section className="calendar-page calendar-voucher-list">
    <nav className="calendar-crumbs" aria-label="Navegação de vouchers"><Link href="/painel">Home</Link><span>›</span><Link href="/painel/compras">Compras e reservas</Link><span>›</span><b>Vouchers</b></nav>
    <section className="calendar-card">
      <header className="calendar-page-header calendar-voucher-header"><div><p className="calendar-eyebrow">Vouchers</p><h1 className="calendar-heading">Ingressos e itens adicionais</h1><p className="calendar-page-sub">{result.total} vouchers encontrados · Valor dos itens: <strong>R$ {result.indicators.totalValue}</strong></p></div>
        <div className="calendar-inline-actions"><a className="calendar-button-secondary" href={exportHref}><PanelActionIcon kind="excel"/>Exportar Excel</a><a className="calendar-button-secondary" target="_blank" rel="noopener noreferrer" href={`${exportHref}${exportHref.includes("?")?"&":"?"}format=pdf`}><PanelActionIcon kind="export"/>Exportar PDF</a><Link className="calendar-button-secondary" href="/painel/compras"><PanelActionIcon kind="back"/>Compras</Link></div>
      </header>
      <form action="/painel/compras/vouchers" method="get" className="calendar-filter-grid">
        <label className="calendar-field">Voucher<input className="calendar-input" defaultValue={result.filters.voucherId??""} name="idvoucher" type="text" placeholder="ID do voucher"/></label>
        {dates.map(([label,name,value])=><label className="calendar-field" key={name}>{label}<input className="calendar-input" defaultValue={dateInput(value)} name={name} type="date"/></label>)}
        <label className="calendar-field">Ingresso{renderSelect("tpvoucher",result.filters.voucherType,voucherTypeOptions)}</label>
        <label className="calendar-field">Origem{renderSelect("tpcompra",result.filters.purchaseLocation,purchaseLocationOptions)}</label>
        <label className="calendar-field">Status da compra{renderSelect("stcompra",result.filters.purchaseStatus,purchaseStatusOptions)}</label>
        <label className="calendar-field">Utilizado?{renderSelect("stusado",result.filters.usedStatus,usedStatusOptions)}</label>
        <div className="calendar-filter-actions"><button className="calendar-button" type="submit"><PanelActionIcon kind="filter"/>Filtrar</button>{filtersActive&&<Link className="calendar-button-secondary" href="/painel/compras/vouchers">Limpar filtros</Link>}</div>
      </form>
    </section>
    {(["passport","addon"] as const).map(kind=>{
      const items=result.items.filter(item=>(item.kind??"passport")===kind);
      return <section className="calendar-card calendar-voucher-section" key={kind}><header className="calendar-section-header"><div><p className="calendar-eyebrow">{kind==="passport"?"Acesso ao parque":"Comprados com o ingresso"}</p><h2>{kind==="passport"?"Ingressos":"Itens adicionais"}</h2></div><span className="calendar-chip">{items.length} nesta página</span></header>
        <div className="calendar-table-scroll"><table className="calendar-purchases-table"><thead><tr>{["Compra","ID voucher","Voucher","Data da visita","Item","Valor"].map(h=><th scope="col" key={h} className={h==="Valor"?"calendar-number":undefined}>{h}</th>)}</tr></thead><tbody>{items.length?items.map(item=><tr key={`${item.purchaseId}-${item.voucherId}`}><td><Link href={`/painel/compras/${item.purchaseId}`}>#{item.purchaseId}</Link></td><td>{item.voucherId}</td><td>{item.voucherNumber??"—"}</td><td>{item.visitDate??"—"}{item.originalDate&&<small className="calendar-voucher-meta">Reagendado de {item.originalDate}</small>}{item.validUntil&&<small className="calendar-voucher-meta">Válido até {item.validUntil}</small>}</td><td>{item.ticketTypeLabel}</td><td className="calendar-number calendar-nowrap">R$ {item.unitValue}</td></tr>):<tr><td colSpan={6} className="calendar-empty-state">Nenhum {kind==="passport"?"ingresso":"item adicional"} encontrado nesta página.</td></tr>}</tbody></table></div>
      </section>;
    })}
    <footer className="calendar-list-footer"><span className="calendar-muted">Página {result.page} de {result.totalPages} · {result.total} vouchers encontrados</span><div className="calendar-inline-actions">{previousHref&&<Link className="calendar-button-secondary" href={previousHref}>Página anterior</Link>}{nextHref&&<Link className="calendar-button-secondary" href={nextHref}>Próxima página</Link>}</div></footer>
  </section>;
}
