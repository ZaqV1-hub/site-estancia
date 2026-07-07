import { describe, expect, it } from "vitest";
import {
  buildPurchaseDateStepHref,
  sanitizePurchaseDraft,
} from "@/components/purchase-page";

describe("PurchasePage helpers", () => {
  it("monta o retorno para a agenda com mes, ano e data selecionada", () => {
    expect(buildPurchaseDateStepHref(19, "2026-07-05")).toBe(
      "/agenda?mes=07&ano=2026&agendaId=19",
    );
  });

  it("restaura apenas itens ainda disponiveis no rascunho da compra", () => {
    const draft = sanitizePurchaseDraft(
      {
        step: "review",
        quantities: {
          passport: 2,
          addon: 1,
          expired: 3,
        },
        codindica: "ABC123",
        appliedCodindica: "ABC123",
        appliedDiscount: "10.00",
      },
      [
        {
          id: "passport",
          type: "passport",
          title: "Passaporte",
          subtitle: "",
          description: "",
          imageSrc: "/passport.jpg",
          sitePrice: "49.90",
          boxOfficePrice: "0.00",
          voucherType: "norma",
          voucherPrefix: "A",
          active: true,
        },
        {
          id: "addon",
          type: "addon",
          title: "Adicional",
          subtitle: "",
          description: "",
          imageSrc: "/addon.jpg",
          sitePrice: "15.00",
          boxOfficePrice: "0.00",
          voucherType: "espec",
          voucherPrefix: "E",
          active: true,
        },
      ],
    );

    expect(draft).toMatchObject({
      step: "review",
      quantities: {
        passport: 2,
        addon: 1,
      },
      codindica: "ABC123",
      appliedCodindica: "ABC123",
      appliedDiscount: "10.00",
    });
    expect(draft?.quantities).not.toHaveProperty("expired");
  });
});
