"use client";

import { getB2cBoxOfficePrice, getB2cSitePrice, type B2cProduct } from "@/lib/b2c-catalog-defaults";
import { isEventOnlyProduct } from "@/lib/calendar-validity";

export function getDefaultCalendarProducts(products: B2cProduct[]) {
  return {
    passportIds: products.filter((p) => p.active && p.type === "passport" && !isEventOnlyProduct(p)).map((p) => p.id),
    addonIds: products.filter((p) => p.active && p.type === "addon").map((p) => p.id),
  };
}

export type CalendarProductFieldsProps = {
  products: B2cProduct[];
  passportIds: string[];
  addonIds: string[];
  onPassportsChange: (ids: string[]) => void;
  onAddonsChange: (ids: string[]) => void;
  isEvent: boolean;
};

export function CalendarProductFields({ products, passportIds, addonIds, onPassportsChange, onAddonsChange, isEvent }: CalendarProductFieldsProps) {
  const money = (value: string) => Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return <>
    {(["passport", "addon"] as const).map((kind) => {
      const available = products.filter((p) => p.active && p.type === kind && (kind === "addon" || isEvent || !isEventOnlyProduct(p)));
      const selected = kind === "passport" ? passportIds : addonIds;
      const onChange = kind === "passport" ? onPassportsChange : onAddonsChange;
      const allSelected = available.length > 0 && available.every((p) => selected.includes(p.id));
      return <fieldset key={kind} className="calendar-product-fieldset">
        <legend>{kind === "passport" ? "Passaportes à venda nesta data" : "Itens adicionais"}</legend>
        <label className="calendar-check calendar-select-all"><input type="checkbox" checked={allSelected} disabled={!available.length} onChange={(e) => onChange(e.target.checked ? available.map((p) => p.id) : [])} /> Selecionar todos</label>
        <div className="calendar-product-grid">
          {available.map((product) => <label key={product.id} className={`calendar-product-option ${selected.includes(product.id) ? "is-selected" : ""}`}>
            <input type="checkbox" value={product.id} checked={selected.includes(product.id)} onChange={(e) => onChange(e.target.checked ? [...selected, product.id] : selected.filter((id) => id !== product.id))} />
            <span><strong>{product.title}</strong><span className="calendar-product-prices">Site {money(getB2cSitePrice(product))}<br />Bilheteria {money(getB2cBoxOfficePrice(product))}</span>{isEventOnlyProduct(product) && <span className="calendar-chip calendar-event-chip">Exclusivo de evento</span>}</span>
          </label>)}
        </div>
        {!available.length && <p className="calendar-muted">Nenhum {kind === "passport" ? "passaporte" : "adicional"} ativo no catálogo.</p>}
      </fieldset>;
    })}
  </>;
}
