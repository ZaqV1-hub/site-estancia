import { getIngressoDbPool } from "@/lib/ingresso-db";
import type { PoolClient } from "pg";

// Call with the purchase row locked. Older installations create this table on first use.
export async function findBlockingRefund(client: Pick<PoolClient, "query">, purchaseId: number) {
  const schema = await client.query("SELECT to_regclass('public.purchase_refunds') IS NOT NULL AS installed");
  if (!schema.rows[0]?.installed) return null;
  const result = await client.query<{ state: "pending" | "uncertain" | "refunded"; payment_id: string }>(
    "SELECT state, payment_id FROM public.purchase_refunds WHERE purchase_id = $1 AND state <> 'denied'",
    [purchaseId],
  );
  return result.rows[0] ?? null;
}

// Serialize ticket issuance and commission writes with the creation of a refund intent.
export async function withConfirmedPurchase<T>(purchaseId: number, effect: (client: PoolClient) => Promise<T>) {
  const client = await getIngressoDbPool().connect();
  try {
    await client.query("BEGIN");
    const purchase = await client.query("SELECT idcompra FROM compra WHERE idcompra = $1 AND stcompra = 'conc' FOR UPDATE", [purchaseId]);
    const eligible = purchase.rows.length > 0 && !(await findBlockingRefund(client, purchaseId));
    const result = eligible ? await effect(client) : null;
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
