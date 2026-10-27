import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CalendarProductFields, getDefaultCalendarProducts } from "./calendar-product-fields";
import { DEFAULT_B2C_PRODUCTS } from "@/lib/b2c-catalog-defaults";

const products = [...DEFAULT_B2C_PRODUCTS, { ...DEFAULT_B2C_PRODUCTS[0], id: "festa", title: "Passaporte especial Dia das Crianças" }, { ...DEFAULT_B2C_PRODUCTS[0], id: "inativo", active: false }];
describe("date product selection", () => {
  it("defaults to active regular passports and every active addon", () => {
    const defaults = getDefaultCalendarProducts(products);
    expect(defaults.passportIds).toEqual(DEFAULT_B2C_PRODUCTS.filter((p) => p.type === "passport").map((p) => p.id));
    expect(defaults.addonIds).toEqual(DEFAULT_B2C_PRODUCTS.filter((p) => p.type === "addon").map((p) => p.id));
  });
  it("shows both catalog prices and permits special passports only for events", () => {
    const props = { products, passportIds: [], addonIds: [], onPassportsChange() {}, onAddonsChange() {} };
    const regular = renderToStaticMarkup(<CalendarProductFields {...props} isEvent={false} />);
    expect(regular).toContain("Bilheteria");
    expect(regular).toContain("Site");
    expect(regular).toContain("Selecionar todos");
    expect(regular).not.toContain('value="festa"');
    const event = renderToStaticMarkup(<CalendarProductFields {...props} isEvent />);
    expect(event).toContain('value="festa"');
  });
});
