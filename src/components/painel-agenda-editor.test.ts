import { describe, expect, it } from "vitest";
import { buildPainelAgendaEditorDefaultForm } from "@/components/painel-agenda-editor";
import type { PainelAgendaScreenData } from "@/lib/painel-agenda";

describe("PainelAgendaEditor defaults", () => {
  it("mantem status e tabela ao carregar uma agenda fechada para edicao", () => {
    const data: PainelAgendaScreenData = {
      month: 7,
      year: 2026,
      entries: [],
      selectedDate: "2026-07-01",
      selectedDay: {
        selectedDate: "2026-07-01",
        vouchers: [],
        selectedPassportIds: [],
        selectedAddonIds: [],
        agenda: {
          id: 14,
          date: "2026-07-01",
          day: 1,
          month: 7,
          year: 2026,
          type: "padra",
          typeLabel: "Data padrão",
          status: "fec",
          statusLabel: "Fechada",
          priceTableId: 9,
          priceTableName: "Teste voucher",
          normalValue: "49.90",
          childValue: "39.90",
          informationId: 3,
          informationName: "Informacao",
          promotionName: null,
          promotionDescription: null,
        },
      },
      priceTables: [{ id: 9, label: "Teste voucher" }],
      informationOptions: [{ id: 3, label: "Informacao" }],
    };

    expect(buildPainelAgendaEditorDefaultForm(data)).toMatchObject({
      startDate: "2026-07-01",
      endDate: "2026-07-01",
      status: "fec",
      priceTableId: 9,
      informationId: 3,
    });
  });
});
