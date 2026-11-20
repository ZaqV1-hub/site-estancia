export type RefundState = "pending" | "uncertain" | "refunded" | "denied";

export class PurchaseRefundError extends Error {
  constructor(public code: string, message: string, public status = 409) {
    super(message);
    this.name = "PurchaseRefundError";
  }
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function integer(value: unknown): number | null {
  if (typeof value !== "number" && !(typeof value === "string" && /^\d+$/.test(value))) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : null;
}

export function refundAmountCents(value: string): number {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) throw new PurchaseRefundError("refund_amount_invalid", "Valor da compra inválido para estorno.");
  const [whole, fraction = ""] = value.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents) || cents <= 0) throw new PurchaseRefundError("refund_amount_invalid", "Valor da compra inválido para estorno.");
  return cents;
}

export function inspectRefundPayment(payload: unknown, expected: { purchaseId: number; paymentId: string; amountCents: number }) {
  const sale = object(payload);
  const payment = object(sale.Payment);
  if (String(sale.MerchantOrderId ?? "") !== String(expected.purchaseId)
    || payment.PaymentId !== expected.paymentId
    || integer(payment.Amount) !== expected.amountCents
    || (payment.CapturedAmount != null && integer(payment.CapturedAmount) !== expected.amountCents)
    || (payment.Currency != null && payment.Currency !== "BRL")) {
    throw new PurchaseRefundError("refund_payment_mismatch", "Pagamento, compra ou valor divergente na Cielo. Confira a transação antes de estornar.");
  }
  const status = integer(payment.Status);
  const voidedAmount = payment.VoidedAmount == null ? 0 : integer(payment.VoidedAmount);
  const refunds = Array.isArray(payment.Refunds) ? payment.Refunds.map(object) : [];
  const validRefundShape = payment.Refunds == null || Array.isArray(payment.Refunds);
  const scheduled = refunds.some(refund => ["1", "2", "scheduled", "pending"].includes(String(refund.Status).toLowerCase()));
  const type = payment.Type;
  const cieloPix = payment.Provider === "Cielo2" || (payment.Provider == null && typeof payment.EndToEndId === "string" && payment.EndToEndId.trim().length > 0);
  const supported = type === "CreditCard" || type === "DebitCard" || (type === "Pix" && cieloPix);
  const denied = status === 2 && voidedAmount === 0 && refunds.length === 1
    && ["4", "denied"].includes(String(refunds[0].Status).toLowerCase())
    && integer(refunds[0].Amount) === expected.amountCents;
  const conflictingRefund = !validRefundShape || refunds.some(refund =>
    !["3", "success", "confirmed"].includes(String(refund.Status).toLowerCase())
    || integer(refund.Amount) !== expected.amountCents) || refunds.length > 1;
  // Cielo defines Pix Payment.Status=11 as a full return; its query can omit VoidedAmount.
  const confirmedFullRefund = refunds.length === 1 && !conflictingRefund;
  const fullAmount = voidedAmount === expected.amountCents
    || (payment.VoidedAmount == null && (confirmedFullRefund || (type === "Pix" && status === 11)));
  const state: RefundState = scheduled ? "pending"
    : supported && (status === 10 || status === 11) && fullAmount && !conflictingRefund ? "refunded"
    : denied ? "denied"
    : "uncertain";
  return {
    state,
    status,
    canRequest: supported && status === 2 && voidedAmount === 0 && refunds.length === 0 && validRefundShape,
  };
}

// An accepted or scheduled void is not proof that the buyer received the money.
export function refundResponseState(payload: unknown): Exclude<RefundState, "refunded"> {
  const response = object(payload);
  const code = String(response.Code ?? response.ReturnCode ?? "");
  const reason = integer(response.ReasonCode);
  if (["309", "310", "311", "312"].includes(code) || reason === 7 || reason === 2) return "denied";
  if (reason === 8 || reason === 9 || integer(response.Status) === 10 || integer(response.Status) === 11) return "pending";
  return "uncertain";
}
