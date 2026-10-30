import ExcelJS from "exceljs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const requirePainelApiAccess = vi.fn();
const listPainelPurchases = vi.fn();
const mapPainelPurchaseListExportRows = vi.fn();

vi.mock("@/lib/painel-api-auth", () => ({
  requirePainelApiAccess,
}));

vi.mock("@/lib/painel-compras", () => ({
  listPainelPurchases,
  mapPainelPurchaseListExportRows,
}));

describe("GET /api/painel/compras/export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("gera exportação XLSX da lista principal", async () => {
    requirePainelApiAccess.mockResolvedValue({
      ok: true,
      session: {
        actorName: "Operador",
        actorCpf: "12345678900",
      },
    });
    listPainelPurchases.mockResolvedValue({
      total: 1,
      page: 1,
      perPage: 1,
      totalPages: 1,
      filters: {
        purchaseId: null,
        type: null,
        purchaseStatus: null,
        ticketPaymentMethod: null,
        gatewayPaymentMethod: null,
        gatewayStatus: null,
        cpf: null,
        userName: null,
        dateFrom: null,
        dateTo: null,
      },
      items: [],
    });
    mapPainelPurchaseListExportRows.mockReturnValue([
      ["ID", "Data compra"],
      ["551", "06/05/2026"],
    ]);

    const { GET } = await import("@/app/api/painel/compras/export/route");
    const response = await GET(
      new Request("https://example.com/api/painel/compras/export"),
    );
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await response.arrayBuffer());
    const sheet = workbook.worksheets[0];

    expect(listPainelPurchases).toHaveBeenCalledWith({
      page: "1",
      filters: {},
      allRows: true,
    });
    expect(mapPainelPurchaseListExportRows).toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    expect(response.headers.get("content-disposition")).toContain(
      'attachment; filename="compras.xlsx"',
    );
    expect(sheet.getRow(1).values).toEqual([, "ID", "Data compra"]);
    expect(sheet.getRow(2).values).toEqual([, "551", "06/05/2026"]);
  });
});
