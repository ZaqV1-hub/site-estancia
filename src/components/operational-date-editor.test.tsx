import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { OperationalDateEditor, validateCalendarDateDraft } from "./operational-date-editor";
import { DEFAULT_B2C_PRODUCTS } from "@/lib/b2c-catalog-defaults";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
describe("date editor", () => {
  it("rejects new past dates and missing passports", () => {
    expect(validateCalendarDateDraft({ date: "2026-10-27", passportIds: ["adulto"] }, "2026-10-27", false)).toContain("futura");
    expect(validateCalendarDateDraft({ date: "2026-10-28", passportIds: [] }, "2026-10-27", false)).toContain("passaporte");
    expect(validateCalendarDateDraft({ date: "2026-02-31", passportIds: ["adulto"] }, "2026-01-01", false)).toContain("válida");
    expect(validateCalendarDateDraft({ date: "2026-10-28", passportIds: ["adulto"] }, "2026-10-27", false)).toBeNull();
  });
  it("keeps sold-out dates closed until the operator explicitly reopens them", () => {
    const html=renderToStaticMarkup(<OperationalDateEditor products={DEFAULT_B2C_PRODUCTS} today="2026-10-27" rule={{agendaId:1,date:"2026-11-01",type:"dayuse",status:"lot",validity:"day",passportIds:["passaporte-explorador"],addonIds:[],eventId:null,eventTitle:null}} />);
    expect(html).toContain('<option value="fec" selected="">');
    expect(html).toContain("Esta data estava lotada");
  });
  it("renders only date rules and product prices with regular defaults", () => {
    const html = renderToStaticMarkup(<OperationalDateEditor date="2026-11-01" rule={null} products={DEFAULT_B2C_PRODUCTS} today="2026-10-27" />);
    expect(html).toContain("Validade dos vouchers");
    expect(html).toContain("Só no dia");
    expect(html).toContain("Abrir data");
    expect(html).toMatch(/<input[^>]*checked=""[^>]*value="passaporte-explorador"/);
    expect(html).not.toContain("Tipo da agenda");
    expect(html).not.toContain("Tabela de preço");
    expect(html).not.toContain("Informação vinculada");
  });
});
