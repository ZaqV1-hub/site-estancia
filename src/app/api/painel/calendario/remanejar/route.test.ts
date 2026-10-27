import { beforeEach, describe, expect, it, vi } from "vitest";
const { requirePainelApiAccess, moveCalendarVouchers, listOpenCalendarDestinations } = vi.hoisted(() => ({ requirePainelApiAccess: vi.fn(), moveCalendarVouchers: vi.fn(), listOpenCalendarDestinations: vi.fn() }));
vi.mock("@/lib/painel-api-auth", () => ({ requirePainelApiAccess }));
vi.mock("@/lib/operational-calendar", () => ({ listOpenCalendarDestinations }));
vi.mock("@/lib/calendar-reschedule", async (original) => ({ ...await original<object>(), moveCalendarVouchers }));
import { GET, POST } from "./route";
describe("calendar reschedule route", () => {
 beforeEach(() => { vi.clearAllMocks(); requirePainelApiAccess.mockResolvedValue({ ok: true, session: { actorName: "Servidor", actorCpf: "123", permissions: ["ops.vouchers"] } }); });
 it("denies anonymous changes before reading the body", async () => { requirePainelApiAccess.mockResolvedValue({ ok: false, response: new Response(null, { status: 401 }) }); expect((await POST(new Request("http://localhost", { method: "POST", body: "invalid" }))).status).toBe(401); expect(moveCalendarVouchers).not.toHaveBeenCalled(); });
 it("denies read-only operators", async () => { requirePainelApiAccess.mockResolvedValue({ ok: true, session: { permissions: ["ops.read"] } }); expect((await POST(new Request("http://localhost", { method: "POST", body: "{}" }))).status).toBe(403); expect(moveCalendarVouchers).not.toHaveBeenCalled(); });
 it("uses only server session actor", async () => { moveCalendarVouchers.mockResolvedValue({ moved: 1 }); const payload = { purchaseIds: [4], actor: { name: "Forged" } }; const response = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify(payload) })); expect(response.status).toBe(200); expect(moveCalendarVouchers).toHaveBeenCalledWith(payload, { name: "Servidor", cpf: "123" }); });
 it("requires panel auth for destination list", async () => { listOpenCalendarDestinations.mockResolvedValue([]); expect((await GET(new Request("http://localhost"))).status).toBe(200); expect(requirePainelApiAccess).toHaveBeenCalledWith(expect.any(Request), "vis_agenda"); });
});
