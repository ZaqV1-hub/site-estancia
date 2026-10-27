import { describe, expect, it, vi, beforeEach } from "vitest";
const mocks = vi.hoisted(() => ({ read: vi.fn(), upload: vi.fn(), connect: vi.fn(), saveDate: vi.fn(), getRule: vi.fn(), ensure: vi.fn() }));
vi.mock("@/lib/estancia-content-store", () => ({ readEstanciaContent: mocks.read, saveUploadedSiteImage: mocks.upload }));
vi.mock("@/lib/ingresso-db", () => ({ getIngressoDbPool: () => ({ connect: mocks.connect }) }));
vi.mock("@/lib/operational-calendar", () => ({ saveCalendarDate: mocks.saveDate, getCalendarRule: mocks.getRule, ensureCalendarTables: mocks.ensure }));
import { calendarEventDate, parseCalendarEventForm, saveCalendarEvent, deleteCalendarEvent } from "./calendar-events";
const form = (values: Record<string, string> = {}) => { const f = new FormData(); Object.entries({ title: "Noite das estrelas", description: "Um evento", eventMode: "link", href: "https://example.com/evento", active: "on", ...values }).forEach(([k, v]) => f.set(k, v)); return f; };
describe("calendar events", () => {
    beforeEach(() => vi.resetAllMocks());
    it.each([
        "https://estanciadayuse.com.br/agenda?date=2026-11-01",
        "https://www.estanciadayuse.com.br/agenda?date=2026-11-01",
        "/agenda?date=2026-11-01",
    ])("requires the native date mode for a local calendar URL: %s", href => {
        expect(() => parseCalendarEventForm(form({ href }))).toThrow(/Data do site/);
    });
    it("rejects an internal agenda link before reading content, connecting, uploading or saving", async () => {
        const data = { events: [{ id: "existing", href: "/agenda?date=2026-11-01" }], products: [], homeImages: [], attractions: [] };
        const query = vi.fn().mockResolvedValue({ rows: [{ content_json: data }] });
        mocks.read.mockResolvedValue(data); mocks.connect.mockResolvedValue({ query, release: vi.fn() }); mocks.upload.mockResolvedValue("/image.jpg");
        await expect(saveCalendarEvent(form({ href: "https://estanciadayuse.com.br/agenda?date=2026-11-01" }), { cpf: "123", name: "Operador" })).rejects.toThrow(/Data do site/);
        expect(mocks.read).not.toHaveBeenCalled();
        expect(mocks.ensure).not.toHaveBeenCalled();
        expect(mocks.connect).not.toHaveBeenCalled();
        expect(mocks.upload).not.toHaveBeenCalled();
        expect(mocks.saveDate).not.toHaveBeenCalled();
    });
    it("keeps a real external URL with a date parameter external", () => {
        const href = "https://example.com/evento?date=2026-11-01";
        expect(parseCalendarEventForm(form({ href }))).toMatchObject({ mode: "link", date: null, href });
        expect(calendarEventDate({ href })).toBeNull();
    });
    it("never binds an external event link to a local calendar date", () => {
        expect(calendarEventDate({ href: "https://example.com/evento?date=2027-11-01" })).toBeNull();
        expect(calendarEventDate({ href: "/agenda?date=2027-02-30" })).toBeNull();
    });
    it("keeps unchanged over-limit legacy content but rejects an edited over-limit summary", () => {
        const legacy = { title: "Evento", description: "a".repeat(222) };
        expect(parseCalendarEventForm(form(legacy), legacy).description).toBe(legacy.description);
        expect(() => parseCalendarEventForm(form({ ...legacy, description: "b".repeat(221) }), legacy)).toThrow(/220/);
    });
    it("preserves legacy Unicode content byte-for-byte when another field changes", () => {
        const current = { title: "Evento", description: "a".repeat(218) + "a\u0301a\u0301" };
        expect(current.description.length).toBe(222);
        expect(parseCalendarEventForm(form(current), current).description).toBe(current.description);
        expect(() => parseCalendarEventForm(form({ description: "a".repeat(221) }))).toThrow(/220/);
    });
    it("updates a legacy event and its future validity without modifying availability, status or sold vouchers", async () => {
        const current = { id: "existing", title: "Evento", description: "a".repeat(222), href: "/agenda?date=2027-02-28", imageSrc: "/old.jpg", sortOrder: 1 };
        const data = { events: [current], products: [], homeImages: [], attractions: [] };
        const query = vi.fn<(sql: string, values?: unknown[]) => Promise<{ rows: unknown[] }>>().mockResolvedValue({ rows: [{ content_json: data }] });
        mocks.read.mockResolvedValue(data); mocks.upload.mockResolvedValue(null); mocks.connect.mockResolvedValue({ query, release: vi.fn() });
        mocks.getRule.mockResolvedValue({ agendaId: 7, date: "2027-02-28", configured: false, type: "dayuse", eventId: null, status: "lot", validity: "6m", passportIds: ["adulto"], addonIds: ["cafe"] });
        await saveCalendarEvent(form({ ...current, eventMode: "date", eventDate: "2027-02-28", editScope: "content", validity: "7d", active: "on", sortOrder: "1" }), { name: "Operador", cpf: "123" });
        const ruleWrite = query.mock.calls.find(([sql]) => sql.includes("INSERT INTO public.estancia_calendar_rules"));
        expect(ruleWrite?.[1]).toEqual(["2027-02-28", 7, "lot", "7d", ["adulto"], ["cafe"], "existing", "Evento"]);
        expect(ruleWrite?.[0]).toMatch(/validity=excluded.validity/);
        expect(mocks.saveDate).not.toHaveBeenCalled();
        expect(query.mock.calls.some(([sql]) => /\b(UPDATE|DELETE FROM)\s+(?:public\.)?voucher\b/i.test(sql))).toBe(false);
        const saved = query.mock.calls.find(([sql]) => sql.includes("UPDATE public.estancia_site_content"));
        expect(JSON.parse(String(saved?.[1]?.[0])).events[0].description).toBe(current.description);
    });
    it("rejects conflicting or ambiguous date ownership when editing or archiving", async () => {
        const current = { id: "existing", href: "/agenda?date=2027-02-28", imageSrc: "/old.jpg", sortOrder: 1 };
        const data = { events: [current], products: [], homeImages: [], attractions: [] };
        const query = vi.fn().mockResolvedValue({ rows: [{ content_json: data }] });
        mocks.read.mockResolvedValue(data); mocks.connect.mockResolvedValue({ query, release: vi.fn() });
        mocks.getRule.mockResolvedValue({ agendaId: 7, type: "event", eventId: "other", validity: "day" });
        await expect(saveCalendarEvent(form({ id: "existing", eventMode: "date", eventDate: "2027-02-28", editScope: "content" }), { name: "Operador", cpf: "123" })).rejects.toThrow(/data/);
        await expect(deleteCalendarEvent("existing", { name: "Operador", cpf: "123" })).rejects.toThrow(/data/);
        expect(query.mock.calls.some(([sql]) => sql.includes("stagenda='fec'"))).toBe(false);
        data.events.push({ ...current, id: "duplicate" });
        mocks.getRule.mockResolvedValue({ agendaId: 7, type: "dayuse", eventId: null, configured: false });
        await expect(saveCalendarEvent(form({ id: "existing", eventMode: "date", eventDate: "2027-02-28", editScope: "content" }), { name: "Operador", cpf: "123" })).rejects.toThrow(/data/);
    });
    it("rejects unsafe external URLs and over-limit titles", () => { expect(() => parseCalendarEventForm(form({ href: "javascript:alert(1)" }))).toThrow(/HTTP/); expect(() => parseCalendarEventForm(form({ title: "a".repeat(53) }))).toThrow(/52/); });
    it("validates calendar dates and requires passports for date configuration", () => { expect(() => parseCalendarEventForm(form({ eventMode: "date", eventDate: "2027-02-30" }))).toThrow(/data/i); expect(() => parseCalendarEventForm(form({ eventMode: "date", eventDate: "2027-02-28" }))).toThrow(/passaporte/i); });
    it("external event ignores date/product fields and uses default CTA", () => { const parsed = parseCalendarEventForm(form({ eventDate: "invalid", passportIds: "bad" })); expect(parsed.date).toBeNull(); expect(parsed.buttonLabel).toBe("Compre seu ingresso!"); });
    it("publishes an external event without a calendar date and preserves other site content", async () => { const data = { events: [], products: [{ id: "adulto" }], homeImages: [{ id: "hero" }], attractions: [] }; const query = vi.fn<(sql: string, values?: unknown[]) => Promise<{ rows: unknown[] }>>().mockResolvedValue({ rows: [{ content_json: data }] }); mocks.read.mockResolvedValue(data); mocks.upload.mockResolvedValue("/uploads/image.png"); mocks.connect.mockResolvedValue({ query, release: vi.fn() }); const result = await saveCalendarEvent(form({ href: "https://example.com/evento?date=2026-11-01" }), { name: "Operador", cpf: "123" }); expect(result.date).toBeNull(); expect(result.event.href).toBe("https://example.com/evento?date=2026-11-01"); expect(mocks.saveDate).not.toHaveBeenCalled(); const update = query.mock.calls.find(call => call[0].includes("UPDATE public.estancia_site_content")); const saved = JSON.parse(String(update?.[1]?.[0])); expect(saved.homeImages).toEqual(data.homeImages); expect(saved.products).toEqual(data.products); expect(saved.events[0].id).toBe(result.event.id); expect(query.mock.calls.map(call => call[0])).toContain("COMMIT"); });
    it("content-only editing preserves the date rule and prevents event date changes", async () => { const current = { id: "existing", href: "/agenda?date=2027-02-28", imageSrc: "/old.jpg", sortOrder: 1 }; const data = { events: [current], products: [], homeImages: [], attractions: [] }; const query = vi.fn<(sql: string, values?: unknown[]) => Promise<{ rows: unknown[] }>>().mockResolvedValue({ rows: [{ content_json: data }] }); mocks.read.mockResolvedValue(data); mocks.upload.mockResolvedValue(null); mocks.connect.mockResolvedValue({ query, release: vi.fn() }); mocks.getRule.mockResolvedValue({ agendaId: 7, date: "2027-02-28", type: "event", eventId: "existing", status: "lot", validity: "7d", passportIds: ["adulto"], addonIds: ["cafe"] }); await saveCalendarEvent(form({ id: "existing", eventMode: "date", eventDate: "2027-02-28", editScope: "content" }), { name: "Operador", cpf: "123" }); expect(mocks.saveDate).not.toHaveBeenCalled(); expect(query.mock.calls.some(call => call[0].includes("event_id=excluded.event_id"))).toBe(true); await expect(saveCalendarEvent(form({ id: "existing", eventMode: "date", eventDate: "2027-03-01", editScope: "content" }), { name: "Operador", cpf: "123" })).rejects.toThrow(/não podem ser alterados/); });
    it("removes an event from the site while closing and preserving its agenda", async () => { const data = { events: [{ id: "existing", href: "/agenda?date=2027-02-28", title: "Evento" }], products: [], homeImages: [], attractions: [] }; const query = vi.fn<(sql: string, values?: unknown[]) => Promise<{ rows: unknown[] }>>().mockResolvedValue({ rows: [{ content_json: data }] }); mocks.read.mockResolvedValue(data); mocks.connect.mockResolvedValue({ query, release: vi.fn() }); mocks.getRule.mockResolvedValue({ agendaId: 7, date: "2027-02-28", type: "event", eventId: "existing", status: "abe", validity: "7d", passportIds: ["adulto"], addonIds: ["cafe"] }); await deleteCalendarEvent("existing", { name: "Operador", cpf: "123" }); const update = query.mock.calls.find(call => call[0].includes("UPDATE public.estancia_site_content")); expect(JSON.parse(String(update?.[1]?.[0])).events).toEqual([]); expect(query.mock.calls.some(call => call[0].includes("DELETE FROM"))).toBe(false); expect(query.mock.calls.some(call => call[0].includes("stagenda='fec'"))).toBe(true); expect(query.mock.calls.map(call => call[0])).toContain("COMMIT"); });
    it("rolls content and calendar rule back together when saving the date fails", async () => { const f = form({ eventMode: "date", eventDate: "2027-02-28", passportIds: "adulto" }); const query = vi.fn<(sql: string, values?: unknown[]) => Promise<{ rows: unknown[] }>>().mockResolvedValue({ rows: [{ content_json: { events: [], products: [], homeImages: [], attractions: [] } }] }); const release = vi.fn(); mocks.read.mockResolvedValue({ events: [] }); mocks.upload.mockResolvedValue("/uploads/image.png"); mocks.connect.mockResolvedValue({ query, release }); mocks.getRule.mockResolvedValue(null); mocks.saveDate.mockRejectedValue(new Error("date rejected")); await expect(saveCalendarEvent(f, { name: "Operador", cpf: "123" })).rejects.toThrow("date rejected"); expect(query.mock.calls.map(c => c[0])).toContain("ROLLBACK"); expect(query.mock.calls.map(c => c[0])).not.toContain("COMMIT"); expect(release).toHaveBeenCalled(); });
});
