import { beforeEach, describe, expect, it, vi } from "vitest";
const { poolQuery } = vi.hoisted(() => ({ poolQuery: vi.fn() }));

vi.mock("@/lib/ingresso-db", () => ({
  getIngressoDbPool: () => ({ query: poolQuery }),
}));

import {
  getActiveHomePageContent,
  normalizeVoucherType,
  resolveManagedProductType,
  resolveManagedVoucherType,
} from "@/lib/estancia-content-store";

describe("estancia content store", () => {
  beforeEach(() => {
    poolQuery.mockReset();
  });

  it("loads the home page sections with a single bounded database query", async () => {
    poolQuery.mockResolvedValue({ rows: [] });

    const content = await getActiveHomePageContent();

    expect(poolQuery).toHaveBeenCalledTimes(1);
    expect(poolQuery).toHaveBeenCalledWith(
      expect.objectContaining({ query_timeout: 2_500 }),
    );
    expect(content.heroImages.length).toBeGreaterThan(0);
  });

  it("falls back to the local content backup when the database is unavailable", async () => {
    poolQuery.mockRejectedValue(Object.assign(new Error("db unavailable"), { code: "ECONNRESET" }));
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const content = await getActiveHomePageContent();

    expect(content.heroImages.length).toBeGreaterThan(0);
    expect(log).toHaveBeenCalledWith("home-content-database-fallback", {
      code: "ECONNRESET",
    });
    log.mockRestore();
  });

  it("normalizes legacy special labels for managed products", () => {
    expect(resolveManagedVoucherType("especial", "addon", "norma")).toBe("espec");
    expect(resolveManagedVoucherType("adicional", "passport", "norma")).toBe("espec");
    expect(resolveManagedVoucherType("infantil", "passport", "norma")).toBe("infan");
    expect(resolveManagedVoucherType("", "addon", "norma")).toBe("espec");
    expect(resolveManagedVoucherType("", "passport", "norma")).toBe("norma");
  });

  it("forces estacionamento to stay as addon even with legacy persisted type", () => {
    expect(
      resolveManagedProductType(
        {
          id: "estacionamento",
          title: "ESTACIONAMENTO",
          type: "passport",
        },
        "passport",
      ),
    ).toBe("addon");
  });

  it("normalizes form voucher types from legacy values", () => {
    expect(normalizeVoucherType("especial" as unknown as FormDataEntryValue)).toBe(
      "espec",
    );
    expect(normalizeVoucherType("infantil" as unknown as FormDataEntryValue)).toBe(
      "infan",
    );
    expect(normalizeVoucherType(null)).toBe("norma");
  });
});
