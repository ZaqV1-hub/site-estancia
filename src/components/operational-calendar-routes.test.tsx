import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ access: vi.fn(), month: vi.fn(), day: vi.fn(), rule: vi.fn(), content: vi.fn() }));
vi.mock("@/lib/painel-session", () => ({ requirePainelAccess: mocks.access }));
vi.mock("@/lib/operational-calendar", () => ({ getCalendarMonth: mocks.month, getCalendarDay: mocks.day, getCalendarRule: mocks.rule }));
vi.mock("@/lib/estancia-content-store", () => ({ readEstanciaContent: mocks.content }));
vi.mock("@/lib/calendar-validity", async (original) => ({ ...await original<typeof import("@/lib/calendar-validity")>(), getSaoPauloToday: () => "2026-10-27" }));
vi.mock("next/navigation", () => ({ redirect: (href: string) => { throw new Error(`redirect:${href}`); }, notFound: () => { throw new Error("not-found"); }, useRouter: vi.fn() }));

describe("calendar server routes", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.access.mockResolvedValue({}); mocks.month.mockResolvedValue({ month: 10, year: 2026, days: [] }); mocks.content.mockResolvedValue({ products: [] }); });

  it("normalizes invalid month input to the São Paulo current month", async () => {
    const page = (await import("@/app/painel/(protected)/agenda/page")).default;
    await page({ searchParams: Promise.resolve({ mes: "13", ano: "1999" }) });
    expect(mocks.month).toHaveBeenCalledWith(10, 2026);
    expect(mocks.access).toHaveBeenCalledWith("vis_agenda", "/painel/agenda");
  });
  it("does not load calendar data before permission is granted", async () => {
    mocks.access.mockRejectedValue(new Error("forbidden"));
    const page = (await import("@/app/painel/(protected)/agenda/page")).default;
    await expect(page({ searchParams: Promise.resolve({}) })).rejects.toThrow("forbidden");
    expect(mocks.month).not.toHaveBeenCalled();
  });
  it("rejects impossible day URLs without querying the database", async () => {
    const page = (await import("@/app/painel/(protected)/agenda/[date]/page")).default;
    await expect(page({ params: Promise.resolve({ date: "2026-02-31" }) })).rejects.toThrow("not-found");
    expect(mocks.day).not.toHaveBeenCalled();
  });
  it("redirects duplicate creation to the existing report", async () => {
    mocks.rule.mockResolvedValue({ date: "2026-11-01" });
    const page = (await import("@/app/painel/(protected)/agenda/adicionar/page")).default;
    await expect(page({ searchParams: Promise.resolve({ dia: "2026-11-01" }) })).rejects.toThrow("redirect:/painel/agenda/2026-11-01");
    expect(mocks.content).not.toHaveBeenCalled();
  });
  it("routes linked events to their event editor", async () => {
    mocks.day.mockResolvedValue({ rule: { type: "event", eventId: "festa" }, products: [] });
    const page = (await import("@/app/painel/(protected)/agenda/[date]/editar/page")).default;
    await expect(page({ params: Promise.resolve({ date: "2026-11-01" }) })).rejects.toThrow("redirect:/painel/site/eventos/festa/editar");
  });
  it("keeps unlinked legacy events out of the dayuse editor", async () => {
    mocks.day.mockResolvedValue({ rule: { type: "event", eventId: null }, products: [] });
    const page = (await import("@/app/painel/(protected)/agenda/[date]/editar/page")).default;
    const element = await page({ params: Promise.resolve({ date: "2026-11-01" }) });
    expect(element.type).toBe("section");
  });
});
