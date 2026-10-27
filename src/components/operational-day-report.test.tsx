import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { OperationalDayReport, filterCalendarPurchases, movableCalendarVoucherIds } from "./operational-day-report";
import type { CalendarDay, CalendarPurchase } from "@/lib/operational-calendar-contracts";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/components/calendar-reschedule-dialog", () => ({ CalendarRescheduleDialog: () => null }));
const purchase: CalendarPurchase = { id: 23, customerId: "7", customerName: "Maria Água", email: null, origin: "site", status: "Pago", people: 2, addons: 1, valueCents: 12980, originalDate: null, vouchers: [{ id: 1, number: "V23", type: "norma", productId: "adulto", title: "Adulto", kind: "passport", valueCents: 5990, used: false, invalid: false, validUntil: "2026-11-15", originalDate: null, rescheduleReason: null }, { id: 2, number: "V24", type: "norma", productId: "adulto", title: "Adulto", kind: "passport", valueCents: 5990, used: true, invalid: false, validUntil: "2026-11-15", originalDate: null, rescheduleReason: null }] };
const data: CalendarDay = { date: "2026-11-15", rule: { agendaId: 1, date: "2026-11-15", type: "event", status: "abe", validity: "day", passportIds: [], addonIds: [], eventId: "festa", eventTitle: "Festa da família" }, products: [], summary: { people: 2, purchases: 1, addons: 1, revenueCents: 12980, siteCents: 12980, boxOfficeCents: 0, rescheduled: 0, passports: [{ title: "Adulto", quantity: 2 }], addonItems: [{ title: "Café", quantity: 1 }, { title: "Não vendido", quantity: 0 }] }, purchases: [purchase] };

describe("day report", () => {
  it("shows event identity, shared totals, bar charts and linked purchases", () => {
    const html = renderToStaticMarkup(<OperationalDayReport data={data} />);
    expect(html).toContain("Relatório do evento");
    expect(html).toContain("Festa da família");
    expect(html).toContain("129,80");
    expect(html).toContain("/painel/compras/23");
    expect(html).toContain("Regra desta data");
    expect(html).toContain("/painel/site/eventos/festa/editar");
    expect(html).not.toContain("Não vendido");
  });
  it("shows the configured event page text in the date report", () => {
    const html=renderToStaticMarkup(<OperationalDayReport data={{...data,event:{id:"festa",title:"Festa da família",pageTitle:"Um dia no parque",pageContent:"Primeiro parágrafo.\n\nSegundo parágrafo.",pageEnabled:true}}} />);
    expect(html).toContain("Um dia no parque");
    expect(html).toContain("Primeiro parágrafo.");
    expect(html).toContain("Segundo parágrafo.");
  });
  it("preserves an archived event report without linking to a missing editor", () => {
    const html=renderToStaticMarkup(<OperationalDayReport data={{...data,event:null}} />);
    expect(html).toContain("Evento arquivado");
    expect(html).toContain("Festa da família");
    expect(html).toContain("Regra desta data");
    expect(html).not.toContain("/painel/site/eventos/festa/editar");
    expect(html).not.toContain("Editar evento");
  });
  it("filters by ID, buyer accent-insensitively and origin", () => {
    expect(filterCalendarPurchases([purchase], "agua", "all")).toHaveLength(1);
    expect(filterCalendarPurchases([purchase], "23", "site")).toHaveLength(1);
    expect(filterCalendarPurchases([purchase], "", "bilheteria")).toHaveLength(0);
  });
  it("moves only unused valid vouchers belonging to selected day rows", () => {
    expect(movableCalendarVoucherIds([purchase], [23])).toEqual([1]);
    expect(movableCalendarVoucherIds([purchase], [24])).toEqual([]);
  });
});
