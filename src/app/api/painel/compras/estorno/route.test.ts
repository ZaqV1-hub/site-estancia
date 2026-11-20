import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const { auth, submit, consult } = vi.hoisted(() => ({ auth: vi.fn(), submit: vi.fn(), consult: vi.fn() }));
vi.mock("@/lib/painel-api-auth", () => ({ requirePainelApiAccess: auth }));
vi.mock("@/lib/purchase-refund", () => ({
  requestPurchaseRefund: submit, reconcilePurchaseRefund: consult, PurchaseRefundError: class extends Error {},
}));

function request(input: unknown) {
  return new Request("https://estancia.example/api/painel/compras/estorno", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input),
  });
}

describe("painel estorno", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    auth.mockResolvedValue({ ok: true, session: { legacyRoleId: 1, actorName: "Ana", actorCpf: "123" } });
    submit.mockResolvedValue({ state: "uncertain", message: "Consultar." });
  });
  it("rejects operators, regardless of the submitted identity", async () => {
    auth.mockResolvedValue({ ok: true, session: { legacyRoleId: 2, actorName: "Operador" } });
    expect((await POST(request({ purchaseId: 1, reason: "pedido", legacyRoleId: 1 }))).status).toBe(403);
    expect(submit).not.toHaveBeenCalled();
  });
  it("derives identity from the panel session and amount from the service", async () => {
    const response = await POST(request({ purchaseId: 1, reason: " pedido ", amount: 1, actorName: "Outro" }));
    expect(response.status).toBe(202);
    expect(submit).toHaveBeenCalledWith({ purchaseId: 1, reason: "pedido", actorName: "Ana", actorCpf: "123" });
  });
  it("never issues a refund from a status inquiry", async () => {
    consult.mockResolvedValue({ state: "refunded", message: "Confirmado", reconciliationPending: true });
    const response = await POST(request({ purchaseId: 2, consult: true }));
    expect(await response.json()).toMatchObject({ status: "confirmed", reconciliationPending: true });
    expect(submit).not.toHaveBeenCalled();
  });
  it("requires a reason for a new financial request", async () => {
    expect((await POST(request({ purchaseId: 1, reason: "   " }))).status).toBe(400);
    expect(submit).not.toHaveBeenCalled();
  });
});
