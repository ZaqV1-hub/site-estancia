import { schoolForm } from "@/lib/lumi-school-form";
import { authorizeLumi } from "@/lib/lumi-access";
import { catalog, saveQuote, availableDates, LumiInputError } from "@/lib/lumi-catalog";
import { preparePurchase, purchaseStatus } from "@/lib/lumi-commerce";
import { LUMI_CONTRACTS } from "@/lib/lumi-contracts";

export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  return action === "contracts"
    ? Response.json(LUMI_CONTRACTS, { headers: { "Cache-Control": "no-store" } })
    : Response.json({ error: "metodo_invalido" }, { status: 405 });
}

export async function POST(request: Request, { params }: { params: Promise<{ action: string }> }) {
  let body;
  try {
    const raw = await request.text();
    if (raw.length > 32768) return Response.json({ error: "parametros_invalidos" }, { status: 413 });
    body = JSON.parse(raw);
  } catch { return Response.json({ error: "parametros_invalidos" }, { status: 400 }); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return Response.json({ error: "parametros_invalidos" }, { status: 400 });
  if (!authorizeLumi(request.headers.get("authorization") ?? "", body.tenant_id, body.role)) return Response.json({ error: "acesso_negado" }, { status: 403 });
  if (typeof body.conversation_id !== "string" || !body.conversation_id || body.conversation_id.length > 80 || !body.arguments || typeof body.arguments !== "object") return Response.json({ error: "parametros_invalidos" }, { status: 422 });
  const { action } = await params;
  try {
    const input = body.arguments;
    const result = action === "school-form" ? schoolForm(input) : action === "agenda" ? await availableDates(input) :
      action === "catalog" ? await catalog(input.visit_date || undefined) :
      action === "quote" ? await saveQuote(body.tenant_id, body.conversation_id, input) :
      action === "purchase" ? await preparePurchase(body.tenant_id, body.conversation_id, input, body.context ?? {}) :
      action === "status" ? await purchaseStatus(body.tenant_id, body.conversation_id, String(input.quote_id ?? "")) : null;
    return result ? Response.json(result, { headers: { "Cache-Control": "no-store" } }) : Response.json({ error: "operacao_invalida" }, { status: 404 });
  } catch (error) {
    if (error instanceof LumiInputError) return Response.json({ ok: false, error: "dados_invalidos", invalid_fields: [{ field: error.field, reason: error.reason }] }, { status: 422 });
    console.error("lumi-operation-failed", { action, type: error instanceof Error ? error.name : "unknown", code: (error as { code?: string })?.code ?? "unknown" });
    return Response.json({ ok: false, error: "sistema_de_compras_indisponivel" }, { status: 503 });
  }
}
