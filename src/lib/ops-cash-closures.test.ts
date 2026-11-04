import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  autoCloseOperationalCashClosures,
  closeOperationalCashClosure,
  getOperationalCashClosureDetail,
  listOperationalCashClosures,
} from "@/lib/ops-cash-closures";

const { query, connect, release, registerOpsAuditLog, ensureOpsAuditLogTable } = vi.hoisted(() => ({
  query: vi.fn(),
  connect: vi.fn(),
  release: vi.fn(),
  registerOpsAuditLog: vi.fn(),
  ensureOpsAuditLogTable: vi.fn(),
}));

vi.mock("@/lib/ingresso-db", () => ({
  getIngressoDbPool: () => ({
    connect,
  }),
}));

vi.mock("@/lib/ops-audit-log", () => ({
  registerOpsAuditLog,
  ensureOpsAuditLogTable,
}));

describe("ops-cash-closures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    connect.mockResolvedValue({
      query,
      release,
    });
    registerOpsAuditLog.mockResolvedValue(981);
  });

  it("lists recent cash closures", async () => {
    query.mockImplementation(async (sql: string, values?: unknown[]) => {
      if (sql.includes("SELECT COUNT(*)::text AS total")) {
        return {
          rows: [{ total: "1" }],
        };
      }

      if (sql.includes("FROM caixa_fechamentos")) {
        expect(values).toEqual([10, 0]);

        return {
          rows: [
            {
              id: 44,
              periodo_id: 7,
              snapshot_json:
                '{"period":{"ini":"2026-04-22 08:00:00+00","fim":"2026-04-22 18:00:00+00"},"operador":"Gestor Teste"}',
              totals_dinheiro: "320.00",
              totals_fundo: "50.00",
              totals_geral: "470.00",
              created_at: "2026-04-22 18:00:00+00",
              periodo_aberto_em: "2026-04-22 08:00:00+00",
              periodo_fechado_em: "2026-04-22 18:00:00+00",
              periodo_operador: "Gestor Teste",
            },
          ],
        };
      }

      return { rows: [] };
    });

    await expect(
      listOperationalCashClosures({ limit: 10, offset: 0 }),
    ).resolves.toEqual({
      items: [
        {
          id: 44,
          periodId: 7,
          openedAt: "2026-04-22 08:00:00+00",
          closedAt: "2026-04-22 18:00:00+00",
          operator: "Gestor Teste",
          totals: {
            cash: "320.00",
            fund: "50.00",
            overall: "470.00",
          },
          createdAt: "2026-04-22 18:00:00+00",
        },
      ],
      meta: {
        limit: 10,
        offset: 0,
        total: 1,
      },
    });
  });

  it("returns the closure detail with parsed snapshot", async () => {
    query.mockImplementation(async (sql: string, values?: unknown[]) => {
      if (sql.includes("WHERE fechamento.id = $1")) {
        expect(values).toEqual([44]);

        return {
          rows: [
            {
              id: 44,
              periodo_id: 7,
              snapshot_json:
                '{"period":{"ini":"2026-04-22 08:00:00+00","fim":"2026-04-22 18:00:00+00"},"operador":"Gestor Teste","totalFundo":50}',
              totals_dinheiro: "320.00",
              totals_fundo: "50.00",
              totals_geral: "470.00",
              created_at: "2026-04-22 18:00:00+00",
              periodo_aberto_em: "2026-04-22 08:00:00+00",
              periodo_fechado_em: "2026-04-22 18:00:00+00",
              periodo_operador: "Gestor Teste",
            },
          ],
        };
      }

      return { rows: [] };
    });

    await expect(getOperationalCashClosureDetail(44)).resolves.toEqual({
      id: 44,
      periodId: 7,
      openedAt: "2026-04-22 08:00:00+00",
      closedAt: "2026-04-22 18:00:00+00",
      operator: "Gestor Teste",
      totals: {
        cash: "320.00",
        fund: "50.00",
        overall: "470.00",
      },
      createdAt: "2026-04-22 18:00:00+00",
      snapshot: {
        period: {
          ini: "2026-04-22 08:00:00+00",
          fim: "2026-04-22 18:00:00+00",
        },
        operador: "Gestor Teste",
        totalFundo: 50,
      },
    });
  });

  it("rejects invalid closure ids", async () => {
    await expect(getOperationalCashClosureDetail(0)).rejects.toMatchObject({
      code: "invalid_cash_closure_id",
      status: 400,
    });
  });

  it("rejects manual closure of the daily cash period", async () => {
    await expect(closeOperationalCashClosure({ operatorName: "Operador", reason: "Fechamento manual" }))
      .rejects.toMatchObject({ code: "cash_daily_auto_close", status: 409 });
    expect(query).not.toHaveBeenCalled();
  });

  it("auto closes stale periods and leaves the current period open", async () => {
    let staleClosed = false;
    let currentOpenPeriodId = 9;

    query.mockImplementation(async (sql: string, values?: unknown[]) => {
      if (sql === "BEGIN" || sql === "COMMIT") {
        return { rows: [] };
      }

      if (
        sql.includes("FROM caixa_periodos") &&
        sql.includes("(aberto_em AT TIME ZONE 'America/Sao_Paulo')::date < (CURRENT_TIMESTAMP")
      ) {
        if (staleClosed) {
          return { rows: [] };
        }

        return {
          rows: [
            {
              id: 6,
              aberto_em: "2026-04-22 08:00:00+00",
              fechado_em: null,
              operador: null,
              folha_id: null,
            },
          ],
        };
      }

      if (sql.includes("AS closed_at")) {
        expect(values).toEqual(["2026-04-22 08:00:00+00"]);

        return {
          rows: [{ closed_at: "2026-04-23 03:00:00+00" }],
        };
      }

      if (sql.includes("FROM movimentacao_caixa") && values?.[0] === "fundo") {
        return {
          rows: [
            {
              id: 21,
              tipo: "fundo",
              responsavel: "Tesouraria",
              valor: "40.00",
              data_hora: "2026-04-22 09:00:00+00",
            },
          ],
        };
      }

      if (sql.includes("FROM movimentacao_caixa") && values?.[0] === "sangria") {
        return { rows: [] };
      }

      if (sql.includes("WITH voucher_totals AS")) {
        if (values?.[0] === "2026-04-22 08:00:00+00") {
          return {
            rows: [{ total: "120.00" }],
          };
        }

        return {
          rows: [{ total: "0.00" }],
        };
      }

      if (sql.includes("INSERT INTO caixa_fechamentos")) {
        staleClosed = true;

        expect(values?.[0]).toBe(6);

        return {
          rows: [{ id: 55 }],
        };
      }

      if (
        sql.includes("UPDATE caixa_periodos") &&
        sql.includes("fechado_em = $4") &&
        values?.[0] === 6
      ) {
        expect(values).toEqual([6, null, 55, "2026-04-23 03:00:00+00", true]);
        return { rows: [] };
      }

      if (sql.includes("UPDATE voucher v") || sql.includes("UPDATE edicoes_log")) {
        return { rows: [] };
      }

      if (sql.includes("INSERT INTO caixa_periodos")) {
        currentOpenPeriodId = 7;

        expect(values).toEqual(["2026-04-23 03:00:00+00"]);

        return {
          rows: [{ id: 7 }],
        };
      }

      if (
        sql.includes("FROM caixa_periodos") &&
        sql.includes("fechado_em IS NULL") &&
        sql.includes("ORDER BY id DESC")
      ) {
        return {
          rows: [
            {
              id: currentOpenPeriodId,
              aberto_em: "2026-04-23 03:00:00+00",
              fechado_em: null,
              operador: null,
              folha_id: null,
            },
          ],
        };
      }

      if (sql.includes("WHERE fechamento.id = $1")) {
        expect(values).toEqual([55]);

        return {
          rows: [
            {
              id: 55,
              periodo_id: 6,
              snapshot_json:
                '{"period":{"ini":"2026-04-22 08:00:00+00","fim":"2026-04-23 03:00:00+00"},"fechamentoInfo":{"auto":true}}',
              totals_dinheiro: "120.00",
              totals_fundo: "40.00",
              totals_geral: "160.00",
              created_at: "2026-04-23 03:00:00+00",
              periodo_aberto_em: "2026-04-22 08:00:00+00",
              periodo_fechado_em: "2026-04-23 03:00:00+00",
              periodo_operador: null,
            },
          ],
        };
      }

      return { rows: [] };
    });

    await expect(
      autoCloseOperationalCashClosures({
        reason: "Virada do dia no BFF",
        actor: {
          name: "Sistema",
        },
      }),
    ).resolves.toEqual({
      action: "auto_close",
      closedCount: 1,
      closedPeriodIds: [6],
      closureIds: [55],
      currentSummary: {
        period: {
          id: 7,
          openedAt: "2026-04-23 03:00:00+00",
          closedAt: null,
          operator: null,
          closureSheetId: null,
        },
        funds: [
          {
            id: 21,
            type: "fundo",
            responsible: "Tesouraria",
            value: "40.00",
            createdAt: "2026-04-22 09:00:00+00",
          },
        ],
        sangrias: [],
        totals: {
          cashSales: "0.00",
          fund: "40.00",
          sangria: "0.00",
          cashInDrawer: "40.00",
        },
      },
      auditLogIds: [981],
      message: "1 periodo(s) anterior(es) fechados automaticamente.",
    });

    expect(ensureOpsAuditLogTable).toHaveBeenCalled();
    expect(registerOpsAuditLog).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        origem: "caixa",
        acao: "fechar_auto",
        periodoId: 6,
        folhaId: 55,
      }),
    );
  });
});
