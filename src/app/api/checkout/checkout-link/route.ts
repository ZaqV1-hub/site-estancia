import { NextResponse } from "next/server";
import type { PoolClient } from "pg";
import type { AuthErrorResponse } from "@/lib/auth-contracts";
import { clearAuthCookie } from "@/lib/auth-session";
import { checkoutSession } from "@/lib/lumi-access";
import {
  createNativeCieloCheckout,
  getNativeCieloCheckoutStatus,
} from "@/lib/cielo-ecommerce";
import { isNativeCheckoutConfigured } from "@/lib/checkout-mode";
import { buildCheckoutReturnUrl } from "@/lib/checkout-status";
import { getIngressoDbPool } from "@/lib/ingresso-db";
import {
  mapGatewayStatusToPurchaseStatus,
  applyPaymentReconciliationRecord,
  normalizePaymentReconciliationPayload,
  runPaymentReconciliationEffects,
} from "@/lib/payment-reconciliation";
import { findBlockingRefund } from "@/lib/refund-lock";
import { getSiteUrl } from "@/lib/site-metadata";
import { getActivePublicUserByCpf } from "@/lib/user-repository";
import { getUserVoucherPurchaseById } from "@/lib/voucher-repository";

export const runtime = "nodejs";

type CheckoutBody = Record<string, unknown> & {
  idcompra?: unknown;
};

type PaymentLedgerRow = {
  idpagseguro: string;
  status: number | null;
  paymentmethodtype: number | null;
  xmlRequisicao: string | null;
};

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json<AuthErrorResponse>(
    {
      ok: false,
      error: {
        code,
        message,
      },
    },
    { status },
  );
}

function getPaymentType(payload: CheckoutBody) {
  const payment =
    payload.payment && typeof payload.payment === "object"
      ? (payload.payment as Record<string, unknown>)
      : payload;

  return String(payment.type ?? payment.Type ?? "CreditCard").toLowerCase();
}

async function getLatestPaymentLedger(client: PoolClient, purchaseId: number) {
  const result = await client.query<PaymentLedgerRow>(
    `
      SELECT idpagseguro, status, paymentmethodtype, "xmlRequisicao"
      FROM pagpagseguro
      WHERE idcompra = $1
      ORDER BY date DESC NULLS LAST, "lastEventDate" DESC NULLS LAST
      LIMIT 1
    `,
    [purchaseId],
  );

  return result.rows[0] ?? null;
}

function paymentConfirmedResponse() {
  return { status: "10", msg: "Pagamento confirmado. Consulte seus ingressos em Minha conta." };
}

function pixHasExpired(payment: Record<string, unknown>) {
  const qr = payment.QrCode ?? payment.qrCode;
  const expiration = qr && typeof qr === "object"
    ? Number((qr as Record<string, unknown>).Expiration ?? (qr as Record<string, unknown>).expiration)
    : Number(qr);
  const received = payment.ReceivedDate ?? payment.receivedDate;
  if (typeof received !== "string" || !Number.isFinite(expiration) || expiration <= 0) return false;
  const timestamp = received.replace(" ", "T");
  const hasTimezone = /(Z|[+-]\d{2}:?\d{2})$/i.test(timestamp);
  if (!hasTimezone && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(timestamp)) return false;
  // UTC-12 is the latest possible instant for a civil timestamp with no offset.
  const latestReceivedAt = Date.parse(hasTimezone ? timestamp : `${timestamp}Z`) + (hasTimezone ? 0 : 12 * 3600000);
  const expiresAt = latestReceivedAt + expiration * 1000;
  return Number.isFinite(expiresAt) && expiresAt <= Date.now();
}

function storedPixPayment(ledger: PaymentLedgerRow, purchaseId: number) {
  try {
    const stored = JSON.parse(ledger.xmlRequisicao ?? "null");
    const sale = stored?.sale ?? stored?.Sale ?? stored;
    const payment = sale?.Payment ?? sale?.payment;
    if (String(sale?.MerchantOrderId ?? sale?.merchantOrderId) !== String(purchaseId)
      || (payment?.PaymentId ?? payment?.paymentId) !== ledger.idpagseguro
      || String(payment?.Type ?? payment?.PaymentType ?? payment?.type).toLowerCase() !== "pix") return {};
    return payment;
  } catch {
    return {};
  }
}

async function resolveNativeCheckout(
  payload: CheckoutBody,
  purchase: { id: number; totalValue: string | null },
  latestLedger: PaymentLedgerRow | null,
): Promise<{ response: unknown; checkout?: unknown }> {
  const type = getPaymentType(payload);
  const latestStatus = mapGatewayStatusToPurchaseStatus(latestLedger?.status ?? null);
  const processing = { status: "10", msg: "Pagamento já está em processamento. Aguarde a confirmação antes de tentar novamente." };

  if (latestStatus === "conc") return { response: paymentConfirmedResponse() };

  if (latestLedger?.paymentmethodtype === 11 && latestLedger.idpagseguro) {
    const current = await getNativeCieloCheckoutStatus({
      paymentId: latestLedger.idpagseguro,
      reference: String(purchase.id),
      purchaseId: purchase.id,
    }).catch(() => null);
    if (!current || current.status !== "00" || !current.dados || Array.isArray(current.dados)) {
      return { response: { status: "10", msg: "Não foi possível verificar o Pix existente. Aguarde e consulte novamente; nenhuma nova cobrança foi criada." } };
    }
    const currentStatus = mapGatewayStatusToPurchaseStatus(current.dados.status);
    if (currentStatus === "conc") return { response: paymentConfirmedResponse(), checkout: current };
    const pixPayment = { ...storedPixPayment(latestLedger, purchase.id), ...(current.sale?.Payment ?? current.sale?.payment ?? {}) };
    const rawStatus = String((current.sale?.Payment ?? current.sale?.payment)?.Status ?? (current.sale?.Payment ?? current.sale?.payment)?.status).toLowerCase();
    const pendingPix = currentStatus === "pend" && ["0", "12", "14", "20", "pending", "notfinished", "scheduled"].includes(rawStatus);
    const expired = pendingPix && pixHasExpired(pixPayment);
    // Only a confirmed cancellation or proven expiry permits another charge.
    if (current.dados.status !== 7 && !expired) {
      const hasQr = pixPayment.QrCodeString || pixPayment.qrCodeString || pixPayment.QrCodeBase64Image || pixPayment.qrCodeBase64Image || pixPayment.QrCodeBase64 || pixPayment.qrCodeBase64 || (typeof pixPayment.QrCode === "string" && pixPayment.QrCode);
      if (type === "pix" && pendingPix && hasQr) {
        return { response: { ...current, paymentId: latestLedger.idpagseguro, sale: { ...current.sale, Payment: pixPayment } } };
      }
      return { response: processing };
    }
  } else if (latestLedger && latestStatus !== "canc") {
    return { response: processing };
  }

  const payment = payload.payment && typeof payload.payment === "object"
    ? payload.payment as Record<string, unknown> : payload;
  const checkout = await createNativeCieloCheckout({
    purchaseId: purchase.id,
    amount: purchase.totalValue ?? "0.00",
    customer: {
      name: String(payload.nome ?? payload.name ?? ""),
      email: String(payload.email ?? ""),
      phone: String(payload.telefone ?? payload.phone ?? ""),
      document: String(payload.document ?? payload.cpf ?? ""),
    },
    payment,
    returnUrl: buildCheckoutReturnUrl(purchase.id, getSiteUrl()),
  });
  return { response: checkout, checkout };
}

async function createNativeCheckoutResponse(
  payload: CheckoutBody,
  purchase: { id: number; totalValue: string | null },
) {
  const client = await getIngressoDbPool().connect();
  let locked = false;
  let result: Awaited<ReturnType<typeof applyPaymentReconciliationRecord>> | undefined;
  let response: NextResponse;
  try {
    const lock = await client.query<{ locked: boolean }>("SELECT pg_try_advisory_lock($1, $2) AS locked", [94127, purchase.id]);
    locked = lock.rows[0]?.locked === true;
    if (!locked) return NextResponse.json({ status: "10", msg: "Pagamento já está sendo processado. Aguarde alguns instantes e tente novamente." });

    await client.query("BEGIN");
    try {
      const lockedPurchase = await client.query<{ stcompra: string }>("SELECT stcompra FROM compra WHERE idcompra = $1 FOR UPDATE", [purchase.id]);
      const currentStatus = lockedPurchase.rows[0]?.stcompra;
      const refund = await findBlockingRefund(client, purchase.id);
      let resolved: { response: unknown; checkout?: unknown };
      if (refund || !currentStatus || currentStatus === "canc") {
        resolved = { response: { status: "10", msg: "Esta compra não está disponível para um novo pagamento." } };
      } else if (currentStatus === "conc") {
        resolved = { response: paymentConfirmedResponse() };
      } else {
        resolved = await resolveNativeCheckout(payload, purchase, await getLatestPaymentLedger(client, purchase.id));
      }
      if (resolved.checkout) {
        result = await applyPaymentReconciliationRecord(client, normalizePaymentReconciliationPayload(resolved.checkout, purchase.id));
      }
      await client.query("COMMIT");
      response = NextResponse.json(resolved.response);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  } finally {
    try {
      if (locked) await client.query("SELECT pg_advisory_unlock($1, $2)", [94127, purchase.id]);
    } catch (error) {
      client.release(true);
      throw error;
    }
    client.release();
  }
  if (result) await runPaymentReconciliationEffects(result);
  return response;
}

export async function POST(request: Request) {
  // Lumi orders use the durable, idempotent payment flow; the account checkout is unchanged.
  if (new URL(request.url).searchParams.has("lumi_token")) {
    return errorResponse("checkout_moved", "Reabra o link de pagamento recebido na conversa.", 409);
  }
  const session = await checkoutSession(request);

  if (!session) {
    return errorResponse(
      "unauthenticated",
      "Sessao nao encontrada ou expirada.",
      401,
    );
  }

  let payload: CheckoutBody | null = null;

  try {
    payload = (await request.json()) as CheckoutBody;
  } catch {
    return errorResponse(
      "invalid_checkout",
      "Nao foi possivel iniciar o checkout seguro.",
      400,
    );
  }

  const purchaseId = Number(payload?.idcompra);

  if (!Number.isInteger(purchaseId) || purchaseId <= 0) {
    return errorResponse(
      "invalid_checkout",
      "Nao foi possivel iniciar o checkout seguro.",
      400,
    );
  }

  try {
    const user = await getActivePublicUserByCpf(session.sub);

    if (!user) {
      const response = errorResponse(
        "unauthenticated",
        "Sessao nao encontrada ou expirada.",
        401,
      );
      clearAuthCookie(response);

      return response;
    }

    const purchase = await getUserVoucherPurchaseById(user.cpf, purchaseId);

    if (!purchase || purchase.type !== "ponli" || purchase.status === "canc") {
      return errorResponse(
        "checkout_unavailable",
        "Esta compra nao esta disponivel para checkout.",
        404,
      );
    }

    if (purchase.status === "conc") return NextResponse.json(paymentConfirmedResponse());

    if (!isNativeCheckoutConfigured()) {
      return errorResponse(
        "checkout_unavailable",
        "Checkout nativo indisponivel neste ambiente.",
        503,
      );
    }

    return await createNativeCheckoutResponse(payload, {
      id: purchase.id,
      totalValue: purchase.totalValue,
    });
  } catch (error) {
    console.error("checkout-link-native-failed", error);

    return errorResponse(
      "checkout_unavailable",
      "Nao foi possivel iniciar o checkout seguro.",
      502,
    );
  }
}
