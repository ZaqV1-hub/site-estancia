import { exportPainelTable } from "@/lib/painel-table-export";
import { NextResponse } from "next/server";
import {
  listPainelPurchases,
  mapPainelPurchaseListExportRows,
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
    const filters = Object.fromEntries(
      [...url.searchParams.entries()].filter(([key]) => key !== "page" && key !== "perPage"),
    );
    const result = await listPainelPurchases({
      page: "1",
      filters,
      allRows: true,
    });
    const rows = mapPainelPurchaseListExportRows(result);
    return await exportPainelTable(rows, "Compras e reservas", "compras", url.searchParams.get("format"));
  } catch (error) {
    console.error("painel-compras-export-failed", error);

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "painel_compras_export_failed",
          message: "Não foi possível exportar a lista de compras.",
        },
      },
      { status: 500 },
    );
  }
}
