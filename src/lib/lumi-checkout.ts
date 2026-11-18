import { getIngressoDbPool } from "@/lib/ingresso-db";
import { lumiEnabled } from "@/lib/lumi-access";
import { getNativeCieloCheckoutStatus, createNativeCieloCheckout } from "@/lib/cielo-ecommerce";
import { normalizePaymentReconciliationPayload, reconcilePaymentFromGatewayPayload } from "@/lib/payment-reconciliation";
import { isCielo3dsConfigured, getCielo3dsTokenData } from "@/lib/cielo-3ds";
import { checkoutBase, checkoutSignature, validatePaymentOrigin, authenticationProof, validateAuthentication } from "@/lib/lumi-checkout-security";
import type { B2cCartSummaryLine } from "@/lib/b2c-catalog";

type Order = {
  token: string; purchase_id: number; cpf: string; state: string; stcompra: string; expires_at: Date;
  buyer: { name: string; phone: string; email: string | null };
  selection: { date: string; summary: { totalValue: string; lines: B2cCartSummaryLine[] } };
  payment_attempt: { state?: string; method?: string; payment_id?: string; qr_code?: string; qr_image?: string; expires_at?: number } | null;
};

export const checkoutHeaders = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" };

export async function loadCheckout(token: string): Promise<Order | null> {
  if (!lumiEnabled() || !/^[a-zA-Z0-9_-]{43}$/.test(token)) return null;
  const rows = await getIngressoDbPool().query<Order>(`SELECT o.*,c.stcompra FROM lumi_orders o JOIN compra c ON c.idcompra=o.purchase_id
    WHERE o.token=$1 AND o.tenant_id=$2`, [token, process.env.LUMI_TENANT_ID]);
  return rows.rows[0] ?? null;
}

export function publicCheckout(order: Order) {
  const expired = new Date(order.expires_at).getTime() < Date.now();
  return { method: order.payment_attempt?.method, payment_id: order.payment_attempt?.payment_id,
    qr_code: order.payment_attempt?.qr_code, qr_image: order.payment_attempt?.qr_image,
    order_id: String(order.purchase_id), buyer_name: order.buyer.name,
    cpf_masked: "***.***.***-" + order.cpf.slice(-2),
    state: order.stcompra === "conc" ? "paid" : expired ? "expired" : order.stcompra === "canc" ? "expired" : order.payment_attempt?.state ?? "ready",
    security_token: checkoutSignature("csrf:" + order.token),
    quote: { visitDate: order.selection.date, totalAmount: Number(order.selection.summary.totalValue),
      items: order.selection.summary.lines.map(line => ({ title: line.title, quantity: line.quantity, unit_price: Number(line.unitPrice) })) },
    expires_at: order.payment_attempt?.expires_at ?? new Date(order.expires_at).getTime() / 1000,
    debit_available: isCielo3dsConfigured(), max_installments: 1,
    environment_note: "Compra de ingressos da Estância. O pagamento gera cobrança real pela Cielo." };
}

async function saveGateway(order: Order, result: Awaited<ReturnType<typeof createNativeCieloCheckout>>) {
  const record = normalizePaymentReconciliationPayload(result, order.purchase_id);
  if (record.purchaseId !== order.purchase_id || Number(record.grossAmount) !== Number(order.selection.summary.totalValue)) throw new Error("payment_mismatch");
  await reconcilePaymentFromGatewayPayload(result, order.purchase_id);
  const sale = result.sale as { Payment?: { QRCodeString?: string; QRCodeBase64Image?: string; ExpirationDate?: string } } | null;
  const payment = sale?.Payment;
  const state = record.purchaseStatus === "conc" ? "paid" : record.purchaseStatus === "canc" ? "denied" : "pending";
  // Store only the public receipt. Never persist the gateway sale (which can contain card data).
  const receipt = { state, method: record.paymentMethodType === 11 ? "Pix" : record.paymentMethodType === 2 ? "DebitCard" : "CreditCard",
    payment_id: record.gatewayPaymentId, qr_code: payment?.QRCodeString || null, qr_image: payment?.QRCodeBase64Image || null,
    expires_at: payment?.ExpirationDate ? Date.parse(payment.ExpirationDate) / 1000 : new Date(order.expires_at).getTime() / 1000 };
  await getIngressoDbPool().query("UPDATE lumi_orders SET payment_attempt=$2::jsonb WHERE token=$1", [order.token, JSON.stringify(receipt)]);
}

export async function checkoutState(token: string) {
  let order = await loadCheckout(token);
  if (!order) return null;
  if (order.payment_attempt && !["paid", "denied"].includes(order.payment_attempt.state ?? "")) {
    try {
      const result = await getNativeCieloCheckoutStatus({ purchaseId: order.purchase_id, reference: String(order.purchase_id), paymentId: order.payment_attempt.payment_id });
      if (result.status === "00") {
        await saveGateway(order, result as Awaited<ReturnType<typeof createNativeCieloCheckout>>);
        order = (await loadCheckout(token))!;
      }
    } catch { console.error("lumi-checkout-status-unavailable", { purchaseId: order.purchase_id }); }
  }
  return publicCheckout(order);
}

export async function checkoutPayment(request: Request, token: string, action: string) {
  const raw = await request.text();
  if (raw.length > 8192 || request.headers.get("content-type")?.split(";")[0] !== "application/json") return Response.json({ error: "Dados inválidos." }, { status: 400, headers: checkoutHeaders });
  const input = JSON.parse(raw) as Record<string, unknown>;
  validatePaymentOrigin(request, token, input);
  const client = await getIngressoDbPool().connect();
  let locked = false;
  try {
    const lock = await client.query("SELECT pg_try_advisory_lock(hashtextextended($1,1)) AS locked", [token]);
    locked = lock.rows[0].locked;
    if (!locked) return Response.json({ error: "Pagamento em processamento. Aguarde." }, { status: 409, headers: checkoutHeaders });
    const order = await loadCheckout(token);
    if (!order || new Date(order.expires_at).getTime() <= Date.now()) return Response.json({ error: "Este link expirou." }, { status: 404, headers: checkoutHeaders });
    // Persisted intent survives restarts/timeouts. Repeated POST cannot create another charge.
    if (order.payment_attempt || order.stcompra !== "pend") return Response.json(publicCheckout(order), { headers: checkoutHeaders });
    const prior = await client.query("SELECT 1 FROM pagpagseguro WHERE idcompra=$1 LIMIT 1", [order.purchase_id]);
    if (prior.rows.length) {
      await client.query("UPDATE lumi_orders SET payment_attempt=$2::jsonb WHERE token=$1", [token, JSON.stringify({ state: "unknown" })]);
      return Response.json(await checkoutState(token), { headers: checkoutHeaders });
    }
    const amount = Number(order.selection.summary.totalValue);
    if (!["pix", "card", "debit"].includes(String(input.method))) throw new Error("invalid_payment");
    if (action === "authenticate") {
      if (input.method !== "debit" || !isCielo3dsConfigured()) throw new Error("authentication_unavailable");
      const data = await getCielo3dsTokenData();
      const host = data.environment === "SDB" ? "mpisandbox.braspag.com.br" : "mpi.braspag.com.br";
      return Response.json({ access_token: data.accessToken, environment: data.environment, order_reference: String(order.purchase_id),
        script_url: `https://${host}/Scripts/BP.Mpi.3ds20.min.js`, proof: authenticationProof(token, input, amount) }, { headers: checkoutHeaders });
    }
    const payment: Record<string, unknown> = input.method === "pix" ? { Type: "Pix" } : {
      Type: input.method === "debit" ? "DebitCard" : "CreditCard", cardNumber: input.card_number,
      holder: input.holder, securityCode: input.security_code, brand: input.brand, expirationDate: input.expiration, Installments: 1,
    };
    if (input.method !== "pix" && (!/^\d{13,19}$/.test(String(input.card_number)) || !/^\d{3,4}$/.test(String(input.security_code)) ||
        !/^\d{2}\/20\d{2}$/.test(String(input.expiration)) || typeof input.holder !== "string" || input.holder.length < 2 ||
        !["Visa", "Master", "Elo", "Amex", "Hipercard"].includes(String(input.brand)))) throw new Error("invalid_card");
    if (input.method === "debit") payment.ExternalAuthentication = validateAuthentication(token, input, amount);
    await client.query("UPDATE lumi_orders SET payment_attempt=$2::jsonb WHERE token=$1", [token, JSON.stringify({ state: "unknown" })]);
    try {
      const result = await createNativeCieloCheckout({ purchaseId: order.purchase_id, amount, customer: {
        name: order.buyer.name, document: order.cpf, email: order.buyer.email, phone: order.buyer.phone,
      }, payment, returnUrl: checkoutBase(token) });
      await saveGateway(order, result);
    } catch {
      // Do not expose gateway exceptions or retry an uncertain charge. State GET reconciles by reference.
      console.error("lumi-checkout-payment-uncertain", { purchaseId: order.purchase_id });
    }
    return Response.json(publicCheckout((await loadCheckout(token))!), { headers: checkoutHeaders });
  } finally {
    if (locked) await client.query("SELECT pg_advisory_unlock(hashtextextended($1,1))", [token]);
    client.release();
  }
}
