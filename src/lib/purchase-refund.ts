import type { PoolClient } from "pg";
import { getIngressoDbPool } from "@/lib/ingresso-db";
import { cancelCieloPayment, getCieloSaleByPaymentId } from "@/lib/cielo-ecommerce";
import { registerOpsAuditLog } from "@/lib/ops-audit-log";
import { syncTicketValidation } from "@/lib/ticket-service";
import { cancelCodindicaCashback } from "@/lib/codindica-cashback";
import { inspectRefundPayment, PurchaseRefundError, refundAmountCents, refundResponseState, type RefundState } from "./purchase-refund-gateway";

export { PurchaseRefundError } from "./purchase-refund-gateway";
export type { RefundState } from "./purchase-refund-gateway";

type RefundRow = {
  purchase_id: number; payment_id: string; amount_cents: string | number;
  state: RefundState; reason: string; actor_name: string; actor_cpf: string | null;
  gateway_status: number | null; gateway_code: string | null;
  ticket_sync_pending: boolean; cashback_pending: boolean;
};

export type PurchaseRefundResult = {
  purchaseId: number; paymentId: string; amountCents: number; state: RefundState;
  reconciliationPending: boolean; message: string;
};

export type PurchaseRefundInput = {
  purchaseId: number; reason: string; actorName: string; actorCpf?: string | null;
};

const schemaReady = new WeakMap<ReturnType<typeof getIngressoDbPool>, Promise<void>>();

export async function ensurePurchaseRefundTable() {
  const pool = getIngressoDbPool();
  const pending = schemaReady.get(pool);
  if (pending) return pending;
  const initialize = async () => {
    const exists = await pool.query<{ present: boolean }>("SELECT to_regclass('public.purchase_refunds') IS NOT NULL AS present");
    if (exists.rows[0]?.present) return;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      // Serialize the first installation across app processes, not just concurrent requests.
      await client.query("SELECT pg_advisory_xact_lock($1, $2)", [94129, 0]);
      const recheck = await client.query<{ present: boolean }>("SELECT to_regclass('public.purchase_refunds') IS NOT NULL AS present");
      if (!recheck.rows[0]?.present) await client.query(`
    CREATE TABLE IF NOT EXISTS purchase_refunds (
      purchase_id INTEGER PRIMARY KEY REFERENCES compra(idcompra),
      payment_id TEXT NOT NULL UNIQUE,
      amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
      state TEXT NOT NULL CHECK (state IN ('pending', 'uncertain', 'refunded', 'denied')),
      reason TEXT NOT NULL,
      actor_name TEXT NOT NULL,
      actor_cpf TEXT,
      requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      gateway_status INTEGER,
      gateway_code TEXT,
      ticket_sync_pending BOOLEAN NOT NULL DEFAULT false,
      cashback_pending BOOLEAN NOT NULL DEFAULT false
    )
      `);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally { client.release(); }
  };
  const initialized = initialize().catch(error => { schemaReady.delete(pool); throw error; });
  schemaReady.set(pool, initialized);
  return initialized;
}

function validateId(purchaseId: number) {
  if (!Number.isSafeInteger(purchaseId) || purchaseId <= 0 || purchaseId > 2147483647) {
    throw new PurchaseRefundError("refund_purchase_invalid", "Compra inválida.", 400);
  }
}

function result(row: RefundRow): PurchaseRefundResult {
  const reconciliationPending = row.state === "pending" || row.state === "uncertain" || row.ticket_sync_pending || row.cashback_pending;
  const messages: Record<RefundState, string> = {
    pending: "Estorno solicitado. Aguardando confirmação da Cielo; não envie outra solicitação.",
    uncertain: "Resultado ainda não confirmado. Consulte novamente para reconciliar; não envie outro estorno.",
    refunded: row.ticket_sync_pending || row.cashback_pending
      ? "Estorno confirmado. Há sincronizações pendentes; consulte novamente para concluí-las."
      : "Estorno integral confirmado e ingressos invalidados.",
    denied: "Estorno recusado pela Cielo. A compra permanece inalterada; confira a transação com a operadora.",
  };
  return { purchaseId: row.purchase_id, paymentId: row.payment_id, amountCents: Number(row.amount_cents), state: row.state, reconciliationPending, message: messages[row.state] };
}

async function loadRefund(client: Pick<PoolClient, "query">, purchaseId: number, lock = false) {
  const response = await client.query<RefundRow>(`SELECT * FROM purchase_refunds WHERE purchase_id = $1${lock ? " FOR UPDATE" : ""}`, [purchaseId]);
  return response.rows[0] ?? null;
}

export async function getPurchaseRefundState(purchaseId: number): Promise<PurchaseRefundResult | null> {
  validateId(purchaseId);
  await ensurePurchaseRefundTable();
  const row = await loadRefund(getIngressoDbPool(), purchaseId);
  return row ? result(row) : null;
}

async function audit(client: PoolClient, row: RefundRow, action: string, description: string) {
  await registerOpsAuditLog(client, {
    origem: "compra", acao: action, compraId: row.purchase_id,
    descricao: description, motivo: row.reason, usuarioNome: [row.actor_name, row.actor_cpf].filter(Boolean).join(" "),
    detalhes: { paymentId: row.payment_id, amountCents: Number(row.amount_cents), state: row.state },
  });
}

export async function requestPurchaseRefund(input: PurchaseRefundInput): Promise<PurchaseRefundResult> {
  validateId(input.purchaseId);
  const reason = input.reason?.trim();
  const actorName = input.actorName?.trim();
  if (!reason || reason.length > 500 || !actorName || actorName.length > 200) {
    throw new PurchaseRefundError("refund_input_invalid", "Informe o responsável e um motivo de até 500 caracteres.", 400);
  }
  await ensurePurchaseRefundTable();
  const client = await getIngressoDbPool().connect();
  let created = false;
  let shouldSend = false;
  let row: RefundRow;
  try {
    await client.query("BEGIN");
    const purchaseResult = await client.query<{ idcompra: number; tpcompra: string; stcompra: string; vltotcompra: string }>(
      "SELECT idcompra, tpcompra, stcompra, vltotcompra::text FROM compra WHERE idcompra = $1 FOR UPDATE", [input.purchaseId]);
    const purchase = purchaseResult.rows[0];
    if (!purchase) throw new PurchaseRefundError("refund_purchase_not_found", "Compra não encontrada.", 404);
    const existing = await loadRefund(client, input.purchaseId, true);
    if (existing) {
      row = existing;
    } else {
      if (purchase.tpcompra !== "ponli" || purchase.stcompra !== "conc") {
        throw new PurchaseRefundError("refund_purchase_ineligible", "O estorno exige uma compra online com pagamento confirmado.");
      }
      const vouchers = await client.query<{ idvoucher: number; stusado: string | null; dtuso: string | null }>(
        "SELECT idvoucher, stusado, dtuso::text FROM voucher WHERE idcompra = $1 ORDER BY idvoucher FOR UPDATE", [input.purchaseId]);
      if (vouchers.rows.some(voucher => voucher.stusado === "s" || Boolean(voucher.dtuso?.trim()))) {
        throw new PurchaseRefundError("refund_voucher_used", "Há ingressos utilizados nesta compra. O estorno integral automático está bloqueado.");
      }
      const payments = await client.query<{ idpagseguro: string; gross_amount: string }>(
        'SELECT idpagseguro, "grossAmount"::text AS gross_amount FROM pagpagseguro WHERE idcompra = $1 FOR UPDATE', [input.purchaseId]);
      if (payments.rows.length !== 1 || !payments.rows[0].idpagseguro?.trim()) {
        throw new PurchaseRefundError("refund_payment_ambiguous", "Não foi identificado um único pagamento para esta compra.");
      }
      const payment = payments.rows[0];
      const amountCents = refundAmountCents(purchase.vltotcompra);
      if (refundAmountCents(payment.gross_amount) !== amountCents) {
        throw new PurchaseRefundError("refund_payment_mismatch", "O valor do pagamento diverge do total da compra.");
      }
      const paymentId = payment.idpagseguro.trim();
      const evidence = inspectRefundPayment(await getCieloSaleByPaymentId(paymentId), { purchaseId: input.purchaseId, paymentId, amountCents });
      if (!evidence.canRequest && evidence.state !== "refunded") {
        throw new PurchaseRefundError("refund_gateway_ineligible", "Pagamento não elegível para estorno total automático. Verifique status, modalidade e devoluções anteriores na Cielo.");
      }
      const inserted = await client.query<RefundRow>(`
        INSERT INTO purchase_refunds (purchase_id, payment_id, amount_cents, reason, actor_name, actor_cpf, state)
        VALUES ($1, $2, $3, $4, $5, $6, 'pending') RETURNING *
      `, [input.purchaseId, paymentId, amountCents, reason, actorName, input.actorCpf?.replace(/\D/g, "") || null]);
      row = inserted.rows[0];
      created = true;
      shouldSend = evidence.canRequest;
      await audit(client, row, "estorno_solicitado", "Estorno integral online solicitado; aguardando confirmação financeira.");
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }

  if (created && shouldSend) {
    let responseState: Exclude<RefundState, "refunded"> = "uncertain";
    try {
      responseState = refundResponseState(await cancelCieloPayment(row.payment_id, Number(row.amount_cents)));
    } catch (error) {
      // Only documented business rejections are definitive; transport failures can follow a successful void.
      if (error && typeof error === "object" && "status" in error && "code" in error
        && Number(error.status) >= 400 && Number(error.status) < 500) {
        responseState = refundResponseState({ Code: error.code });
      }
    }
    // A denial is finalized only after a fresh GET still proves a fully paid, untouched payment.
    await getIngressoDbPool().query(`
      UPDATE purchase_refunds SET state = $2, gateway_status = $3, gateway_code = $4, updated_at = NOW()
      WHERE purchase_id = $1 AND state NOT IN ('refunded', 'denied')
    `, [row.purchase_id, responseState === "denied" ? "uncertain" : responseState, null, responseState === "denied" ? "void_denied" : null]);
  }
  return reconcilePurchaseRefund(input.purchaseId);
}

async function reconcileExternalEffects(row: RefundRow) {
  const pool = getIngressoDbPool();
  if (row.ticket_sync_pending) {
    try {
      const vouchers = await pool.query<{ idvoucher: number }>("SELECT idvoucher FROM voucher WHERE idcompra = $1 ORDER BY idvoucher", [row.purchase_id]);
      const sync = await syncTicketValidation(vouchers.rows.map(voucher => ({ purchaseId: row.purchase_id, voucherId: voucher.idvoucher })), "invalidate");
      if (sync.status === "sent" || vouchers.rows.length === 0) {
        await pool.query("UPDATE purchase_refunds SET ticket_sync_pending = false, updated_at = NOW() WHERE purchase_id = $1", [row.purchase_id]);
      }
    } catch { /* Persisted flag makes the next reconciliation retry this idempotent effect. */ }
  }
  if (row.cashback_pending) {
    try {
      await cancelCodindicaCashback(row.purchase_id);
      await pool.query("UPDATE purchase_refunds SET cashback_pending = false, updated_at = NOW() WHERE purchase_id = $1", [row.purchase_id]);
    } catch { /* Persisted flag makes the next reconciliation retry this idempotent effect. */ }
  }
}

export async function reconcilePurchaseRefund(purchaseId: number): Promise<PurchaseRefundResult> {
  validateId(purchaseId);
  await ensurePurchaseRefundTable();
  const pool = getIngressoDbPool();
  let row = await loadRefund(pool, purchaseId);
  if (!row) throw new PurchaseRefundError("refund_not_found", "Nenhum estorno solicitado para esta compra.", 404);
  if (row.state === "denied") return result(row);
  if (row.state !== "refunded") {
    let evidence: ReturnType<typeof inspectRefundPayment> | null = null;
    try {
      evidence = inspectRefundPayment(await getCieloSaleByPaymentId(row.payment_id), { purchaseId, paymentId: row.payment_id, amountCents: Number(row.amount_cents) });
    } catch { /* A failed or mismatched query cannot authorize a second refund or a local cancellation. */ }
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT idcompra FROM compra WHERE idcompra = $1 FOR UPDATE", [purchaseId]);
      row = (await loadRefund(client, purchaseId, true))!;
      if (row.state !== "refunded" && row.state !== "denied") {
        const state: RefundState = evidence?.state === "refunded" ? "refunded"
          : evidence?.state === "denied" ? "denied"
          : evidence?.canRequest && row.gateway_code === "void_denied" ? "denied"
          : evidence?.state === "pending" || row.state === "pending" && evidence !== null ? "pending" : "uncertain";
        if (state === "refunded") {
          await client.query("UPDATE compra SET stcompra = 'canc' WHERE idcompra = $1", [purchaseId]);
          await client.query("UPDATE voucher SET stusado = 'inv' WHERE idcompra = $1", [purchaseId]);
          await client.query('UPDATE pagpagseguro SET status = 6, "lastEventDate" = NOW() WHERE idcompra = $1 AND idpagseguro = $2', [purchaseId, row.payment_id]);
        }
        const updated = await client.query<RefundRow>(`
          UPDATE purchase_refunds SET state = $2, gateway_status = $3, gateway_code = COALESCE($4, gateway_code),
            ticket_sync_pending = CASE WHEN $2 = 'refunded' THEN true ELSE ticket_sync_pending END,
            cashback_pending = CASE WHEN $2 = 'refunded' THEN true ELSE cashback_pending END, updated_at = NOW()
          WHERE purchase_id = $1 RETURNING *
        `, [purchaseId, state, evidence?.status ?? null, null]);
        row = updated.rows[0];
        if (state === "refunded" || state === "denied") {
          await audit(client, row, state === "refunded" ? "estorno_confirmado" : "estorno_recusado",
            state === "refunded" ? "Estorno integral confirmado pela Cielo e ingressos invalidados." : "Cielo recusou o estorno; compra e ingressos preservados.");
        }
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }
  if (row.state === "refunded" && (row.ticket_sync_pending || row.cashback_pending)) {
    // Let the batch job rotate past a persistently unavailable external service.
    await pool.query("UPDATE purchase_refunds SET updated_at = NOW() WHERE purchase_id = $1", [purchaseId]);
    await reconcileExternalEffects(row);
  }
  return result((await loadRefund(pool, purchaseId))!);
}
