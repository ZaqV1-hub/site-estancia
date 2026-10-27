import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { OperationalCalendar, matchesCalendarFilter } from "./operational-calendar";
import type { CalendarMonth } from "@/lib/operational-calendar-contracts";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
const summary = { people: 12, purchases: 3, addons: 4, revenueCents: 12550, siteCents: 10000, boxOfficeCents: 2550, rescheduled: 2, passports: [], addonItems: [] };
const day: CalendarMonth["days"][number] = { date: "2026-11-15", summary, rule: { agendaId: 1, date: "2026-11-15", type: "event", status: "abe", validity: "day", passportIds: [], addonIds: [], eventId: "festa", eventTitle: "Festa da família" } };

describe("operational calendar", () => {
  it("shows real date totals, event name and report link", () => {
    const html = renderToStaticMarkup(<OperationalCalendar data={{ month: 11, year: 2026, today: "2026-10-27", days: [day] }} />);
    expect(html).toContain("Festa da família");
    expect(html).toContain("12");
    expect(html).toContain("125,50");
    expect(html).toContain("/painel/agenda/2026-11-15");
    expect(html).toContain("2 reagendadas");
    expect(html).toContain("/painel/compras");
  });
  it("filters upcoming, events and rescheduled from the same date summary", () => {
    expect(matchesCalendarFilter(day, "events", "2026-11-20")).toBe(true);
    expect(matchesCalendarFilter(day, "upcoming", "2026-11-20")).toBe(false);
    expect(matchesCalendarFilter(day, "rescheduled", "2026-11-20")).toBe(true);
    expect(matchesCalendarFilter({ ...day, summary: { ...summary, rescheduled: 0 } }, "rescheduled", "2026-11-20")).toBe(false);
  });
  it("preserves closed dates as existing reports instead of offering duplicate creation", () => {
    const html = renderToStaticMarkup(<OperationalCalendar data={{ month: 11, year: 2026, today: "2026-10-27", days: [{ ...day, rule: { ...day.rule, status: "fec" } }] }} />);
    expect(html).toContain("Fechada");
    expect(html).toContain("/painel/agenda/2026-11-15");
    expect(html).toContain("calendar-day-closed");
  });
});
