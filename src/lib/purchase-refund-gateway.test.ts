import { describe, expect, it } from "vitest";
import { inspectRefundPayment, refundAmountCents, refundResponseState } from "./purchase-refund-gateway";

const expected = { purchaseId: 71, paymentId: "payment-71", amountCents: 12990 };
const sale = (payment: Record<string, unknown> = {}) => ({
  MerchantOrderId: "71",
  Payment: { PaymentId: "payment-71", Type: "CreditCard", Amount: 12990, CapturedAmount: 12990, Status: 2, ...payment },
});

describe("refund gateway evidence", () => {
  it("uses exact cents and rejects rounded or malformed money", () => {
    expect(refundAmountCents("129.90")).toBe(12990);
    for (const value of ["1.001", "-2", "0", "1e2", "129,90", "9007199254740992"]) {
      expect(() => refundAmountCents(value)).toThrow();
    }
  });

  it("requires matching merchant order, payment and full captured amount", () => {
    expect(inspectRefundPayment(sale(), expected).canRequest).toBe(true);
    for (const payload of [
      { ...sale(), MerchantOrderId: "72" }, sale({ PaymentId: "other" }),
      sale({ Amount: 100 }), sale({ CapturedAmount: 100 }), sale({ Currency: "USD" }),
    ]) expect(() => inspectRefundPayment(payload, expected)).toThrow();
  });

  it("never requests again for partial refunds or unsupported payment methods", () => {
    expect(inspectRefundPayment(sale({ VoidedAmount: 10 }), expected).canRequest).toBe(false);
    expect(inspectRefundPayment(sale({ Refunds: [{ Status: 4, Amount: 12990 }] }), expected).canRequest).toBe(false);
    expect(inspectRefundPayment(sale({ Type: "Boleto" }), expected).canRequest).toBe(false);
  });

  it("requires final status and full returned amount to confirm", () => {
    expect(inspectRefundPayment(sale({ Status: 11, VoidedAmount: 12990 }), expected).state).toBe("refunded");
    expect(inspectRefundPayment(sale({ Status: 10, VoidedAmount: 12990 }), expected).state).toBe("refunded");
    expect(inspectRefundPayment(sale({ Status: 11 }), expected).state).toBe("uncertain");
    expect(inspectRefundPayment(sale({ Status: 11, Refunds: [{ Status: 3, Amount: 12990 }] }), expected).state).toBe("refunded");
    expect(inspectRefundPayment(sale({ Status: 11, Refunds: [{ Status: 3, Amount: 100 }] }), expected).state).toBe("uncertain");
    expect(inspectRefundPayment(sale({ Status: 11, VoidedAmount: 100 }), expected).state).toBe("uncertain");
  });

  it("keeps scheduled Pix pending despite a payment refund status", () => {
    expect(inspectRefundPayment(sale({ Type: "Pix", Provider: "Cielo2" }), expected).canRequest).toBe(true);
    expect(inspectRefundPayment(sale({ Type: "Pix", EndToEndId: "E12345678202611200000example" }), expected).canRequest).toBe(true);
    expect(inspectRefundPayment(sale({ Type: "Pix", Provider: "Other" }), expected).canRequest).toBe(false);
    expect(inspectRefundPayment(sale({ Type: "Pix", Provider: "Cielo2", Status: 11, VoidedAmount: 12990, Refunds: [{ Status: "Scheduled", Amount: 12990 }] }), expected).state).toBe("pending");
  });

  it("recognizes a final full Pix return when the documented query omits VoidedAmount", () => {
    expect(inspectRefundPayment(sale({ Type: "Pix", Status: 11, EndToEndId: "E123" }), expected).state).toBe("refunded");
    expect(inspectRefundPayment(sale({ Type: "Pix", Status: 11, EndToEndId: "E123", Refunds: [{ Status: 3, Amount: 100 }] }), expected).state).toBe("uncertain");
  });

  it("recognizes only an unambiguous rejection of the full requested amount", () => {
    expect(inspectRefundPayment(sale({ Refunds: [{ Status: 4, Amount: 12990 }] }), expected).state).toBe("denied");
    expect(inspectRefundPayment(sale({ Refunds: [{ Status: 4, Amount: 100 }] }), expected).state).toBe("uncertain");
    expect(inspectRefundPayment(sale({ Refunds: [{ Status: 4, Amount: 12990 }, { Status: 1, Amount: 12990 }] }), expected).state).toBe("pending");
    expect(inspectRefundPayment(sale({ Refunds: {} }), expected).canRequest).toBe(false);
  });

  it("does not treat an accepted cancellation response as returned money", () => {
    expect(refundResponseState({ Status: 11, ReturnCode: "0", ReasonCode: 8 })).toBe("pending");
    expect(refundResponseState({ Status: 10, ReturnCode: "9", ReasonCode: 0 })).toBe("pending");
    expect(refundResponseState({ ReasonCode: 7 })).toBe("denied");
    expect(refundResponseState({ Code: 311 })).toBe("denied");
    expect(refundResponseState({ ReasonCode: 4 })).toBe("uncertain");
    expect(refundResponseState(null)).toBe("uncertain");
  });
});
