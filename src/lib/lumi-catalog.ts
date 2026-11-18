import { randomBytes } from "node:crypto";
import { getIngressoDbPool } from "@/lib/ingresso-db";
import { listB2cProducts, buildB2cCartSummary, type B2cCartLineItem } from "@/lib/b2c-catalog";
import { getAgendaProductAvailability } from "@/lib/painel-agenda-product-availability";
import { getPublicAgendaReservationById, isAgendaDateExpired } from "@/lib/agenda-repository";

export class LumiInputError extends Error {
  constructor(public field: string, public reason: "invalid" | "required" = "invalid") { super("dados_invalidos"); }
}

export async function availableDates(input: Record<string, unknown>) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const start = String(input.start_date || today);
  const finish = new Date(`${start}T12:00:00Z`);
  finish.setUTCDate(finish.getUTCDate() + 60);
  const end = String(input.end_date || (Number.isNaN(finish.getTime()) ? "" : finish.toISOString().slice(0, 10)));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
    throw new LumiInputError("start_date");
  }
  const days = (Date.parse(end) - Date.parse(start)) / 86400000;
  if (!Number.isFinite(days) || days < 0 || days > 366) throw new LumiInputError("end_date");
  const result = await getIngressoDbPool().query(
    "SELECT dtagenda AS date, stagenda AS status, tpagenda AS type FROM agenda WHERE dtagenda BETWEEN $1::date AND $2::date AND tpagenda IN ('padra','promo') ORDER BY dtagenda,idagenda LIMIT 101",
    [start, end],
  );
  const statuses: Record<string, string> = { abe: "aberta", fec: "fechada", lot: "lotada" };
  return { ok: true, source: "agenda da Estância", items: result.rows.slice(0, 100).map(row => ({
    ...row, status: statuses[row.status] || "desconhecida",
  })), truncated: result.rows.length > 100, prices_available: false };
}

export async function quoteSelection(input: Record<string, unknown>) {
  const date = String(input.visit_date ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isAgendaDateExpired(date)) throw new LumiInputError("visit_date");
  const rows = await getIngressoDbPool().query<{ idagenda: number }>(
    "SELECT idagenda FROM agenda WHERE dtagenda=$1::date AND tpagenda IN ('padra','promo') AND stagenda='abe' ORDER BY idagenda LIMIT 1", [date]);
  const agendaId = rows.rows[0]?.idagenda;
  if (!agendaId) throw new LumiInputError("visit_date");
  const detail = await getPublicAgendaReservationById(agendaId);
  if (!detail || detail.status !== "abe") throw new LumiInputError("visit_date");
  const raw = input.items;
  if (!Array.isArray(raw) || !raw.length || raw.length > 30) throw new LumiInputError("items");
  const availability = await getAgendaProductAvailability(date);
  const allowed = new Set([...availability.passportIds, ...availability.addonIds]);
  const seen = new Set<string>();
  const items: B2cCartLineItem[] = raw.map((value) => {
    const item = value as { product_id: string; quantity: number };
    if (!item || typeof item.product_id !== "string" || !allowed.has(item.product_id) || seen.has(item.product_id) || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 100) throw new LumiInputError("items");
    seen.add(item.product_id);
    return { productId: item.product_id, quantity: item.quantity };
  });
  if (items.reduce((sum, item) => sum + item.quantity, 0) > 100) throw new LumiInputError("items");
  const summary = await buildB2cCartSummary(items);
  return { agendaId, date, items, summary };
}

export async function catalog(visitDate?: string) {
  const products = await listB2cProducts();
  const availability = visitDate ? await getAgendaProductAvailability(visitDate) : null;
  const allowed = availability ? new Set([...availability.passportIds, ...availability.addonIds]) : null;
  return { ok: true, context_reference: "catalog", currency: "BRL", checkout_available: true, products: products.filter(p => !allowed || allowed.has(p.id)).map(p => ({
    product_id: p.id, type: p.type, title: p.title, description: p.description,
    online_price: p.sitePrice || p.fixedPrice || null,
  })) };
}

export async function saveQuote(tenant: string, conversation: string, input: Record<string, unknown>) {
  const choice = await quoteSelection(input);
  const token = randomBytes(32).toString("base64url");
  await getIngressoDbPool().query("INSERT INTO lumi_orders(token,tenant_id,conversation_id,selection,expires_at) VALUES($1,$2,$3,$4::jsonb,now()+interval '15 minutes')", [token, tenant, conversation, JSON.stringify(choice)]);
  return { ok: true, quote_id: token, visit_date: choice.date, total: choice.summary.totalValue, currency: "BRL", items: choice.summary.lines,
    instruction: "Cotação interna concluída. Prossiga com a compra já solicitada, coletando apenas nome completo e CPF que faltarem. Tente criar_compra_ingressos com phone=null quando não houver telefone no histórico; no WhatsApp o servidor fornece o número do canal. Peça telefone com DDD apenas se a ferramenta retornar dados_invalidos para phone. Não peça cartão ou senha no chat." };
}
