import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const clearAuthCookie = vi.fn();
const getAuthSession = vi.fn();
const getActivePublicUserByCpf = vi.fn();
const getUserVoucherPurchaseById = vi.fn();
const isCieloEcommerceConfigured = vi.fn();
const createNativeCieloCheckout = vi.fn();
const getNativeCieloCheckoutStatus = vi.fn();
const cancelCieloPayment = vi.fn();
const applyPaymentReconciliationRecord = vi.fn();
const runPaymentReconciliationEffects = vi.fn();
const release = vi.fn();
const dbQuery = vi.fn();

vi.mock("@/lib/auth-session", () => ({
  clearAuthCookie,
  getAuthSession,
}));

vi.mock("@/lib/user-repository", () => ({
  getActivePublicUserByCpf,
}));

vi.mock("@/lib/voucher-repository", () => ({
  getUserVoucherPurchaseById,
}));

vi.mock("@/lib/cielo-ecommerce", () => ({
  cancelCieloPayment,
  createNativeCieloCheckout,
  getNativeCieloCheckoutStatus,
  isCieloEcommerceConfigured,
}));

vi.mock("@/lib/ingresso-db", () => ({
  getIngressoDbPool: () => ({
    connect: async () => ({ query: dbQuery, release }),
  }),
}));

vi.mock("@/lib/payment-reconciliation", async () => {
  const actual = await vi.importActual<typeof import("@/lib/payment-reconciliation")>(
    "@/lib/payment-reconciliation",
  );

  return {
    ...actual,
    applyPaymentReconciliationRecord,
    runPaymentReconciliationEffects,
  };
});

describe("checkout-link BFF route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-20T12:00:00Z"));
    applyPaymentReconciliationRecord.mockImplementation(async (_client, record) => ({
      purchaseId: record.purchaseId, purchaseStatus: record.purchaseStatus,
      gatewayPaymentId: record.gatewayPaymentId, gatewayStatus: record.status, ledgerAction: "updated",
    }));
    runPaymentReconciliationEffects.mockResolvedValue(undefined);
    getAuthSession.mockResolvedValue({ sub: "52998224725" });
    getActivePublicUserByCpf.mockResolvedValue({
      cpf: "52998224725",
      name: "Cliente Teste",
      email: "cliente@example.com",
      status: "ati",
    });
    getUserVoucherPurchaseById.mockResolvedValue({
      id: 456,
      type: "ponli",
      status: "pend",
      totalValue: "129.90",
    });
    isCieloEcommerceConfigured.mockReturnValue(true);
    createNativeCieloCheckout.mockResolvedValue({
      status: "00",
      paymentId: "pid-456",
      dados: {
        code: "pid-456",
        reference: "456",
        status: 2,
      },
      sale: {},
    });
    getNativeCieloCheckoutStatus.mockResolvedValue({
      status: "00",
      dados: {
        code: "pid-pix-old",
        reference: "456",
        status: 7,
      },
    });
    dbQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("pg_try_advisory_lock")) {
        return { rows: [{ locked: true }] };
      }

      if (sql.includes("FROM compra")) return { rows: [{ stcompra: "pend" }] };
      if (sql.includes("FROM pagpagseguro")) {
        return { rows: [] };
      }

      if (sql.includes("FROM compra")) return { rows: [{ stcompra: "pend" }] };
      return { rows: [] };
    });
  });

  it("creates checkout directly in Cielo when configured", async () => {
    const { POST } = await import("@/app/api/checkout/checkout-link/route");
    const response = await POST(
      new Request("https://example.com/api/checkout/checkout-link", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          idcompra: 456,
          valor: "1.00",
          nome: "Cliente Teste",
          email: "cliente@example.com",
          telefone: "(51) 99999-9999",
          document: "529.982.247-25",
          payment: {
            type: "CreditCard",
            installments: 2,
          },
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      status: "00",
      paymentId: "pid-456",
    });
    expect(createNativeCieloCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        purchaseId: 456,
        amount: "129.90",
        customer: expect.objectContaining({
          document: "529.982.247-25",
        }),
        payment: {
          type: "CreditCard",
          installments: 2,
        },
      }),
    );
    expect(applyPaymentReconciliationRecord).toHaveBeenCalledWith(
      expect.objectContaining({ query: dbQuery }),
      expect.objectContaining({ purchaseId: 456, gatewayPaymentId: "pid-456" }),
    );
    expect(runPaymentReconciliationEffects).toHaveBeenCalledTimes(1);
    expect(release.mock.invocationCallOrder[0]).toBeLessThan(runPaymentReconciliationEffects.mock.invocationCallOrder[0]);
    expect(dbQuery).toHaveBeenCalledWith("SELECT pg_advisory_unlock($1, $2)", [
      94127,
      456,
    ]);
  });

  it("blocks checkout without falling back when Cielo ecommerce credentials are missing", async () => {
    isCieloEcommerceConfigured.mockReturnValue(false);
    vi.stubGlobal("fetch", vi.fn());

    const { POST } = await import("@/app/api/checkout/checkout-link/route");
    const response = await POST(
      new Request("https://example.com/api/checkout/checkout-link", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          idcompra: 456,
          payment: {
            type: "CreditCard",
          },
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({
      ok: false,
      error: {
        code: "checkout_unavailable",
        message: "Checkout nativo indisponivel neste ambiente.",
      },
    });
    expect(fetch).not.toHaveBeenCalled();
    expect(createNativeCieloCheckout).not.toHaveBeenCalled();
  });

  it("blocks duplicate non-Pix checkouts with active payment ledger", async () => {
    dbQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("pg_try_advisory_lock")) {
        return { rows: [{ locked: true }] };
      }

      if (sql.includes("FROM pagpagseguro")) {
        return {
          rows: [
            {
              idpagseguro: "pid-active",
              status: 2,
              paymentmethodtype: 1,
            },
          ],
        };
      }

      if (sql.includes("FROM compra")) return { rows: [{ stcompra: "pend" }] };
      return { rows: [] };
    });

    const { POST } = await import("@/app/api/checkout/checkout-link/route");
    const response = await POST(
      new Request("https://example.com/api/checkout/checkout-link", {
        method: "POST",
        body: JSON.stringify({
          idcompra: 456,
          payment: {
            type: "CreditCard",
          },
        }),
      }),
    );
    const body = await response.json();

    expect(body).toMatchObject({
      status: "10",
    });
    expect(createNativeCieloCheckout).not.toHaveBeenCalled();
  });

  function usePixLedger(status = 1, xmlRequisicao: string | null = null) {
    dbQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("pg_try_advisory_lock")) return { rows: [{ locked: true }] };
      if (sql.includes("FROM pagpagseguro")) return { rows: [{ idpagseguro: "pid-pix-old", status, paymentmethodtype: 11, xmlRequisicao }] };
      if (sql.includes("FROM compra")) return { rows: [{ stcompra: "pend" }] };
      return { rows: [] };
    });
  }

  function pixStatus(status = 1, receivedDate = "2026-11-20T08:30:00-03:00") {
    return {
      status: "00",
      dados: { code: "pid-pix-old", reference: "456", status, paymentMethod: { type: 11 } },
      sale: { MerchantOrderId: "456", Payment: {
        PaymentId: "pid-pix-old", Type: "Pix", Status: status === 3 ? 2 : 12,
        QrCodeString: "000201-pix-code", QrCodeBase64Image: "pix-image", QrCode: { Expiration: 3600 }, ReceivedDate: receivedDate,
      } },
    };
  }

  async function requestPix(type = "Pix") {
    const { POST } = await import("@/app/api/checkout/checkout-link/route");
    return POST(new Request("https://example.com/api/checkout/checkout-link", {
      method: "POST", body: JSON.stringify({ idcompra: 456, payment: { type } }),
    }));
  }

  afterEach(() => {
    expect(cancelCieloPayment).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("reuses an active Pix QR with the exact response fields expected by the public checkout", async () => {
    usePixLedger();
    const current = pixStatus();
    getNativeCieloCheckoutStatus.mockResolvedValue(current);
    const response = await requestPix();
    expect(await response.json()).toMatchObject({ status: "00", paymentId: "pid-pix-old", sale: current.sale });
    expect(getNativeCieloCheckoutStatus).toHaveBeenCalledWith({ paymentId: "pid-pix-old", reference: "456", purchaseId: 456 });
    expect(createNativeCieloCheckout).not.toHaveBeenCalled();
  });

  it("confirms a paid Pix despite a stale pending ledger without voiding or charging again", async () => {
    usePixLedger();
    const paid = pixStatus(3);
    getNativeCieloCheckoutStatus.mockResolvedValue(paid);
    const body = await (await requestPix()).json();
    expect(body).toMatchObject({ status: "10", msg: expect.stringContaining("confirmado") });
    expect(applyPaymentReconciliationRecord).toHaveBeenCalledWith(
      expect.anything(), expect.objectContaining({ purchaseId: 456, gatewayPaymentId: "pid-pix-old", purchaseStatus: "conc" }),
    );
    expect(createNativeCieloCheckout).not.toHaveBeenCalled();
  });

  it("acknowledges an already completed purchase without starting a new checkout", async () => {
    getUserVoucherPurchaseById.mockResolvedValue({ id: 456, type: "ponli", status: "conc", totalValue: "129.90" });
    expect(await (await requestPix()).json()).toMatchObject({ status: "10", msg: expect.stringContaining("confirmado") });
    expect(createNativeCieloCheckout).not.toHaveBeenCalled();
  });

  it.each([
    { name: "canceled by the gateway", current: pixStatus(7) },
    { name: "expired with an explicit timestamp", current: pixStatus(1, "2026-11-19T12:00:00-03:00") },
  ])("creates a replacement only after the previous Pix is $name", async ({ current }) => {
    usePixLedger();
    getNativeCieloCheckoutStatus.mockResolvedValue(current);
    expect(await (await requestPix()).json()).toMatchObject({ status: "00", paymentId: "pid-456" });
    expect(createNativeCieloCheckout).toHaveBeenCalledTimes(1);
  });

  it.each([
    { name: "unavailable status", current: { status: "30" } },
    { name: "missing QR", current: { ...pixStatus(), sale: {} } },
    { name: "refunded payment", current: pixStatus(6) },
    { name: "unknown gateway state", current: pixStatus(99) },
  ])("does not replace a Pix when there is $name", async ({ current }) => {
    usePixLedger();
    getNativeCieloCheckoutStatus.mockResolvedValue(current);
    const body = await (await requestPix()).json();
    expect(body.status).toBe("10");
    expect(createNativeCieloCheckout).not.toHaveBeenCalled();
  });

  it("never treats an ambiguous local expiration timestamp as proof for replacement", async () => {
    usePixLedger();
    getNativeCieloCheckoutStatus.mockResolvedValue(pixStatus(1, new Date(Date.now() - 2 * 3600000).toISOString().replace("Z", "")));
    await requestPix();
    expect(createNativeCieloCheckout).not.toHaveBeenCalled();
  });

  it("allows replacement after the conservative expiration bound for a timestamp without timezone", async () => {
    usePixLedger();
    getNativeCieloCheckoutStatus.mockResolvedValue(pixStatus(1, "2026-11-19 12:00:00"));
    await requestPix();
    expect(createNativeCieloCheckout).toHaveBeenCalledTimes(1);
  });

  it("reuses the original stored QR when GET omits it, without discarding the original ledger payload", async () => {
    usePixLedger(1, JSON.stringify(pixStatus().sale));
    getNativeCieloCheckoutStatus.mockResolvedValue({ ...pixStatus(), sale: { MerchantOrderId: "456", Payment: { PaymentId: "pid-pix-old", Type: "Pix", Status: 12 } } });
    const body = await (await requestPix()).json();
    expect(body).toMatchObject({ status: "00", paymentId: "pid-pix-old", sale: { Payment: { QrCodeString: "000201-pix-code", QrCodeBase64Image: "pix-image" } } });
    expect(createNativeCieloCheckout).not.toHaveBeenCalled();
    expect(applyPaymentReconciliationRecord).not.toHaveBeenCalled();
  });

  it.each([
    { MerchantOrderId: "999", Payment: pixStatus().sale.Payment },
    { MerchantOrderId: "456", Payment: { ...pixStatus().sale.Payment, PaymentId: "unrelated-payment" } },
  ])("never reuses a stored QR belonging to another purchase or payment", async sale => {
    usePixLedger(1, JSON.stringify(sale));
    getNativeCieloCheckoutStatus.mockResolvedValue({ ...pixStatus(), sale: { MerchantOrderId: "456", Payment: { PaymentId: "pid-pix-old", Type: "Pix", Status: 12 } } });
    expect((await (await requestPix()).json()).status).toBe("10");
    expect(createNativeCieloCheckout).not.toHaveBeenCalled();
  });

  it("blocks checkout opened before a durable refund was registered", async () => {
    dbQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("pg_try_advisory_lock")) return { rows: [{ locked: true }] };
      if (sql.includes("FROM compra")) return { rows: [{ stcompra: "pend" }] };
      if (sql.includes("to_regclass")) return { rows: [{ installed: true }] };
      if (sql.includes("FROM public.purchase_refunds")) return { rows: [{ state: "refunded", payment_id: "pid-pix-old" }] };
      if (sql.includes("FROM pagpagseguro")) return { rows: [{ idpagseguro: "pid-pix-old", status: 7, paymentmethodtype: 11 }] };
      return { rows: [] };
    });
    expect((await (await requestPix()).json()).status).toBe("10");
    expect(createNativeCieloCheckout).not.toHaveBeenCalled();
    expect(getNativeCieloCheckoutStatus).not.toHaveBeenCalled();
  });

  it("does not interpret an unknown raw gateway status as an expired pending Pix", async () => {
    usePixLedger();
    const current = pixStatus(1, "2026-11-19T12:00:00-03:00");
    current.sale.Payment.Status = 99;
    getNativeCieloCheckoutStatus.mockResolvedValue(current);
    expect((await (await requestPix()).json()).status).toBe("10");
    expect(createNativeCieloCheckout).not.toHaveBeenCalled();
  });

  it("does not create another charge when the Pix lookup fails", async () => {
    usePixLedger();
    getNativeCieloCheckoutStatus.mockRejectedValue(new Error("gateway timeout"));
    const response = await requestPix();
    expect(response.status).toBe(200);
    expect((await response.json()).status).toBe("10");
    expect(createNativeCieloCheckout).not.toHaveBeenCalled();
  });

  it("does not switch to card while a Pix is still active", async () => {
    usePixLedger();
    getNativeCieloCheckoutStatus.mockResolvedValue(pixStatus());
    expect((await (await requestPix("CreditCard")).json()).status).toBe("10");
    expect(createNativeCieloCheckout).not.toHaveBeenCalled();
  });

  it("releases the dedicated connection without unlocking another session when checkout is locked", async () => {
    dbQuery.mockResolvedValue({ rows: [{ locked: false }] });
    expect((await (await requestPix()).json()).status).toBe("10");
    expect(release).toHaveBeenCalledTimes(1);
    expect(createNativeCieloCheckout).not.toHaveBeenCalled();
    expect(dbQuery).not.toHaveBeenCalledWith("SELECT pg_advisory_unlock($1, $2)", expect.anything());
  });

  it("rolls back persistence and releases the lock before returning a checkout error", async () => {
    applyPaymentReconciliationRecord.mockRejectedValue(new Error("database failure"));
    const response = await requestPix();
    expect(response.status).toBe(502);
    expect(dbQuery).toHaveBeenCalledWith("ROLLBACK");
    expect(dbQuery).toHaveBeenCalledWith("SELECT pg_advisory_unlock($1, $2)", [94127, 456]);
    expect(release).toHaveBeenCalledTimes(1);
    expect(runPaymentReconciliationEffects).not.toHaveBeenCalled();
  });

  it("destroys the dedicated session if advisory unlock fails", async () => {
    dbQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("pg_try_advisory_lock")) return { rows: [{ locked: true }] };
      if (sql.includes("pg_advisory_unlock")) throw new Error("unlock failed");
      if (sql.includes("FROM compra")) return { rows: [{ stcompra: "conc" }] };
      return { rows: [] };
    });
    expect((await requestPix()).status).toBe(502);
    expect(release).toHaveBeenCalledExactlyOnceWith(true);
    expect(createNativeCieloCheckout).not.toHaveBeenCalled();
  });

  it("does not switch to Pix while a card payment is still pending", async () => {
    dbQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("pg_try_advisory_lock")) return { rows: [{ locked: true }] };
      if (sql.includes("FROM pagpagseguro")) return { rows: [{ idpagseguro: "pid-card", status: 1, paymentmethodtype: 1 }] };
      if (sql.includes("FROM compra")) return { rows: [{ stcompra: "pend" }] };
      return { rows: [] };
    });
    expect((await (await requestPix()).json()).status).toBe("10");
    expect(createNativeCieloCheckout).not.toHaveBeenCalled();
  });
});
