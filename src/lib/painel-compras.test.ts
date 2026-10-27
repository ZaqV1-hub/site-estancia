import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildPainelPurchaseListWhere,
  buildPainelPurchaseVoucherListWhere,
  decodeLegacyPurchaseId,
  getPainelPurchaseDetail,
  getPainelPurchaseGatewayConsult,
  listPainelPurchaseVouchers,
  listPainelPurchases,
  mapPainelPurchaseListExportRows,
  mapPainelPurchaseVoucherListExportRows,
  normalizePainelPurchaseListFilters,
  normalizePainelPurchaseVoucherListFilters,
  type PainelPurchaseListResult,
  type PainelPurchaseVoucherListResult,
} from "@/lib/painel-compras";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  readEstanciaContent: vi.fn(),
  getNativeCieloCheckoutStatus: vi.fn(),
  isCieloEcommerceConfigured: vi.fn(),
  normalizePaymentReconciliationPayload: vi.fn(),
}));

vi.mock("@/lib/estancia-content-store", () => ({ readEstanciaContent: mocks.readEstanciaContent }));

vi.mock("@/lib/ingresso-db", () => ({
  getIngressoDbPool: () => ({
    query: mocks.query,
  }),
}));

vi.mock("@/lib/cielo-ecommerce", () => ({
  getNativeCieloCheckoutStatus: mocks.getNativeCieloCheckoutStatus,
  isCieloEcommerceConfigured: mocks.isCieloEcommerceConfigured,
}));

vi.mock("@/lib/payment-reconciliation", () => ({
  normalizePaymentReconciliationPayload: mocks.normalizePaymentReconciliationPayload,
}));

function normalizeSql(sql: string) {
  return sql.replace(/\s+/g, " ").trim();
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.readEstanciaContent.mockResolvedValue({ products: [] });
  mocks.isCieloEcommerceConfigured.mockReturnValue(true);
});

describe("normalizePainelPurchaseListFilters", () => {
  it("accepts only supported origins and voucher statuses and preserves a combined search", () => {
    expect(normalizePainelPurchaseListFilters({ origin: "site", voucherStatus: "rescheduled", search: "Maria" }))
      .toMatchObject({ origin: "site", voucherStatus: "rescheduled", search: "Maria" });
    expect(normalizePainelPurchaseListFilters({ origin: "unknown", voucherStatus: "unknown" }))
      .toMatchObject({ origin: null, voucherStatus: null });
  });

  it("keeps legacy purchase filter fields in the compras contract shape", () => {
    const filters = normalizePainelPurchaseListFilters({
      "dtcompra[de]": "01/05/2026",
      "dtcompra[ate]": "07/05/2026",
      idcompra: "551",
      formapag: "pix",
    });

    expect(filters.purchaseId).toBe("551");
    expect(filters.dateFrom).toBe("01/05/2026");
    expect(filters.dateTo).toBe("07/05/2026");
    expect(filters.ticketPaymentMethod).toBe("pix");
  });
});

describe("normalizePainelPurchaseVoucherListFilters", () => {
  it("mantem o contrato legado de filtros da lista de vouchers", () => {
    const filters = normalizePainelPurchaseVoucherListFilters({
      idvoucher: "9001",
      "dtcompra[de]": "01/05/2026",
      "dtagenda[ate]": "09/05/2026",
      tpcompra: "parq",
      stusado: "s",
    });

    expect(filters).toEqual({
      voucherId: "9001",
      purchaseDateFrom: "01/05/2026",
      purchaseDateTo: null,
      usedDateFrom: null,
      usedDateTo: null,
      visitDateFrom: null,
      visitDateTo: "09/05/2026",
      voucherType: null,
      purchaseLocation: "parq",
      purchaseStatus: null,
      usedStatus: "s",
    });
  });
});

describe("buildPainelPurchaseListWhere", () => {
  it("restricts calendar context to completed purchases with an active public agenda voucher in range", () => {
    const { sql } = buildPainelPurchaseListWhere({ calendar: "1", visitDateFrom: "2026-11-01", visitDateTo: "2026-11-01" });
    expect(sql).toContain("compra.stcompra = 'conc'");
    expect(sql).toContain("visit_agenda.tpagenda IN ('padra', 'promo')");
    expect(sql).toContain("visit_voucher.stusado IS DISTINCT FROM 'inv'");
    expect(sql).toContain("visit_agenda.dtagenda >= TO_DATE('01/11/2026'");
    expect(sql).toContain("visit_agenda.dtagenda <= TO_DATE('01/11/2026'");
    expect(buildPainelPurchaseListWhere({}).sql).toBe("");
    expect(normalizePainelPurchaseListFilters({ calendar: "1" }).calendar).toBe("1");
    expect(normalizePainelPurchaseListFilters({ calendar: "other" }).calendar).toBeNull();
  });

  it("filters mixed-date purchases by an eligible voucher rather than their first visit", () => {
    const { sql } = buildPainelPurchaseListWhere({
      visitDateFrom: "2026-11-01", visitDateTo: "01/11/2026",
    });
    expect(normalizeSql(sql)).toBe(normalizeSql(`EXISTS (
      SELECT 1 FROM voucher visit_voucher
      JOIN agenda visit_agenda ON visit_agenda.idagenda = visit_voucher.idagenda
      WHERE visit_voucher.idcompra = compra.idcompra
        AND visit_voucher.stusado IS DISTINCT FROM 'inv'
        AND visit_agenda.dtagenda >= TO_DATE('01/11/2026', 'DD/MM/YYYY')
        AND visit_agenda.dtagenda <= TO_DATE('01/11/2026', 'DD/MM/YYYY')
    )`));
    expect(sql).not.toContain("MIN(");
  });

  it.each([
    ["rescheduled", "a.rescheduled"],
    ["used", "NOT a.rescheduled AND a.all_used"],
    ["available", "NOT a.rescheduled AND NOT a.all_used"],
  ])("filters %s with the same status precedence as the purchase rows", (voucherStatus, clause) => {
    expect(buildPainelPurchaseListWhere({ voucherStatus }).sql).toBe(`(compra.stcompra = 'conc' AND ${clause})`);
  });

  it("keeps origin separate from the legacy purchase type and financial status", () => {
    const { sql } = buildPainelPurchaseListWhere({ origin: "bilheteria", purchaseStatus: "conc", gatewayStatus: "3" });
    expect(sql).toContain("compra.tpcompra IN ('bilhe', 'reser')");
    expect(sql).toContain("compra.stcompra = 'conc'");
    expect(sql).toContain("pagpagseguro.status = '3'");
    expect(buildPainelPurchaseListWhere({ origin: "site" }).sql).toContain("compra.tpcompra = 'ponli'");
  });

  it("builds the legacy corte clause with grouped bilheteria fallback and courtesy semantics", () => {
    const { sql } = buildPainelPurchaseListWhere({
      ticketPaymentMethod: "corte",
    });

    expect(normalizeSql(sql)).toBe(
      normalizeSql(`((compra.tpcompra = 'bilhe' AND (
        EXISTS (
          SELECT 1
          FROM compra_pagamentos cp
          WHERE cp.idcompra = compra.idcompra
            AND cp.forma_pagamento = 'corte'
        )
        OR (
          NOT EXISTS (
            SELECT 1
            FROM compra_pagamentos cp2
            WHERE cp2.idcompra = compra.idcompra
          )
          AND compra.formapag = 'corte'
        ) OR COALESCE(compra.vltotcompra,0) = 0
      )) OR (compra.tpcompra <> 'bilhe' AND compra.formapag = 'corte'))`),
    );
  });

  it("keeps the non-corte bilheteria clause grouped without the courtesy fallback", () => {
    const { sql } = buildPainelPurchaseListWhere({
      ticketPaymentMethod: "pix",
    });

    expect(normalizeSql(sql)).toBe(
      normalizeSql(`((compra.tpcompra = 'bilhe' AND (
        EXISTS (
          SELECT 1
          FROM compra_pagamentos cp
          WHERE cp.idcompra = compra.idcompra
            AND cp.forma_pagamento = 'pix'
        )
        OR (
          NOT EXISTS (
            SELECT 1
            FROM compra_pagamentos cp2
            WHERE cp2.idcompra = compra.idcompra
          )
          AND compra.formapag = 'pix'
        )
      )) OR (compra.tpcompra <> 'bilhe' AND compra.formapag = 'pix'))`),
    );
  });

  it("builds simple scalar, text, and date clauses for the broader purchase list contract", () => {
    const { sql } = buildPainelPurchaseListWhere({
      purchaseId: "551",
      type: "bilhe",
      purchaseStatus: "conc",
      gatewayPaymentMethod: "4",
      gatewayStatus: "3",
      cpf: "123.456.789-00",
      userName: "Maria Silva",
      dateFrom: "01/05/2026",
      dateTo: "07/05/2026",
    });

    expect(normalizeSql(sql)).toBe(
      normalizeSql(`compra.idcompra = 551
        AND compra.tpcompra = 'bilhe'
        AND compra.stcompra = 'conc'
        AND pagpagseguro.paymentmethodtype = '4'
        AND pagpagseguro.status = '3'
        AND usuario.cpf = '12345678900'
        AND usuario.nmusuario ILIKE '%Maria Silva%'
        AND compra.dtcompra >= TO_DATE('01/05/2026', 'DD/MM/YYYY')
        AND compra.dtcompra <= TO_DATE('07/05/2026', 'DD/MM/YYYY')`),
    );
  });

  it("searches buyer or exact numeric purchase ID and escapes SQL and wildcard input", () => {
    const numeric = buildPainelPurchaseListWhere({ search: "551" }).sql;
    expect(numeric).toBe("(compra.idcompra = 551 OR usuario.nmusuario ILIKE '%551%')");
    const text = buildPainelPurchaseListWhere({ search: "D'Ávila_100%" }).sql;
    expect(text).toContain("D''Ávila\\_100\\%");
    expect(text).not.toContain("compra.idcompra =");
  });

  it("skips the legacy bilheteria payment clause for the all-methods sentinel", () => {
    const { sql } = buildPainelPurchaseListWhere({
      ticketPaymentMethod: "-1",
    });

    expect(sql).toBe("");
  });
});

describe("buildPainelPurchaseVoucherListWhere", () => {
  it("aplica o mapeamento legado de onde/site-reserva-parque", () => {
    const { sql } = buildPainelPurchaseVoucherListWhere({
      voucherId: "9001",
      purchaseDateFrom: "01/05/2026",
      purchaseDateTo: null,
      usedDateFrom: null,
      usedDateTo: null,
      visitDateFrom: null,
      visitDateTo: null,
      voucherType: "escol",
      purchaseLocation: "parq",
      purchaseStatus: "conc",
      usedStatus: "n",
    });

    expect(normalizeSql(sql)).toBe(
      normalizeSql(`voucher.idvoucher = 9001
        AND c.dtcompra >= TO_DATE('01/05/2026', 'DD/MM/YYYY')
        AND voucher.tpvoucher = 'escol'
        AND c.tpcompra = 'bilhe'
        AND c.stcompra = 'conc'
        AND voucher.stusado = 'n'`),
    );
  });
});

describe("decodeLegacyPurchaseId", () => {
  it("decodes a legacy base64 purchase identifier", () => {
    expect(decodeLegacyPurchaseId("MTIz")).toBe(123);
  });
});

describe("mapPainelPurchaseListExportRows", () => {
  it("keeps the legacy list-principal column order for xls export", () => {
    const result: PainelPurchaseListResult = {
      items: [
        {
          purchaseId: 551,
          purchaseDate: "06/05/2026",
          paymentDate: "07/05/2026",
          paymentTime: "14:32:11",
          visitDate: null,
          type: "ponli",
          typeLabel: "Compra",
          status: "conc",
          statusLabel: "Concluída",
          paymentMethodLabel: "PIX",
          paymentLabel: "Paga",
          cpf: "12345678901",
          userName: "DEV",
          totalValue: "80,00",
        },
      ],
      total: 1,
      page: 1,
      perPage: 30,
      totalPages: 1,
      filters: {
        purchaseId: null,
        type: null,
        purchaseStatus: null,
        ticketPaymentMethod: null,
        gatewayPaymentMethod: null,
        gatewayStatus: null,
        cpf: null,
        userName: null,
        dateFrom: null,
        dateTo: null,
        visitDateFrom: null,
        visitDateTo: null,
      },
    };

    expect(mapPainelPurchaseListExportRows(result)).toEqual([
      [
        "ID",
        "Data",
        "Tipo",
        "Status",
        "Pagamento",
        "Data de pagamento",
        "Hora de pagamento",
        "Valor",
        "CPF",
        "Usuário",
      ],
      [
        "551",
        "06/05/2026",
        "Compra",
        "Concluída",
        "Paga",
        "07/05/2026",
        "14:32:11",
        "80,00",
        "12345678901",
        "DEV",
      ],
    ]);
  });
});

describe("mapPainelPurchaseVoucherListExportRows", () => {
  it("preserva as colunas legadas da exportacao de vouchers", () => {
    const result: PainelPurchaseVoucherListResult = {
      items: [
        {
          purchaseId: 551,
          voucherId: 9001,
          voucherNumber: "ABC-123",
          purchaseDate: "06/05/2026",
          visitDate: "08/05/2026",
          ticketTypeLabel: "Passaporte",
          name: "Cliente Teste",
          location: "ponli",
          locationLabel: "SITE",
          unitValue: "40,00",
          purchaseStatusLabel: "Concluída",
          usedLabel: "Não",
          usedDate: null,
          usedTime: null,
          purchaseTypeLabel: "Compra",
        },
      ],
      total: 1,
      page: 1,
      perPage: 100,
      totalPages: 1,
      filters: {
        voucherId: null,
        purchaseDateFrom: null,
        purchaseDateTo: null,
        usedDateFrom: null,
        usedDateTo: null,
        visitDateFrom: null,
        visitDateTo: null,
        voucherType: null,
        purchaseLocation: null,
        purchaseStatus: null,
        usedStatus: null,
      },
      indicators: {
        qtdnormal_site: 1,
        vlnormal_site: "40,00",
        qtdinfantil_site: 0,
        vlinfantil_site: "0,00",
        qtdnormal_parque: 0,
        vlnormal_parque: "0,00",
        qtdinfantil_parque: 0,
        vlinfantil_parque: "0,00",
        qtdescola: 0,
        vlescola: "0,00",
        qtdadulto_reserva: 0,
        vladulto_reserva: "0,00",
        qtdinfantil_reserva: 0,
        vlinfantil_reserva: "0,00",
        qtespecial: 0,
        vlespecial: "0,00",
        qtdcortesia: 0,
        qtdisento: 0,
        totalCount: 1,
        totalValue: "40,00",
      },
    };

    expect(mapPainelPurchaseVoucherListExportRows(result)).toEqual([
      [
        "ID",
        "Voucher",
        "Data Visita",
        "Passaporte",
        "Tipo Compra",
        "Valor",
        "Usado",
        "Data de uso",
        "Hora de uso",
      ],
      ["9001", "ABC-123", "08/05/2026", "Passaporte", "Compra", "40,00", "Não", "-", "-"],
    ]);
  });
});

describe("listPainelPurchases", () => {
  it("allocates discounted cents and free vouchers across visits using the calendar catalogue", async () => {
    const voucher = (idvoucher: number, date: string, tpvoucher: string, descricao: string, vlunicompra: string, vldesc = "0.00") => ({
      idvoucher, idcompra: 551, cpf: "123", nmusuario: "Cliente", email: null,
      tpcompra: "ponli", stcompra: "conc", date, numvoucher: String(idvoucher), tpvoucher, descricao,
      vlunicompra, vldesc, vltotcompra: "0.05", stusado: "n", dtvalidade: null, original_date: null, reason: null,
    });
    const vouchers = [
      voucher(1, "2026-11-01", "norma", "Passaporte", "0.03", "0.01"),
      voucher(2, "2026-11-02", "norma", "Passaporte", "0.03", "0.01"),
      voucher(3, "2026-11-01", "espec", "Passaporte especial Dia das Crianças", "0.02"),
      voucher(4, "2026-11-01", "isent", "Isento", "0.00"),
      voucher(5, "2026-11-01", "espec", "Café", "0.02"),
      voucher(6, "2026-11-02", "espec", "Ingresso VIP", "0.00"),
      voucher(7, "2026-11-01", "norma", "Kit lanche", "0.00"),
    ];
    mocks.readEstanciaContent.mockResolvedValue({ products: [
      { id: "vip", title: "Ingresso VIP", type: "passport" },
      { id: "kit", title: "Kit lanche", type: "addon" },
    ] });
    mocks.query.mockImplementation(async (sql: string) => ({ rows:
      sql.includes("COUNT(*)::text AS total") ? [{ total: "1" }] :
      sql.includes("FROM voucher v\n") ? vouchers : [{ idcompra: 551, stcompra: "conc", tpcompra: "ponli", vltotcompra: "0.05", voucher_count: "4" }],
    }));
    const first = await listPainelPurchases({ filters: { "dtagenda[de]": "2026-11-01", "dtagenda[ate]": "2026-11-01" } });
    const second = await listPainelPurchases({ filters: { "dtagenda[de]": "2026-11-02", "dtagenda[ate]": "2026-11-02" } });
    expect(first.items).toHaveLength(1);
    expect(second.items).toHaveLength(1);
    expect(first.items[0]).toMatchObject({ people: 3, totalValue: "0,05", visitValue: "0,04" });
    expect(second.items[0]).toMatchObject({ people: 2, totalValue: "0,05", visitValue: "0,01" });
    // The existing export's financial amount remains the complete purchase value.
    expect(mapPainelPurchaseListExportRows(first)[1][7]).toBe("0,05");
  });

  it.each(["pend", "canc"])("classifies pending/canceled vouchers without changing %s financial status or amount", async (stcompra) => {
    mocks.query.mockImplementation(async (sql: string) => ({ rows:
      sql.includes("COUNT(*)::text AS total") ? [{ total: "1" }] :
      sql.includes("FROM voucher v\n") ? [{ idvoucher: 1, idcompra: 551, stcompra, date: "2026-11-01", tpvoucher: "norma", vlunicompra: "10.00", vltotcompra: "10.00", stusado: "n" }] :
        [{ idcompra: 551, stcompra, vltotcompra: "10.00", voucher_count: "1" }],
    }));
    const result = await listPainelPurchases({ filters: { "dtagenda[de]": "2026-11-01" } });
    expect(result.items[0]).toMatchObject({ people: 1, status: stcompra, totalValue: "10,00", voucherStatus: "inactive" });
    expect(result.items[0].visitValue).toBeUndefined();
  });

  it("keeps the operational context in row/count and restricts the allocation batch to public agenda types", async () => {
    mocks.query.mockImplementation(async (sql: string) => ({ rows:
      sql.includes("COUNT(*)::text AS total") ? [{ total: "1" }] :
      sql.includes("FROM voucher v\n") ? [] : [{ idcompra: 551, stcompra: "conc", vltotcompra: "10.00", voucher_count: "1" }],
    }));
    await listPainelPurchases({ filters: { calendar: "1", "dtagenda[de]": "2026-11-01", "dtagenda[ate]": "2026-11-01" } });
    for (const [sql] of mocks.query.mock.calls.slice(0, 2)) {
      expect(sql).toContain("compra.stcompra = 'conc'");
      expect(sql).toContain("visit_agenda.tpagenda IN ('padra', 'promo')");
      expect(sql).toContain("agenda.tpagenda IN ('padra', 'promo')");
    }
    const [batchSql, ids] = mocks.query.mock.calls[2];
    expect(ids).toEqual([[551]]);
    expect(batchSql).toContain("a.tpagenda IN ('padra', 'promo')");
    // All dates in each purchase are required for the same cent allocation as the calendar.
    expect(batchSql).not.toContain("TO_DATE");
  });

  it("keeps a wholly free purchase at zero without assigning cents to a free voucher", async () => {
    mocks.query.mockImplementation(async (sql: string) => ({ rows:
      sql.includes("COUNT(*)::text AS total") ? [{ total: "1" }] :
      sql.includes("FROM voucher v\n") ? [{ idvoucher: 1, idcompra: 551, stcompra: "conc", tpcompra: "ponli", date: "2026-11-01", tpvoucher: "isent", vlunicompra: "0.00", vldesc: "0.00", vltotcompra: "0.00", stusado: "n" }] :
        [{ idcompra: 551, stcompra: "conc", vltotcompra: "0.00", voucher_count: "1" }],
    }));
    const result = await listPainelPurchases({ filters: { "dtagenda[de]": "2026-11-01" } });
    expect(result.items[0]).toMatchObject({ people: 1, visitValue: "0,00" });
  });

  it.each([
    ["conc", 2, false, false, "available", "Disponível"],
    ["conc", 2, false, true, "used", "Utilizado"],
    ["conc", 2, true, true, "rescheduled", "Reagendado"],
    ["conc", 0, null, null, "inactive", "Concluída"],
    ["canc", 2, false, false, "inactive", "Cancelada"],
  ])("maps voucher availability without classifying canceled or empty purchases as available (%s, %s, %s, %s)", async (stcompra, voucher_count, rescheduled, all_used, voucherStatus, voucherStatusLabel) => {
    mocks.query.mockImplementation(async (sql: string) => ({ rows: sql.includes("COUNT(*)::text AS total")
      ? [{ total: "1" }] : [{ idcompra: 1, stcompra, voucher_count, rescheduled, all_used }] }));
    const result = await listPainelPurchases({ filters: {} });
    expect(result.items[0]).toMatchObject({ voucherStatus, voucherStatusLabel });
  });

  it("loads the main purchase list with legacy mapping and pagination", async () => {
    mocks.query.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM voucher v\n")) {
        return { rows: [1, 2].map((idvoucher) => ({ idvoucher, idcompra: 551, date: "2026-05-15", stcompra: "conc", tpvoucher: "norma", vlunicompra: "40.00", vltotcompra: "80.00", stusado: "n" })) };
      }

      if (sql.includes("COUNT(*)::text AS total")) {
        return {
          rows: [{ total: "1" }],
        };
      }

      return {
        rowCount: 1,
        rows: [
          {
            idcompra: 551,
            dtcompra: "2026-05-06",
            dtagenda: "2026-05-15",
            people: "2", voucher_count: "3", rescheduled: true, all_used: false,
            tpcompra: "bilhe",
            stcompra: "conc",
            formapag: "pix",
            idpagseguro: null,
            paymentmethodtype: null,
            status: null,
            dtpagamento: "2026-05-07",
            hrpagamento: "10:15:00",
            cpf: "12345678901",
            nmusuario: "DEV",
            vltotcompra: "80.00",
          },
        ],
      };
    });

    await expect(
      listPainelPurchases({
        page: "2",
        perPage: "10",
        filters: {
          idcompra: "551",
          formapag: "pix",
        },
      }),
    ).resolves.toEqual({
      items: [
        {
          purchaseId: 551,
          purchaseDate: "06/05/2026",
          paymentDate: "07/05/2026",
          paymentTime: "10:15:00",
          visitDate: "15/05/2026",
          people: 2, originLabel: "Bilheteria", voucherStatus: "rescheduled", voucherStatusLabel: "Reagendado",
          type: "bilhe",
          typeLabel: "Bilheteria",
          status: "conc",
          statusLabel: "Concluída",
          paymentMethodLabel: "PIX",
          paymentLabel: "Bilheteria",
          cpf: "12345678901",
          userName: "DEV",
          totalValue: "80,00",
        },
      ],
      total: 1,
      page: 2,
      perPage: 10,
      totalPages: 1,
      filters: {
        calendar: null, origin: null, voucherStatus: null, search: null,
        purchaseId: "551",
        type: null,
        purchaseStatus: null,
        paymentMethod: null,
        ticketPaymentMethod: "pix",
        gatewayPaymentMethod: null,
        gatewayStatus: null,
        cpf: null,
        userName: null,
        dateFrom: null,
        dateTo: null,
        visitDateFrom: null,
        visitDateTo: null,
      },
    });

    expect(mocks.query).toHaveBeenCalledTimes(3);
    expect(String(mocks.query.mock.calls[0]?.[0])).toContain("LEFT JOIN LATERAL");
    expect(String(mocks.query.mock.calls[0]?.[0])).toContain("LIMIT 10");
    expect(String(mocks.query.mock.calls[0]?.[0])).toContain("OFFSET 10");
  });

  it("applies identical visit/status/origin constraints to rows, totals and export", async () => {
    mocks.query.mockResolvedValue({ rows: [] });
    await listPainelPurchases({ allRows: true, filters: {
      "dtagenda[de]": "2026-11-01", "dtagenda[ate]": "2026-11-01",
      voucherStatus: "rescheduled", origin: "site",
    }});
    for (const [sql] of mocks.query.mock.calls) {
      expect(sql).toContain("visit_agenda.dtagenda >= TO_DATE('01/11/2026'");
      expect(sql).toContain("visit_agenda.dtagenda <= TO_DATE('01/11/2026'");
      expect(sql).toContain("AND (compra.stcompra = 'conc' AND a.rescheduled)");
      expect(sql).toContain("compra.tpcompra = 'ponli'");
    }
    const rowsSql = mocks.query.mock.calls[0][0];
    expect(rowsSql).toContain("AS all_used");
    expect(rowsSql).toContain("AS rescheduled");
    expect(rowsSql).toContain("agenda.dtagenda >= TO_DATE('01/11/2026'");
  });

  it("drops pagination clause when export requests all rows", async () => {
    mocks.query.mockImplementation(async (sql: string) => {
      if (sql.includes("COUNT(*)::text AS total")) {
        return {
          rows: [{ total: "2" }],
        };
      }

      return {
        rowCount: 2,
        rows: [],
      };
    });

    await listPainelPurchases({
      page: "1",
      filters: {},
      allRows: true,
    });

    expect(String(mocks.query.mock.calls[0]?.[0])).toContain("LEFT JOIN LATERAL");
    expect(String(mocks.query.mock.calls[0]?.[0])).not.toContain("LIMIT 5000");
    expect(String(mocks.query.mock.calls[0]?.[0])).not.toContain("OFFSET 0");
  });
});

describe("getPainelPurchaseDetail", () => {
  it("resolves detail kinds from the catalogue before voucher type, with normalized titles and legacy school fallback", async () => {
    mocks.readEstanciaContent.mockResolvedValue({ products: [
      { id: "vip", title: "Ingresso VIP", type: "passport" },
      { id: "kit", title: "Kit lanche", type: "addon" },
    ] });
    mocks.query.mockImplementation(async (sql: string) => ({ rows: sql.includes("LEFT JOIN usuario")
      ? [{ idcompra: 551, stcompra: "conc", tpcompra: "ponli", vltotcompra: "20.00" }]
      : [
        { idvoucher: 1, tpvoucher: "espec", descricao: " Íngresso vip ", stusado: "n" },
        { idvoucher: 2, tpvoucher: "norma", descricao: "Kit lanche", stusado: "n" },
        { idvoucher: 3, tpvoucher: "espec", descricao: "Passaporte especial Dia das Crianças", stusado: "inv" },
        { idvoucher: 4, tpvoucher: "espec", descricao: "Café", stusado: "n" },
        { idvoucher: 5, tpvoucher: "escol", descricao: null, stusado: "n" },
      ],
    }));
    const result = await getPainelPurchaseDetail(551);
    expect(result.vouchers.map(({ voucherId, kind }) => ({ voucherId, kind }))).toEqual([
      { voucherId: 1, kind: "passport" }, { voucherId: 2, kind: "addon" },
      { voucherId: 3, kind: "passport" }, { voucherId: 4, kind: "addon" },
      { voucherId: 5, kind: "passport" },
    ]);
    expect(result.vouchers[0].voucherType).toBe("espec");
    expect(result.vouchers[1].voucherType).toBe("norma");
    expect(result.vouchers[2].used).toBe("inv");
  });

  it("carrega o detalhe legado da compra com vouchers escolares", async () => {
    mocks.query.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM compra")) {
        return {
          rows: [
            {
              idcompra: 551,
              dtcompra: "2026-05-06",
              tpcompra: "ponli",
              stcompra: "conc",
              formapag: "pgseg",
              vltotcompra: "80.00",
              dtpagamento: "2026-05-07",
              hrpagamento: "14:32:11",
              cpf: "12345678901",
              nmusuario: "DEV",
              codindica: null,
              idpagseguro: "pay-551",
              paymentmethodtype: "1",
              status: "3",
            },
          ],
        };
      }

      return {
        rows: [
          {
            idvoucher: 9001,
            numvoucher: "ABC-123",
            tpvoucher: "escol",
            idagenda: 2306,
            dtagenda: "2026-05-08",
            dtvalidade: "2026-05-14",
            original_date: "2026-05-01",
            reschedule_reason: "Chuva",
            idescola: 77,
            nmescola: "Colegio Estancia",
            nomealuno: "Ana Estudante",
            turma: "7A",
            periodo: "Manha",
            vlunicompra: "40.00",
            stusado: "n",
            dtuso: null,
            hruso: null,
          },
        ],
      };
    });

    await expect(getPainelPurchaseDetail(551)).resolves.toEqual({
      purchaseId: 551,
      purchaseDate: "06/05/2026",
      type: "ponli",
      typeLabel: "Compra",
      status: "conc",
      statusLabel: "Concluída",
      paymentLabel: "Cielo 3 - Paga",
      paymentMethodLabel: "Cartão de crédito",
      paymentDate: "07/05/2026",
      paymentTime: "14:32:11",
      totalValue: "80,00",
      cpf: "12345678901",
      userName: "DEV",
      referralCode: null,
      gatewayPaymentId: "pay-551",
      gatewayStatusCode: "3",
      gatewayStatusLabel: "Paga",
      vouchers: [
        {
          voucherId: 9001,
          voucherNumber: "ABC-123",
          visitDate: "08/05/2026",
          validUntil: "14/05/2026",
          originalDate: "01/05/2026",
          rescheduleReason: "Chuva",
          voucherType: "escol",
          kind: "passport",
          voucherTypeLabel: "Escolar",
          schoolName: "Colegio Estancia",
          studentName: "Ana Estudante",
          className: "7A",
          periodName: "Manha",
          unitValue: "40,00",
          used: "n",
          usedLabel: "Não",
          usedDate: null,
          usedTime: null,
          schoolTripHref: "/painel/clientes/passeios/2306/alunos",
        },
      ],
    });
  });
});

describe("getPainelPurchaseGatewayConsult", () => {
  it("retorna o resumo legado da consulta Cielo", async () => {
    mocks.query.mockImplementation(async (sql: string) => {
      if (sql.includes("LEFT JOIN usuario")) {
        return {
          rows: [
            {
              idcompra: 551,
              dtcompra: "2026-05-06",
              tpcompra: "ponli",
              stcompra: "conc",
              formapag: "pgseg",
              vltotcompra: "80.00",
              dtpagamento: "2026-05-07",
              hrpagamento: "14:32:11",
              cpf: "12345678901",
              nmusuario: "DEV",
              codindica: null,
              idpagseguro: "pay-551",
              paymentmethodtype: "1",
              status: "3",
            },
          ],
        };
      }

      return {
        rows: [
          {
            payment_id: "pay-551",
            reference: "551",
          },
        ],
      };
    });
    mocks.getNativeCieloCheckoutStatus.mockResolvedValue({
      status: "00",
      dados: {
        status: 3,
      },
    });
    mocks.normalizePaymentReconciliationPayload.mockReturnValue({
      status: 3,
      paymentMethodType: 1,
      grossAmount: "80.00",
      feeAmount: "0.00",
      netAmount: "80.00",
      date: new Date("2026-05-07T14:20:00.000Z"),
      lastEventDate: new Date("2026-05-07T14:32:11.000Z"),
      senderName: "Cliente Teste",
      senderEmail: "cliente@example.com",
      senderPhoneAreaCode: "51",
      senderPhoneNumber: "999999999",
    });

    await expect(getPainelPurchaseGatewayConsult(551)).resolves.toEqual({
      purchaseId: 551,
      found: true,
      message: "Consulta manual do gateway executada com sucesso.",
      statusCode: 3,
      statusLabel: "Paga",
      paymentMethodType: 1,
      paymentMethodLabel: "Cartão de crédito",
      grossAmount: "80,00",
      feeAmount: "0,00",
      netAmount: "80,00",
      paymentDate: "2026-05-07T14:32:11.000Z",
      startedAt: "2026-05-07T14:20:00.000Z",
      finishedAt: "2026-05-07T14:32:11.000Z",
      senderName: "Cliente Teste",
      senderEmail: "cliente@example.com",
      senderPhone: "51 999999999",
    });
  });

  it("devolve estado de dados nao encontrados quando o gateway nao retorna a transacao", async () => {
    mocks.query.mockImplementation(async (sql: string) => {
      if (sql.includes("LEFT JOIN usuario")) {
        return {
          rows: [
            {
              idcompra: 551,
              dtcompra: "2026-05-06",
              tpcompra: "ponli",
              stcompra: "pend",
              formapag: "pgseg",
              vltotcompra: "80.00",
              dtpagamento: null,
              hrpagamento: null,
              cpf: "12345678901",
              nmusuario: "DEV",
              codindica: null,
              idpagseguro: null,
              paymentmethodtype: null,
              status: null,
            },
          ],
        };
      }

      return {
        rows: [],
      };
    });
    mocks.getNativeCieloCheckoutStatus.mockResolvedValue({
      status: "99",
      msgRetorno: "Nao localizado",
    });

    await expect(getPainelPurchaseGatewayConsult(551)).resolves.toEqual({
      purchaseId: 551,
      found: false,
      message: "Nao localizado",
      statusCode: null,
      statusLabel: null,
      paymentMethodType: null,
      paymentMethodLabel: null,
      grossAmount: "0,00",
      feeAmount: "0,00",
      netAmount: "0,00",
      paymentDate: null,
      startedAt: null,
      finishedAt: null,
      senderName: null,
      senderEmail: null,
      senderPhone: null,
    });
  });
});

describe("listPainelPurchaseVouchers", () => {
  it("carrega lista e indicadores legados de vouchers", async () => {
    mocks.query.mockImplementation(async (sql: string) => {
      if (sql.includes("COUNT(voucher.idvoucher)::text AS total")) {
        return { rows: [{ total: "1" }] };
      }

      if (sql.includes("SUM(CASE WHEN voucher.tpvoucher = 'norma'")) {
        return {
          rows: [
            {
              qtdnormal_site: "1",
              vlnormal_site: "40.00",
              qtdinfantil_site: "0",
              vlinfantil_site: "0.00",
              qtdnormal_parque: "0",
              vlnormal_parque: "0.00",
              qtdinfantil_parque: "0",
              vlinfantil_parque: "0.00",
              qtdescola: "0",
              vlescola: "0.00",
              qtdadulto_reserva: "0",
              vladulto_reserva: "0.00",
              qtdinfantil_reserva: "0",
              vlinfantil_reserva: "0.00",
              qtespecial: "0",
              vlespecial: "0.00",
              qtdcortesia: "0",
              qtdisento: "0",
            },
          ],
        };
      }

      return {
        rows: [
          {
            idcompra: 551,
            idvoucher: 9001,
            numvoucher: "ABC-123",
            dtcompra: "2026-05-06",
            dtagenda: "2026-05-08",
            tpvoucher: "norma",
            descricao: null,
            identificacao: "Cliente Teste",
            tpcompra: "ponli",
            stcompra: "conc",
            vlunicompra: "40.00",
            stusado: "n",
            dtuso: null,
            hruso: null,
          },
        ],
      };
    });

    await expect(
      listPainelPurchaseVouchers({
        page: "1",
        filters: {
          tpcompra: "site",
        },
      }),
    ).resolves.toEqual({
      items: [
        {
          purchaseId: 551,
          voucherId: 9001,
          voucherNumber: "ABC-123",
          purchaseDate: "06/05/2026",
          visitDate: "08/05/2026",
          ticketTypeLabel: "Passaporte",
          name: "Cliente Teste",
          location: "ponli",
          locationLabel: "SITE",
          unitValue: "40,00",
          purchaseStatusLabel: "Concluída",
          usedLabel: "Não",
          usedDate: null,
          usedTime: null,
          purchaseTypeLabel: "Compra",
        },
      ],
      total: 1,
      page: 1,
      perPage: 100,
      totalPages: 1,
      filters: {
        voucherId: null,
        purchaseDateFrom: null,
        purchaseDateTo: null,
        usedDateFrom: null,
        usedDateTo: null,
        visitDateFrom: null,
        visitDateTo: null,
        voucherType: null,
        purchaseLocation: "site",
        purchaseStatus: null,
        usedStatus: null,
      },
      indicators: {
        qtdnormal_site: 1,
        vlnormal_site: "40,00",
        qtdinfantil_site: 0,
        vlinfantil_site: "0,00",
        qtdnormal_parque: 0,
        vlnormal_parque: "0,00",
        qtdinfantil_parque: 0,
        vlinfantil_parque: "0,00",
        qtdescola: 0,
        vlescola: "0,00",
        qtdadulto_reserva: 0,
        vladulto_reserva: "0,00",
        qtdinfantil_reserva: 0,
        vlinfantil_reserva: "0,00",
        qtespecial: 0,
        vlespecial: "0,00",
        qtdcortesia: 0,
        qtdisento: 0,
        totalCount: 1,
        totalValue: "40,00",
      },
    });
  });
});

