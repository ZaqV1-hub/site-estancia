import { reconcilePaymentFromGatewayPayload } from "@/lib/payment-reconciliation";

type CheckoutSandboxConfirmationParams = {
  purchaseId: number;
  amount: string;
  cpf: string;
  name: string;
  email: string | null;
  phone: string | null;
  paymentType: "CreditCard" | "Pix";
};

function digitsOnly(value: string | null | undefined) {
  return String(value ?? "").replace(/\D+/g, "");
}

function fallbackNumericString(value: string, fallback: string) {
  return value.trim() === "" ? fallback : value;
}

function buildMockPaymentCode(paymentType: "CreditCard" | "Pix", purchaseId: number) {
  const suffix = `${purchaseId}-${Date.now()}`;

  return paymentType === "Pix" ? `mock-pix-${suffix}` : `mock-card-${suffix}`;
}

export async function confirmSandboxCheckout({
  purchaseId,
  amount,
  cpf,
  name,
  email,
  phone,
  paymentType,
}: CheckoutSandboxConfirmationParams) {
  const code = buildMockPaymentCode(paymentType, purchaseId);
  const now = new Date().toISOString();
  const phoneDigits = digitsOnly(phone);
  const areaCode = phoneDigits.slice(0, 2);
  const phoneNumber = phoneDigits.slice(2);

  const payload = {
    code,
    reference: String(purchaseId),
    status: 3,
    date: now,
    lastEventDate: now,
    grossAmount: amount,
    discountAmount: "0.00",
    feeAmount: "0.00",
    netAmount: amount,
    extraAmount: "0.00",
    installmentCount: 1,
    paymentMethod: {
      type: paymentType === "Pix" ? 11 : 1,
      code: paymentType === "Pix" ? 0 : 101,
    },
    sender: {
      email: email ?? "",
      name,
      phone: {
        areaCode: fallbackNumericString(areaCode, "0"),
        number: fallbackNumericString(phoneNumber, "0"),
      },
    },
    shipping: {
      type: 3,
      cost: "0.00",
      address: {
        street: "",
        number: "",
        district: "",
        city: "",
        state: "",
        country: "BRA",
        postalCode: "0",
      },
    },
    document: digitsOnly(cpf),
    xml: JSON.stringify({
      sandbox: true,
      purchaseId,
      paymentType,
      code,
    }),
  };

  return reconcilePaymentFromGatewayPayload(payload, purchaseId);
}
