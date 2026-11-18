import { randomBytes } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { getIngressoDbPool } from "@/lib/ingresso-db";
import { sanitizeCpf, isValidCpf } from "@/lib/cpf";
import { createOnlinePurchase } from "@/lib/purchase-repository";
import { LumiInputError, quoteSelection } from "@/lib/lumi-catalog";
import { hashPasswordForLegacyUser } from "@/lib/password-hashing";

export async function preparePurchase(tenant: string, conversation: string, input: Record<string, unknown>, context: Record<string, unknown>) {
  const cpf = sanitizeCpf(String(input.cpf ?? ""));
  const name = String(input.name ?? "").trim();
  const phone = String(context.whatsapp || input.phone || "").replace(/\D/g, "");
  const email = input.email ? String(input.email).trim() : null;
  if (!isValidCpf(cpf)) throw new LumiInputError("cpf");
  if (name.length < 2 || name.length > 120) throw new LumiInputError("name");
  if (!/^\d{10,14}$/.test(phone)) throw new LumiInputError("phone", "required");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new LumiInputError("email");
  const evidence = Array.isArray(context.customer_messages) ? context.customer_messages : [];
  if (!evidence.some(value => typeof value === "string" && new RegExp(`(^|\\D)${cpf}(?!\\d)`).test(value.replace(/[.\-\s]/g, "")))) throw new LumiInputError("cpf", "required");
  const token = String(input.quote_id ?? "");
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new LumiInputError("quote_id");
  const pool = getIngressoDbPool();
  const lock = await pool.connect();
  try {
    await lock.query("SELECT pg_advisory_lock(hashtextextended($1,0))", [token]);
    const result = await lock.query("SELECT * FROM lumi_orders WHERE token=$1 AND tenant_id=$2 AND conversation_id=$3", [token, tenant, conversation]);
    const order = result.rows[0];
    if (!order || new Date(order.expires_at).getTime() <= Date.now()) return { ok: false, error: "cotacao_expirada" };
    if (order.cpf && order.cpf !== cpf) throw new LumiInputError("cpf");
    if (!order.purchase_id) {
      if (order.state !== "quoted") return { ok: false, error: "pedido_em_verificacao" };
      const choice = order.selection;
      const fresh = await quoteSelection({ visit_date: choice.date, items: choice.items.map((i: { productId: string; quantity: number }) => ({ product_id: i.productId, quantity: i.quantity })) });
      if (!isDeepStrictEqual(fresh.summary, choice.summary)) return { ok: false, error: "cotacao_mudou_consulte_novamente" };
      await lock.query("UPDATE lumi_orders SET state='creating',cpf=$2,buyer=$3::jsonb WHERE token=$1", [token, cpf, JSON.stringify({ name, cpf, phone, email })]);
      await lock.query("INSERT INTO usuario(cpf,nmusuario,celular,email,senha,stusuario,dtcadastro,lumi_guest) VALUES($1,$2,$3,$4,$5,'ati',CURRENT_DATE,true) ON CONFLICT(cpf) DO NOTHING", [cpf, name, phone, email, hashPasswordForLegacyUser(randomBytes(32).toString("hex"))]);
      const purchase = await createOnlinePurchase(cpf, fresh.agendaId, { lineItems: fresh.items }, undefined, token);
      order.purchase_id = purchase.purchaseId;
    }
    return { ok: true, order_id: String(order.purchase_id), status: "waiting_payment", payment_url: `${process.env.LUMI_CHECKOUT_BASE_URL}/lumi/checkout/${token}`,
      instruction: "Pedido pendente no sistema da Estância. Envie o link recebido. Pagamento só na página segura do site. Confirme o pagamento somente após consultar o pedido." };
  } finally {
    await lock.query("SELECT pg_advisory_unlock(hashtextextended($1,0))", [token]);
    lock.release();
  }
}

export async function purchaseStatus(tenant: string, conversation: string, token: string) {
  const result = await getIngressoDbPool().query("SELECT o.purchase_id,o.state,o.expires_at,c.stcompra FROM lumi_orders o LEFT JOIN compra c ON c.idcompra=o.purchase_id WHERE o.token=$1 AND o.tenant_id=$2 AND o.conversation_id=$3", [token, tenant, conversation]);
  const row = result.rows[0];
  if (!row) return { ok: false, error: "pedido_nao_encontrado" };
  const expired = new Date(row.expires_at).getTime() <= Date.now();
  return { ok: true, order_id: row.purchase_id, status: row.stcompra === "conc" ? "paid" : row.stcompra === "canc" ? "cancelled" : expired ? "expired" : row.state,
    payment_url: row.purchase_id && !expired ? `${process.env.LUMI_CHECKOUT_BASE_URL}/lumi/checkout/${token}` : null };
}
