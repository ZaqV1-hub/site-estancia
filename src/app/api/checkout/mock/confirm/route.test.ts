import { beforeEach, describe, expect, it, vi } from "vitest";

const clearAuthCookie = vi.fn();
const getAuthSession = vi.fn();

vi.mock("@/lib/auth-session", () => ({
  clearAuthCookie,
  getAuthSession,
}));

describe("checkout mock confirm route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAuthSession.mockResolvedValue({ sub: "52998224725" });
  });

  it("always rejects sandbox checkout because checkout no longer falls back locally", async () => {
    const { POST } = await import("@/app/api/checkout/mock/confirm/route");
    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(410);
    expect(body).toMatchObject({
      ok: false,
      error: {
        code: "checkout_unavailable",
      },
    });
  });

  it("keeps auth protection before returning the disabled sandbox response", async () => {
    getAuthSession.mockResolvedValue(null);
    const { POST } = await import("@/app/api/checkout/mock/confirm/route");
    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toMatchObject({
      ok: false,
      error: {
        code: "unauthenticated",
      },
    });
  });
});
