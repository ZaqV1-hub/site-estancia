import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), save: vi.fn(), revalidate: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("@/lib/painel-api-auth", () => ({ requirePainelApiAccess: mocks.auth }));
vi.mock("@/lib/calendar-events", () => ({ CalendarEventError: class extends Error {
    }, calendarEventDate: () => null, saveCalendarEvent: mocks.save }));
vi.mock("@/lib/estancia-content-store", () => ({ readEstanciaContent: vi.fn() }));
vi.mock("@/lib/operational-calendar", () => ({ CalendarError: class extends Error {
    }, getCalendarRule: vi.fn() }));
import { POST } from "./route";
function request(values: Record<string, string>) { const form = new FormData(); Object.entries(values).forEach(([key, value]) => form.set(key, value)); return new Request("https://example.com/api/painel/calendar-events", { method: "POST", body: form }); }
describe("event API authorization", () => {
    beforeEach(() => vi.resetAllMocks());
    it("requires an authenticated panel session", async () => { mocks.auth.mockResolvedValue({ ok: false, response: Response.json({ ok: false }, { status: 401 }) }); const response = await POST(request({ eventMode: "link" })); expect(response.status).toBe(401); expect(mocks.save).not.toHaveBeenCalled(); });
    it("requires agenda access before configuring an internal date", async () => { mocks.auth.mockResolvedValueOnce({ ok: true, session: { actorName: "Lucas", actorCpf: "123" } }).mockResolvedValueOnce({ ok: false, response: Response.json({ ok: false }, { status: 403 }) }); const response = await POST(request({ eventMode: "date", editScope: "all" })); expect(response.status).toBe(403); expect(mocks.save).not.toHaveBeenCalled(); });
    it("takes the actor from the session and keeps database errors private", async () => { mocks.auth.mockResolvedValue({ ok: true, session: { actorName: "Lucas", actorCpf: "123" } }); mocks.save.mockResolvedValue({ date: null, event: { id: "event" } }); const response = await POST(request({ eventMode: "link", actorName: "Forged", actorCpf: "456" })); expect(response.status).toBe(200); expect(mocks.save.mock.calls[0][1]).toEqual({ name: "Lucas", cpf: "123" }); mocks.save.mockRejectedValue(new Error("secret db connection")); const log = vi.spyOn(console, "error").mockImplementation(() => { }); const failure = await POST(request({ eventMode: "link" })); expect(failure.status).toBe(500); expect(await failure.text()).not.toContain("secret db connection"); log.mockRestore(); });
});
