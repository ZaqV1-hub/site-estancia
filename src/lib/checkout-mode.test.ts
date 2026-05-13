import { beforeEach, describe, expect, it, vi } from "vitest";

const isCieloEcommerceConfigured = vi.fn();
const isCielo3dsConfigured = vi.fn();

vi.mock("@/lib/cielo-ecommerce", () => ({
  isCieloEcommerceConfigured,
}));

vi.mock("@/lib/cielo-3ds", () => ({
  isCielo3dsConfigured,
}));

describe("checkout-mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("enables the widget only when Cielo ecommerce and 3DS are configured", async () => {
    isCieloEcommerceConfigured.mockReturnValue(true);
    isCielo3dsConfigured.mockReturnValue(true);

    const { resolveCheckoutMode } = await import("@/lib/checkout-mode");

    expect(resolveCheckoutMode()).toBe("widget");
  });

  it("blocks checkout when the native payment stack is incomplete", async () => {
    isCieloEcommerceConfigured.mockReturnValue(true);
    isCielo3dsConfigured.mockReturnValue(false);

    const { resolveCheckoutMode } = await import("@/lib/checkout-mode");

    expect(resolveCheckoutMode()).toBe("unavailable");
  });
});
