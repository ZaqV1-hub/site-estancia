import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CalendarRescheduleDialog } from "./calendar-reschedule-dialog";

describe("CalendarRescheduleDialog", () => {
  it("resume compras, vouchers, pessoas e valor sem contar adicionais como pessoas", () => {
    const html = renderToStaticMarkup(<CalendarRescheduleDialog purchaseIds={[10, 11]} voucherIds={[1, 2, 3]} peopleCount={2} totalValue="149,90" onClose={vi.fn()} onSuccess={vi.fn()} />);
    expect(html).toContain("2 compra(s)");
    expect(html).toContain("3 voucher(s)");
    expect(html).toContain("2 pessoa(s)");
    expect(html).toContain("R$ 149,90");
    expect(html).toMatch(/type="checkbox"[^>]*checked=""[^>]*\/>Avisar o cliente por e-mail/);
  });
  it("não inventa totais quando só recebe IDs e mantém aplicar desativado enquanto busca datas", () => {
    const html = renderToStaticMarkup(<CalendarRescheduleDialog purchaseIds={[10]} voucherIds={[1]} onClose={vi.fn()} onSuccess={vi.fn()} />);
    expect(html).not.toContain("pessoa(s)");
    expect(html).not.toContain("R$");
    expect(html).toMatch(/<button type="submit" disabled=""/);
  });
});
