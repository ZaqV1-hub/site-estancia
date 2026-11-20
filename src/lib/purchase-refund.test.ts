import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPurchaseRefundState, reconcilePurchaseRefund, requestPurchaseRefund } from "./purchase-refund";

const deps = vi.hoisted(() => ({ query: vi.fn(), connect: vi.fn(), sale: vi.fn(), cancel: vi.fn(), audit: vi.fn(), sync: vi.fn(), cashback: vi.fn() }));
vi.mock("@/lib/ingresso-db", () => ({ getIngressoDbPool: () => ({ query: deps.query, connect: deps.connect }) }));
vi.mock("@/lib/cielo-ecommerce", () => ({ getCieloSaleByPaymentId: deps.sale, cancelCieloPayment: deps.cancel }));
vi.mock("@/lib/ops-audit-log", () => ({ registerOpsAuditLog: deps.audit }));
vi.mock("@/lib/ticket-service", () => ({ syncTicketValidation: deps.sync }));
vi.mock("@/lib/codindica-cashback", () => ({ cancelCodindicaCashback: deps.cashback }));

const input = { purchaseId: 71, reason: "Cliente solicitou a devolução integral", actorName: "Operador", actorCpf: "52998224725" };
const paidSale = { MerchantOrderId: "71", Payment: { PaymentId: "pid-71", Type: "CreditCard", Amount: 12990, CapturedAmount: 12990, Status: 2 } };
const refundedSale = { ...paidSale, Payment: { ...paidSale.Payment, Status: 11, VoidedAmount: 12990 } };
let refund: Record<string, unknown> | null;
let purchase: Record<string, unknown>;
let vouchers: Record<string, unknown>[];
let events: string[];

beforeEach(() => {
  vi.resetAllMocks();
  refund = null;
  purchase = { idcompra: 71, tpcompra: "ponli", stcompra: "conc", vltotcompra: "129.90" };
  vouchers = [{ idvoucher: 19, stusado: "n", dtuso: null }];
  events = [];
  deps.query.mockImplementation(async (sql: string, values: unknown[] = []) => {
    events.push(sql.trim().split(/\s+/).slice(0, 3).join(" "));
    let rows: unknown[] = [];
    if (sql.includes("SELECT") && sql.includes("FROM compra")) rows = [purchase];
    else if (sql.includes("SELECT") && sql.includes("FROM purchase_refunds")) rows = refund ? [{ ...refund }] : [];
    else if (sql.includes("SELECT") && sql.includes("FROM voucher")) rows = vouchers;
    else if (sql.includes("SELECT") && sql.includes("FROM pagpagseguro")) rows = [{ idpagseguro: "pid-71", gross_amount: "129.90" }];
    else if (sql.includes("INSERT INTO purchase_refunds")) {
      refund = { purchase_id: values[0], payment_id: values[1], amount_cents: values[2], state: "pending", reason: values[3], actor_name: values[4], actor_cpf: values[5], gateway_status: null, gateway_code: null, ticket_sync_pending: false, cashback_pending: false };
      rows = [{ ...refund }];
    } else if (sql.includes("UPDATE purchase_refunds") && refund) {
      if (sql.includes("state = $2")) {
        if (!["denied", "refunded"].includes(String(refund.state))) {
          refund.state = values[1]; refund.gateway_status = values[2]; refund.gateway_code = values[3] ?? refund.gateway_code;
          if (values[1] === "refunded") { refund.ticket_sync_pending = true; refund.cashback_pending = true; }
        }
      } else if (sql.includes("ticket_sync_pending = false")) refund.ticket_sync_pending = false;
      else if (sql.includes("cashback_pending = false")) refund.cashback_pending = false;
      rows = [{ ...refund }];
    } else if (sql.includes("UPDATE compra")) purchase.stcompra = "canc";
    else if (sql.includes("UPDATE voucher")) vouchers.forEach(v => v.stusado = "inv");
    return { rows, rowCount: rows.length };
  });
  deps.connect.mockResolvedValue({ query: deps.query, release: vi.fn() });
  deps.sale.mockResolvedValue(paidSale);
  deps.cancel.mockImplementation(async () => { events.push("VOID"); return { Status: 11, ReturnCode: "9", ReasonCode: 0 }; });
  deps.sync.mockResolvedValue({ status: "sent" });
  deps.cashback.mockResolvedValue({ status: "processed" });
});

describe("full online purchase refund", () => {
  it("commits the durable intention before sending and only finalizes confirmed money", async () => {
    deps.sale.mockResolvedValueOnce(paidSale).mockResolvedValue(refundedSale);
    const result = await requestPurchaseRefund(input);
    expect(result).toMatchObject({ state: "refunded", amountCents: 12990, reconciliationPending: false });
    const insert = events.indexOf("INSERT INTO purchase_refunds");
    expect(insert).toBeGreaterThan(-1);
    expect(events.indexOf("COMMIT", insert)).toBeLessThan(events.indexOf("VOID"));
    expect(deps.cancel).toHaveBeenCalledWith("pid-71", 12990);
    expect(purchase.stcompra).toBe("canc");
    expect(vouchers[0].stusado).toBe("inv");
  });

  it("does not resend after a timeout, including another request and reconciliation", async () => {
    deps.cancel.mockRejectedValue(new Error("timeout"));
    expect((await requestPurchaseRefund(input)).state).toBe("uncertain");
    expect((await requestPurchaseRefund(input)).state).toBe("uncertain");
    expect((await reconcilePurchaseRefund(71)).state).toBe("uncertain");
    expect(deps.cancel).toHaveBeenCalledTimes(1);
    expect(purchase.stcompra).toBe("conc");
    expect(vouchers[0].stusado).toBe("n");
  });

  it("recovers confirmation after losing the cancellation response", async () => {
    deps.cancel.mockRejectedValue(new Error("connection reset"));
    await requestPurchaseRefund(input);
    deps.sale.mockResolvedValue(refundedSale);
    expect((await reconcilePurchaseRefund(71)).state).toBe("refunded");
    expect(deps.cancel).toHaveBeenCalledTimes(1);
    expect(purchase.stcompra).toBe("canc");
  });

  it("leaves scheduled Pix pending without canceling the purchase", async () => {
    deps.sale.mockResolvedValueOnce({ ...paidSale, Payment: { ...paidSale.Payment, Type: "Pix", Provider: "Cielo2" } })
      .mockResolvedValue({ ...refundedSale, Payment: { ...refundedSale.Payment, Refunds: [{ Status: "Scheduled", Amount: 12990 }] } });
    expect((await requestPurchaseRefund(input)).state).toBe("pending");
    expect(purchase.stcompra).toBe("conc");
  });

  it("records an explicit rejection without altering payment or tickets", async () => {
    deps.cancel.mockResolvedValue({ ReasonCode: 7, ReasonMessage: "Denied" });
    expect((await requestPurchaseRefund(input)).state).toBe("denied");
    await requestPurchaseRefund(input);
    expect(deps.cancel).toHaveBeenCalledTimes(1);
    expect(purchase.stcompra).toBe("conc");
  });

  it.each(["s", "with-date"])("rejects used tickets (%s) before contacting the gateway", async status => {
    if (status === "s") vouchers[0].stusado = "s";
    else vouchers[0].dtuso = "2026-11-20";
    await expect(requestPurchaseRefund(input)).rejects.toMatchObject({ code: "refund_voucher_used" });
    expect(deps.cancel).not.toHaveBeenCalled();
    expect(refund).toBeNull();
  });

  it("rejects non-online purchases and mismatching gateway totals", async () => {
    purchase.tpcompra = "bilhe";
    await expect(requestPurchaseRefund(input)).rejects.toMatchObject({ code: "refund_purchase_ineligible" });
    purchase.tpcompra = "ponli";
    deps.sale.mockResolvedValue({ ...paidSale, Payment: { ...paidSale.Payment, Amount: 100 } });
    await expect(requestPurchaseRefund(input)).rejects.toMatchObject({ code: "refund_payment_mismatch" });
    expect(deps.cancel).not.toHaveBeenCalled();
  });

  it("retains failed external invalidation for reconciliation without another refund", async () => {
    deps.sale.mockResolvedValueOnce(paidSale).mockResolvedValue(refundedSale);
    deps.sync.mockRejectedValueOnce(new Error("ticket service offline"));
    expect((await requestPurchaseRefund(input)).reconciliationPending).toBe(true);
    expect((await getPurchaseRefundState(71))?.reconciliationPending).toBe(true);
    expect((await reconcilePurchaseRefund(71)).reconciliationPending).toBe(false);
    expect(deps.cancel).toHaveBeenCalledTimes(1);
  });

  it("never resends an intention persisted by a process that crashed before sending", async () => {
    refund = { purchase_id: 71, payment_id: "pid-71", amount_cents: 12990, state: "pending", reason: input.reason, actor_name: input.actorName, actor_cpf: null, gateway_status: null, gateway_code: null, ticket_sync_pending: false, cashback_pending: false };
    expect((await requestPurchaseRefund(input)).state).toBe("pending");
    expect(deps.cancel).not.toHaveBeenCalled();
  });

  it("does not send money when persisting the intention or its audit fails", async () => {
    deps.audit.mockRejectedValueOnce(new Error("audit storage unavailable"));
    await expect(requestPurchaseRefund(input)).rejects.toThrow("audit storage unavailable");
    expect(deps.cancel).not.toHaveBeenCalled();
    expect(events).toContain("ROLLBACK");
  });

  it("recognizes the typed Cielo business rejection but not a server failure", async () => {
    deps.cancel.mockRejectedValue(Object.assign(new Error("Cielo refused"), { status: 400, code: "311" }));
    expect((await requestPurchaseRefund(input)).state).toBe("denied");
    expect(purchase.stcompra).toBe("conc");
  });

  it("keeps 5xx uncertain even when the body contains a rejection-like code", async () => {
    deps.cancel.mockRejectedValue(Object.assign(new Error("gateway failed"), { status: 502, code: "311" }));
    expect((await requestPurchaseRefund(input)).state).toBe("uncertain");
  });

  it("releases the refund block after a definitive asynchronous full rejection", async () => {
    await requestPurchaseRefund(input);
    deps.sale.mockResolvedValue({ ...paidSale, Payment: { ...paidSale.Payment, Refunds: [{ Status: 4, Amount: 12990 }] } });
    expect((await reconcilePurchaseRefund(71)).state).toBe("denied");
    expect(purchase.stcompra).toBe("conc");
    expect(vouchers[0].stusado).toBe("n");
  });

  it("retains cashback recovery after the monetary refund is confirmed", async () => {
    deps.sale.mockResolvedValueOnce(paidSale).mockResolvedValue(refundedSale);
    deps.cashback.mockRejectedValueOnce(new Error("cashback unavailable"));
    expect((await requestPurchaseRefund(input)).reconciliationPending).toBe(true);
    expect((await reconcilePurchaseRefund(71)).reconciliationPending).toBe(false);
    expect(deps.cancel).toHaveBeenCalledTimes(1);
  });
});
