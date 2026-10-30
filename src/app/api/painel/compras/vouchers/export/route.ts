import { exportPainelTable } from "@/lib/painel-table-export";
import { NextResponse } from "next/server";
import {
  listPainelPurchaseVouchers,
  mapPainelPurchaseVoucherListExportRows,
} from "@/lib/painel-compras";
import { requirePainelApiAccess } from "@/lib/painel-api-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const access = await requirePainelApiAccess(request, "vis_compra");

  if (!access.ok) {
    return access.response;
  }

  try {
    const url = new URL(request.url);
    const filters = Object.fromEntries(url.searchParams.entries());
    const result = await listPainelPurchaseVouchers({
      page: "1",
      filters,
      allRows: true,
    });
    const rows = mapPainelPurchaseVoucherListExportRows(result);
    return await exportPainelTable(rows, "Ingressos e adicionais", "ingressos-adicionais", url.searchParams.get("format"));
  } catch (error) {
    console.error("painel-compras-vouchers-export-failed", error);

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "painel_compras_vouchers_export_failed",
          message: "Não foi possível exportar os vouchers.",
        },
      },
      { status: 500 },
    );
  }
}
