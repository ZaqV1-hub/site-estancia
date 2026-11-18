import { timingSafeEqual } from "node:crypto";
import { getIngressoDbPool } from "@/lib/ingresso-db";
import { getAuthSession } from "@/lib/auth-session";

export function lumiEnabled() {
  return process.env.LUMI_COMMERCE_ENABLED === "true" &&
    Boolean(process.env.LUMI_COMMERCE_DATABASE_NAME) &&
    process.env.INGRESSO_DB_NAME === process.env.LUMI_COMMERCE_DATABASE_NAME &&
    !process.env.INGRESSO_DATABASE_URL;
}

export function authorizeLumi(authorization: string, tenant: string, role: string) {
  const secret = process.env.LUMI_COMMERCE_SECRET ?? "";
  const expected = Buffer.from("Bearer " + secret);
  const provided = Buffer.from(authorization);
  return lumiEnabled() && secret.length >= 32 && expected.length === provided.length &&
    timingSafeEqual(expected, provided) && tenant === process.env.LUMI_TENANT_ID &&
    ["cliente", "gestor", "atendente"].includes(role);
}

export async function checkoutOrder(token: string) {
  if (!lumiEnabled() || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const result = await getIngressoDbPool().query<{
    purchase_id: number; cpf: string; buyer: { name: string; cpf: string; phone: string; email: string | null };
  }>(`SELECT purchase_id,cpf,buyer FROM lumi_orders WHERE token=$1 AND expires_at>now() AND purchase_id IS NOT NULL`, [token]);
  return result.rows[0] ?? null;
}

export async function checkoutSession(request?: Request) {
  const token = request ? new URL(request.url).searchParams.get("lumi_token") : null;
  if (!token) return getAuthSession();
  const order = await checkoutOrder(token);
  if (!order) return null;
  const url = new URL(request!.url);
  const body = request!.method === "POST" ? await request!.clone().json().catch(() => ({})) : {};
  const id = Number(body.idcompra ?? url.searchParams.get("reference") ?? url.searchParams.get("idcompra"));
  if (!url.pathname.endsWith("cielo3ds-token") && id !== order.purchase_id) return null;
  return { sub: order.cpf };
}
