import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ query: vi.fn(), read: vi.fn(), availability: vi.fn() }));
vi.mock("@/lib/ingresso-db", () => ({ getIngressoDbPool: () => ({ query: mocks.query }) }));
vi.mock("@/lib/estancia-content-store", () => ({ readEstanciaContent: mocks.read }));
vi.mock("@/lib/calendar-schema", () => ({ ensureCalendarTables: vi.fn() }));
vi.mock("@/lib/painel-agenda-product-availability", () => ({ getAgendaProductAvailability: mocks.availability, readLegacyAgendaAvailability: () => ({ passportIds: ["adulto"], addonIds: ["cafe"] }) }));
vi.mock("@/lib/ops-audit-log", () => ({ registerOpsAuditLog: vi.fn() }));
import { getCalendarDay, getCalendarMonth, getCalendarRule, listOpenCalendarDestinations, saveCalendarDate } from "./operational-calendar";
const event = { id: "existing", title: "Domingo na Estância", description: "Resumo legado", href: "/agenda?mes=11&ano=2027&date=2027-11-01", active: true };
const row = { idagenda: 7, date: "2027-11-01", tpagenda: "padra", stagenda: "abe", nmpromocional: null, kind: null, validity: null, passport_ids: null, addon_ids: null, event_id: null, event_title: null };
describe("legacy published event compatibility", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.read.mockResolvedValue({ events: [event], products: [] });
    mocks.availability.mockResolvedValue({ passportIds: ["adulto"], addonIds: ["cafe"] });
    mocks.query.mockImplementation(async (sql: string) => ({ rows: sql.includes("FROM agenda a LEFT JOIN") ? [row] : [] }));
  });
  it("classifies the same URL-linked legacy event in the month, day and destinations without persisting a link", async () => {
    const month = await getCalendarMonth(11, 2027);
    const day = await getCalendarDay("2027-11-01");
    const destinations = await listOpenCalendarDestinations();
    for (const rule of [month.days[0].rule, day.rule, destinations[0]]) {
      expect(rule).toMatchObject({ configured: false, type: "event", eventId: "existing", eventTitle: event.title, validity: "6m", passportIds: ["adulto"], addonIds: ["cafe"] });
    }
    expect(day.event).toMatchObject({ id: "existing", description: "Resumo legado" });
    expect(mocks.query.mock.calls.every(([sql]) => !/\b(INSERT|UPDATE|DELETE)\b/.test(sql))).toBe(true);
  });
  it("does not take an explicit dayuse rule or a link owned by another event", async () => {
    mocks.query.mockResolvedValue({ rows: [{ ...row, kind: "dayuse", validity: "7d", passport_ids: ["adulto"] }] });
    expect(await getCalendarRule(row.date)).toMatchObject({ type: "dayuse", eventId: null, validity: "7d" });
    mocks.query.mockResolvedValue({ rows: [{ ...row, kind: "event", validity: "day", event_id: "other", event_title: "Outro" }] });
    expect(await getCalendarRule(row.date)).toMatchObject({ type: "event", eventId: "other", eventTitle: "Outro" });
  });
  it("does not guess ownership when two legacy events link to the same date", async () => {
    mocks.read.mockResolvedValue({ products: [], events: [event, { ...event, id: "duplicate" }] });
    expect(await getCalendarRule(row.date)).toMatchObject({ type: "dayuse", eventId: null });
  });
  it("does not treat an external URL date parameter as a local event", async () => {
    mocks.read.mockResolvedValue({ products: [], events: [{ ...event, href: "https://example.com/evento?date=2027-11-01" }] });
    expect(await getCalendarRule(row.date)).toMatchObject({ type: "dayuse", eventId: null });
  });
  it("keeps an archived event closed after its site content was removed", async () => {
    mocks.read.mockResolvedValue({ products: [], events: [] });
    mocks.query.mockResolvedValue({ rows: [{ ...row, kind: "event", stagenda: "fec", validity: "7d", event_id: "archived", event_title: "Arquivado" }] });
    expect(await getCalendarRule(row.date)).toMatchObject({ type: "event", status: "fec", eventId: "archived", validity: "7d" });
  });
  it("allows configuring the matching legacy event while preventing dayuse takeover", async () => {
    const content = { events: [event], products: [{ id: "adulto", title: "Adulto", type: "passport", active: true }, { id: "cafe", title: "Café", type: "addon", active: true }] };
    const query = vi.fn(async (sql: string) => ({ rows: sql.includes("content_json") ? [{ content_json: content }] : sql.includes("FROM agenda") ? [row] : [] }));
    const client = { query } as unknown as Parameters<typeof saveCalendarDate>[2];
    const input = { agendaId: 7, date: row.date, status: "abe" as const, validity: "7d" as const, passportIds: ["adulto"], addonIds: ["cafe"], type: "event" as const, eventId: event.id, eventTitle: event.title };
    await expect(saveCalendarDate(input, { cpf: "123", name: "Operador" }, client)).resolves.toMatchObject({ type: "event", eventId: event.id });
    await expect(saveCalendarDate({ ...input, type: "dayuse", eventId: null }, { cpf: "123", name: "Operador" }, client)).rejects.toThrow(/tipo/);
  });
});
