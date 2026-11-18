import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const query = vi.hoisted(() => vi.fn());
const session = vi.hoisted(() => vi.fn());
vi.mock("@/lib/ingresso-db", () => ({ getIngressoDbPool: () => ({ query }) }));
vi.mock("@/lib/auth-session", () => ({ getAuthSession: session }));
import { authorizeLumi, checkoutOrder, checkoutSession } from "./lumi-access";

beforeEach(() => {
  vi.stubEnv("LUMI_COMMERCE_ENABLED", "true");
  vi.stubEnv("INGRESSO_DB_NAME", "example_live");
  vi.stubEnv("LUMI_COMMERCE_DATABASE_NAME", "example_live");
  vi.stubEnv("INGRESSO_DATABASE_URL", "");
  vi.stubEnv("LUMI_COMMERCE_SECRET", "s".repeat(40));
  vi.stubEnv("LUMI_TENANT_ID", "tenant-example");
});
afterEach(() => { vi.unstubAllEnvs(); vi.resetAllMocks(); });

describe("Lumi authorization and guest checkout", () => {
  it("allows only the configured tenant, database and roles", async () => {
    const bearer = "Bearer " + "s".repeat(40);
    expect(authorizeLumi(bearer, "tenant-example", "cliente")).toBe(true);
    expect(authorizeLumi(bearer, "other", "cliente")).toBe(false);
    expect(authorizeLumi(bearer, "tenant-example", "administrador")).toBe(false);
    expect(authorizeLumi("Bearer invalid", "tenant-example", "cliente")).toBe(false);
    vi.stubEnv("INGRESSO_DB_NAME", "another_database");
    expect(authorizeLumi(bearer, "tenant-example", "cliente")).toBe(false);
    expect(await checkoutOrder("x".repeat(43))).toBeNull();
    expect(query).not.toHaveBeenCalled();
  });

  it("keeps payment access restricted to the linked order", async () => {
    query.mockResolvedValue({ rows: [{ purchase_id: 42, cpf: "buyer", buyer: {} }] });
    const request = (id: number) => new Request("https://example.com/api/checkout/checkout-link?lumi_token=" + "x".repeat(43), {
      method: "POST", body: JSON.stringify({ idcompra: id }),
    });
    expect(await checkoutSession(request(99))).toBeNull();
    expect(await checkoutSession(request(42))).toEqual({ sub: "buyer" });
    expect(session).not.toHaveBeenCalled();
  });

  it("refuses missing or expired tokens without falling back to a user session", async () => {
    query.mockResolvedValue({ rows: [] });
    expect(await checkoutSession(new Request("https://example.com/api/checkout/status?lumi_token=" + "x".repeat(43) + "&reference=42"))).toBeNull();
    expect(session).not.toHaveBeenCalled();
  });

  it("continues to accept the existing authenticated checkout", async () => {
    session.mockResolvedValue({ sub: "existing" });
    expect(await checkoutSession(new Request("https://example.com/api/checkout/status"))).toEqual({ sub: "existing" });
    expect(query).not.toHaveBeenCalled();
  });
});
