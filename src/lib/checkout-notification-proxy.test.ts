import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getCieloSaleByPaymentId,
  getNativeCieloCheckoutStatus,
  isCieloEcommerceConfigured,
} from "@/lib/cielo-ecommerce";
import { reconcilePaymentFromGatewayPayload } from "@/lib/payment-reconciliation";
import { proxyCheckoutNotification } from "@/lib/checkout-notification-proxy";

vi.mock("@/lib/payment-reconciliation", () => ({
  reconcilePaymentFromGatewayPayload: vi.fn(),
}));

vi.mock("@/lib/cielo-ecommerce", () => ({
  getCieloSaleByPaymentId: vi.fn(),
  getNativeCieloCheckoutStatus: vi.fn(),
  isCieloEcommerceConfigured: vi.fn(() => true),
}));

const originalEnv = process.env;

function notificationRequest(payload: unknown, secret = "webhook-secret") {
  return new Request("https://example.com/api/checkout/notification", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      CieloWebhookSecret: secret,
    },
    body: JSON.stringify(payload),
  });
}

describe("checkout-notification-proxy", () => {
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      INGRESSO_CIELO_NOTIFICATION_SECRET: "webhook-secret",
      INGRESSO_CIELO_NOTIFICATION_HEADER: "CieloWebhookSecret",
    };
    vi.mocked(isCieloEcommerceConfigured).mockReturnValue(true);
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  it("fails closed when the webhook secret is not configured", async () => {
    delete process.env.INGRESSO_CIELO_NOTIFICATION_SECRET;

    const result = await proxyCheckoutNotification(
      notificationRequest({ PaymentId: "pid-123" }),
    );

    expect(result.status).toBe(503);
    expect(JSON.parse(result.body).error.code).toBe(
      "payment_notification_not_configured",
    );
    expect(getCieloSaleByPaymentId).not.toHaveBeenCalled();
  });

  it("rejects notifications with an invalid secret", async () => {
    const result = await proxyCheckoutNotification(
      notificationRequest({ PaymentId: "pid-123" }, "wrong-secret"),
    );

    expect(result.status).toBe(401);
    expect(JSON.parse(result.body).error.code).toBe(
      "payment_notification_unauthorized",
    );
    expect(getCieloSaleByPaymentId).not.toHaveBeenCalled();
    expect(reconcilePaymentFromGatewayPayload).not.toHaveBeenCalled();
  });

  it("queries Cielo and ignores a forged status from the notification", async () => {
    const notification = {
      MerchantOrderId: "456",
      Payment: {
        PaymentId: "pid-456",
        Status: 2,
      },
    };
    const verifiedSale = {
      MerchantOrderId: "456",
      Payment: {
        PaymentId: "pid-456",
        Status: 1,
        Amount: 12000,
      },
    };
    vi.mocked(getCieloSaleByPaymentId).mockResolvedValue(verifiedSale);

    const result = await proxyCheckoutNotification(
      notificationRequest(notification),
    );

    expect(result).toEqual({
      status: 200,
      contentType: "text/plain; charset=UTF-8",
      body: "ok",
    });
    expect(getCieloSaleByPaymentId).toHaveBeenCalledWith("pid-456");
    expect(reconcilePaymentFromGatewayPayload).toHaveBeenCalledWith(
      verifiedSale,
      456,
    );
    expect(reconcilePaymentFromGatewayPayload).not.toHaveBeenCalledWith(
      notification,
      456,
    );
  });

  it("reconciles the standard identifier-only Cielo notification", async () => {
    const verifiedSale = {
      MerchantOrderId: "789",
      Payment: {
        PaymentId: "pid-789",
        Status: 2,
      },
    };
    vi.mocked(getCieloSaleByPaymentId).mockResolvedValue(verifiedSale);

    const result = await proxyCheckoutNotification(
      notificationRequest({ PaymentId: "pid-789", ChangeType: 1 }),
    );

    expect(result.status).toBe(200);
    expect(reconcilePaymentFromGatewayPayload).toHaveBeenCalledWith(
      verifiedSale,
      789,
    );
  });

  it("queries by merchant order when no payment id is provided", async () => {
    vi.mocked(getNativeCieloCheckoutStatus).mockResolvedValue({
      status: "00",
      dados: {
        code: "pid-654",
        reference: "654",
        status: 3,
      },
    } as unknown as Awaited<ReturnType<typeof getNativeCieloCheckoutStatus>>);

    const result = await proxyCheckoutNotification(
      notificationRequest({ MerchantOrderId: "654" }),
    );

    expect(result.status).toBe(200);
    expect(getNativeCieloCheckoutStatus).toHaveBeenCalledWith({
      paymentId: null,
      reference: "654",
      purchaseId: 654,
    });
  });

  it("returns a retryable error when Cielo verification fails", async () => {
    vi.mocked(getCieloSaleByPaymentId).mockRejectedValue(
      new Error("cielo_ecommerce_error_401"),
    );

    const result = await proxyCheckoutNotification(
      notificationRequest({ PaymentId: "pid-123" }),
    );

    expect(result.status).toBe(502);
    expect(JSON.parse(result.body).error.code).toBe(
      "payment_notification_verification_failed",
    );
    expect(reconcilePaymentFromGatewayPayload).not.toHaveBeenCalled();
  });
});
