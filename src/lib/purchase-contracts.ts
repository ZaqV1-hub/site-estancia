import type { ReservationAgendaDetail } from "@/lib/reservation-contracts";

export type PurchasePricingMode = "dia" | "conve" | "socio";

export type PurchasePricing = {
  mode: PurchasePricingMode;
  label: string;
  discountedNormal: string;
  discountedChild: string;
  standardNormal: string;
  standardChild: string;
  discountedRemaining: number;
};

export type PurchaseAgendaDetail = ReservationAgendaDetail & {
  pricing: PurchasePricing;
};

export type CreatePurchaseRequest = {
  agendaId: number;
  codindica?: string;
  quantities: {
    discountedNormal: number;
    discountedChild: number;
    normal: number;
    child: number;
    exempt: number;
  };
};

export type CreatePurchaseResponse = {
  ok: true;
  data: {
    purchaseId: number;
    legacyEncodedId: string;
    totalValue: string;
    voucherCount: number;
    checkoutRedirect: string;
  };
};
