import {
  getCieloSaleByPaymentId,
  getNativeCieloCheckoutStatus,
  isCieloEcommerceConfigured,
} from "@/lib/cielo-ecommerce";
import { reconcilePaymentFromGatewayPayload } from "@/lib/payment-reconciliation";
import { secureCompare } from "@/lib/secure-compare";

export type CheckoutNotificationProxyResult = {
  status: number;
  contentType: string;
  body: string;
};

function jsonResult(
  status: number,
  code: string,
  message: string,
): CheckoutNotificationProxyResult {
  return {
    status,
    contentType: "application/json; charset=UTF-8",
    body: JSON.stringify({
      ok: false,
      error: { code, message },
    }),
  };
}

function readObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function getString(object: Record<string, unknown> | null, keys: string[]) {
  if (!object) {
    return "";
  }

  for (const key of keys) {
    const value = object[key];

    if (value !== null && value !== undefined) {
      return String(value).trim();
    }
  }

  return "";
}

function extractNotificationIdentifiers(payload: unknown) {
  const root = readObject(payload);
  const sale = readObject(root?.Sale) ?? readObject(root?.sale) ?? root;
  const payment = readObject(sale?.Payment) ?? readObject(sale?.payment);
  const paymentId =
    getString(payment, ["PaymentId", "paymentId", "Id", "id"]) ||
    getString(sale, ["PaymentId", "paymentId"]);
  const reference =
    getString(sale, [
      "MerchantOrderId",
      "merchantOrderId",
      "OrderNumber",
      "orderNumber",
      "reference",
      "Reference",
    ]) ||
    getString(payment, [
      "MerchantOrderId",
      "merchantOrderId",
      "OrderId",
      "orderId",
    ]);
  const purchaseId = Number(reference.replace(/\D+/g, ""));

  return {
    paymentId: paymentId || null,
    reference: reference || null,
    purchaseId:
      Number.isInteger(purchaseId) && purchaseId > 0 ? purchaseId : null,
  };
}

function getWebhookConfig() {
  return {
    header:
      process.env.INGRESSO_CIELO_NOTIFICATION_HEADER?.trim() ||
      "CieloWebhookSecret",
    secret: process.env.INGRESSO_CIELO_NOTIFICATION_SECRET?.trim() || "",
  };
}

function authorizeNotification(request: Request, secret: string, header: string) {
  const provided = request.headers.get(header)?.trim() ?? "";

  return Boolean(provided && secureCompare(secret, provided));
}

async function reconcileVerifiedNotification(payload: unknown) {
  const notified = extractNotificationIdentifiers(payload);

  if (!notified.paymentId && !notified.purchaseId) {
    return false;
  }

  if (notified.paymentId) {
    const sale = await getCieloSaleByPaymentId(notified.paymentId);
    const verified = extractNotificationIdentifiers(sale);

    if (!verified.purchaseId) {
      return false;
    }

    await reconcilePaymentFromGatewayPayload(sale, verified.purchaseId);
    return true;
  }

  const statusPayload = await getNativeCieloCheckoutStatus({
    paymentId: null,
    reference: notified.reference,
    purchaseId: notified.purchaseId!,
  });

  if (statusPayload.status !== "00") {
    return false;
  }

  await reconcilePaymentFromGatewayPayload(statusPayload, notified.purchaseId!);
  return true;
}

export async function proxyCheckoutNotification(request: Request) {
  const webhook = getWebhookConfig();

  if (!webhook.secret) {
    return jsonResult(
      503,
      "payment_notification_not_configured",
      "Webhook de pagamento nao configurado.",
    );
  }

  if (!authorizeNotification(request, webhook.secret, webhook.header)) {
    return jsonResult(
      401,
      "payment_notification_unauthorized",
      "Notificacao de pagamento nao autorizada.",
    );
  }

  if (!isCieloEcommerceConfigured()) {
    return jsonResult(
      503,
      "payment_gateway_not_configured",
      "Gateway de pagamento nao configurado.",
    );
  }

  const rawBody = await request.text();
  let payload: unknown;

  try {
    payload = JSON.parse(rawBody) as unknown;
  } catch {
    return jsonResult(
      400,
      "payment_notification_invalid",
      "Notificacao de pagamento invalida.",
    );
  }

  try {
    const reconciled = await reconcileVerifiedNotification(payload);

    if (!reconciled) {
      return jsonResult(
        422,
        "payment_notification_unhandled",
        "Notificacao de pagamento nao reconciliada.",
      );
    }
  } catch (error) {
    console.error("checkout-notification-reconciliation-failed", error);

    return jsonResult(
      502,
      "payment_notification_verification_failed",
      "Nao foi possivel verificar a notificacao na Cielo.",
    );
  }

  return {
    status: 200,
    contentType: "text/plain; charset=UTF-8",
    body: "ok",
  } satisfies CheckoutNotificationProxyResult;
}
