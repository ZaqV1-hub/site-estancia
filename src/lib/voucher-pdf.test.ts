import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
vi.mock("@react-pdf/renderer", () => ({
  Document: "main", Page: "article", Text: "span", View: "div", Image: "img",
  StyleSheet: { create: <T,>(value: T) => value },
  renderToBuffer: async (node: ReactNode) => Buffer.from(renderToStaticMarkup(node)),
}));
import { renderVoucherPdfBuffer } from "@/lib/voucher-pdf";
describe("customer voucher PDF dates", () => {
  it("prints the current visit, first visit and individual expiration", async () => {
    const output = await renderVoucherPdfBuffer({ purchase: { id: 77, type: "ponli", purchaseDate: "2026-10-01", statusLabel: "Pago" }, customer: { name: "Ana", cpfMasked: "***" }, isSchool: false, information: null, vouchers: [{ id: 9, number: "A9", typeLabel: "Adulto", visitDate: "2026-11-01", originalDate: "2026-10-01", validUntil: "2026-11-07", unitValue: "100.00", schoolName: null, participantName: null, schoolClassDisplay: null, qrCodeDataUrl: null }] });
    const markup = output.toString();
    expect(markup).toContain("Data da visita: 01/11/2026.");
    expect(markup).toContain("Reagendado de 01/10/2026.");
    expect(markup).toContain("Válido até 07/11/2026.");
  });
});
