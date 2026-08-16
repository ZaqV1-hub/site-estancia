import { describe, expect, it } from "vitest";
import {
  normalizeVoucherType,
  resolveManagedProductType,
  resolveManagedVoucherType,
} from "@/lib/estancia-content-store";

describe("estancia content store", () => {
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
