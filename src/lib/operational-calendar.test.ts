import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/ingresso-db", () => ({ getIngressoDbPool: vi.fn() }));
vi.mock("@/lib/estancia-content-store", () => ({ readEstanciaContent: vi.fn() }));
import { buildCalendarPurchases, summarizeCalendarPurchases, type CalendarVoucherRow } from "@/lib/operational-calendar";
import type { B2cProduct } from "@/lib/b2c-catalog-defaults";

const products = [
  { id: "pcd", title: "Passaporte PCD", type: "passport" },
  { id: "cafe", title: "Café da manhã", type: "addon" },
] as B2cProduct[];
function voucher(overrides: Partial<CalendarVoucherRow> = {}): CalendarVoucherRow {
  return { idvoucher: 1, idcompra: 10, cpf: "123", nmusuario: "Comprador", email: null,
    tpcompra: "ponli", stcompra: "conc", date: "2026-10-31", numvoucher: "A1",
    tpvoucher: "norma", descricao: "Passaporte PCD", vlunicompra: "29.00",
    vldesc: "0", vltotcompra: "29.00", stusado: "n", dtvalidade: "2026-10-31",
    original_date: null, reason: null, ...overrides };
}
describe("relatório operacional por data", () => {
  it("conta PCD como pessoa e café como adicional, com valor real da compra", () => {
    const rows = [voucher({vltotcompra: "57.60"}), voucher({idvoucher: 2, tpvoucher: "espec", descricao: "Café da manhã", vlunicompra: "35.00", vltotcompra: "57.60"})];
    const purchases = buildCalendarPurchases(rows, products, "2026-10-31");
    const summary = summarizeCalendarPurchases(purchases);
    expect(summary).toMatchObject({people: 1, addons: 1, purchases: 1, revenueCents: 5760, siteCents: 5760, boxOfficeCents: 0});
    expect(summary.passports).toEqual([{title: "Passaporte PCD", quantity: 1}]);
    expect(summary.addonItems).toEqual([{title: "Café da manhã", quantity: 1}]);
  });
  it("distribui desconto sem duplicar a compra que contém duas datas", () => {
    const rows = [voucher({vltotcompra: "50.01"}), voucher({idvoucher: 2, date: "2026-11-01", vltotcompra: "50.01"})];
    const first = summarizeCalendarPurchases(buildCalendarPurchases(rows, products, "2026-10-31"));
    const second = summarizeCalendarPurchases(buildCalendarPurchases(rows, products, "2026-11-01"));
    expect(first.people).toBe(1);
    expect(first.revenueCents + second.revenueCents).toBe(5001);
  });
  it("separa bilheteria, marca reagendados e não conta compra cancelada ou pendente", () => {
    const rows = [voucher({tpcompra: "reser", original_date: "2026-10-17"}), voucher({idcompra: 11, idvoucher: 2, stcompra: "canc"}), voucher({idcompra: 12, idvoucher: 3, stcompra: "pend"})];
    const summary = summarizeCalendarPurchases(buildCalendarPurchases(rows, products, "2026-10-31"));
    expect(summary).toMatchObject({people: 1, purchases: 1, revenueCents: 2900, boxOfficeCents: 2900, siteCents: 0, rescheduled: 1});
  });
  it("mantém passaportes especiais como pessoas mesmo com código espec", () => {
    const rows = [voucher({tpvoucher: "espec", descricao: "Passaporte Especial Dia das Crianças"})];
    expect(summarizeCalendarPurchases(buildCalendarPurchases(rows, products, "2026-10-31")).people).toBe(1);
  });
  it("vouchers invalidados não aumentam pessoas ou adicionais", () => {
    const rows = [voucher({stusado: "inv"})];
    expect(summarizeCalendarPurchases(buildCalendarPurchases(rows, products, "2026-10-31")).people).toBe(0);
  });
  it("não atribui centavos de arredondamento ao ingresso gratuito", () => {
    const rows = [1,2,3].map((idvoucher)=>voucher({idvoucher,vlunicompra:"1.00",vltotcompra:"2.00"}));
    rows.push(voucher({idvoucher:4,vlunicompra:"0.00",vltotcompra:"2.00",descricao:"Isento 0 a 4 anos"}));
    const purchases=buildCalendarPurchases(rows,products,"2026-10-31");
    expect(purchases[0].valueCents).toBe(200);
    expect(purchases[0].vouchers.find((item)=>item.id===4)?.valueCents).toBe(0);
  });
});
