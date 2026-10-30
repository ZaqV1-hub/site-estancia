import ExcelJS from "exceljs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const requirePainelApiAccess = vi.fn();
const listPainelPurchaseVouchers = vi.fn();
const mapPainelPurchaseVoucherListExportRows = vi.fn();

vi.mock("@/lib/painel-api-auth", () => ({
  requirePainelApiAccess,
}));

vi.mock("@/lib/painel-compras", () => ({
  listPainelPurchaseVouchers,
  mapPainelPurchaseVoucherListExportRows,
}));

describe("GET /api/painel/compras/vouchers/export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("gera exportação XLSX da lista de vouchers", async () => {
    requirePainelApiAccess.mockResolvedValue({
      ok: true,
      session: {
        actorName: "Operador",
        actorCpf: "12345678900",
      },
    });
    listPainelPurchaseVouchers.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      perPage: 1,
      totalPages: 1,
      filters: {},
      indicators: {},
    });
    mapPainelPurchaseVoucherListExportRows.mockReturnValue([
      ["ID", "Voucher"],
      ["9001", "ABC-123"],
    ]);

    const { GET } = await import(
      "@/app/api/painel/compras/vouchers/export/route"
    );
    const response = await GET(
      new Request("https://example.com/api/painel/compras/vouchers/export"),
    );
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await response.arrayBuffer());
    const sheet = workbook.worksheets[0];

    expect(listPainelPurchaseVouchers).toHaveBeenCalledWith({
      page: "1",
      filters: {},
      allRows: true,
    });
    expect(mapPainelPurchaseVoucherListExportRows).toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toContain(
      'attachment; filename="ingressos-adicionais.xlsx"',
    );
    expect(sheet.getRow(1).values).toEqual([, "ID", "Voucher"]);
    expect(sheet.getRow(2).values).toEqual([, "9001", "ABC-123"]);
  });
});
