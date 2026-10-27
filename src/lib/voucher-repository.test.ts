import { beforeEach, describe, expect, it, vi } from "vitest";
import { getUserVouchersPage, getUserVoucherRescheduleData, getUserVoucherExportData } from "@/lib/voucher-repository";

const dbQuery = vi.fn();

vi.mock("@/lib/ingresso-db", () => ({
  getIngressoDbPool: () => ({
    query: dbQuery,
  }),
}));

describe("voucher-repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reads voucher description from the voucher table when listing purchases", async () => {
    dbQuery
      .mockResolvedValueOnce({ rows: [{ total: "1" }] })
      .mockResolvedValueOnce({
        rows: [
          {
            idcompra: 77,
            tpcompra: "ponli",
            dtcompra: "2026-04-20",
            vltotcompra: "199.90",
            stcompra: "conc",
            status: 3,
            paymentmethodtype: 1,
            voucher_count: "1",
            unused_voucher_count: "1",
          },
        ],
      })
      .mockImplementationOnce(async (sql: string) => {
        expect(sql).toContain("voucher.descricao AS descricao");

        return {
          rows: [
            {
              idcompra: 77,
              idvoucher: 11,
              numvoucher: "ABC123",
              tpvoucher: "norma",
              vlunicompra: "199.90",
              stusado: "n",
              dtuso: null,
              voucherenviado: "n",
              dtvalidade: "2026-05-20",
              dtagenda: "2026-05-01",
              tpagenda: "padra",
              idescola: null,
              nmescola: null,
              nomealuno: null,
              nomeeducador: null,
              turma: null,
              ensino_tipo: null,
              ensino_ano: null,
              turma_letra: null,
              descricao: "Ingresso principal",
            },
          ],
        };
      });

    const page = await getUserVouchersPage("52998224725", 10, 0);

    expect(page.purchases).toHaveLength(1);
    expect(page.purchases[0]?.vouchers[0]?.number).toBe("ABC123");
  });

  it("reads voucher description from the voucher table when loading reschedule data", async () => {
    dbQuery.mockImplementationOnce(async (sql: string) => {
      expect(sql).toContain("voucher.descricao AS descricao");

      return {
        rows: [
          {
            cpf: "52998224725",
            tpcompra: "ponli",
            dtcompra: "2026-04-20",
            stcompra: "conc",
            idcompra: 77,
            idvoucher: 11,
            numvoucher: "ABC123",
            tpvoucher: "norma",
            vlunicompra: "199.90",
            stusado: "n",
            dtuso: null,
            voucherenviado: "n",
            dtvalidade: "2026-05-20",
            dtagenda: "2026-05-01",
            tpagenda: "padra",
            idescola: null,
            nmescola: null,
            nomealuno: null,
            nomeeducador: null,
            turma: null,
            ensino_tipo: null,
            ensino_ano: null,
            turma_letra: null,
            descricao: "Ingresso principal",
            idagenda: 9,
          },
        ],
      };
    });

    const result = await getUserVoucherRescheduleData("52998224725", 11);

    expect(result?.voucher.id).toBe(11);
  });

  it.each(["n", "inv"])("projects dates and blocks expired or invalid voucher generation (%s)", async (stusado) => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-27T15:00:00Z"));
    try {
      dbQuery.mockResolvedValueOnce({ rows: [{ total: "1" }] }).mockResolvedValueOnce({ rows: [{ idcompra: 77, tpcompra: "ponli", dtcompra: "2026-10-01", stcompra: "conc", status: 3, voucher_count: "1", unused_voucher_count: "1" }] }).mockResolvedValueOnce({ rows: [{ idcompra: 77, idvoucher: 11, stusado, dtvalidade: "2026-10-26", dtagenda: "2026-10-20", original_date: "2026-10-10", reschedule_reason: "Chuva" }] });
      const page = await getUserVouchersPage("52998224725", 10, 0);
      expect(page.purchases[0]?.vouchers[0]).toMatchObject({ visitDate: "2026-10-20", originalDate: "2026-10-10", validUntil: "2026-10-26", rescheduleReason: "Chuva", expiredForGeneration: true, canSelectForVoucher: false });
      expect(page.purchases[0]?.canGenerateVoucher).toBe(false);
    } finally { vi.useRealTimers(); }
  });

  it("keeps original visit and validity in exported voucher data", async () => {
    dbQuery.mockResolvedValueOnce({ rows: [{ total: "1" }] }).mockResolvedValueOnce({ rows: [{ idcompra: 77, tpcompra: "ponli", dtcompra: "2099-01-01", stcompra: "conc", status: 3, voucher_count: "1", unused_voucher_count: "1" }] }).mockResolvedValueOnce({ rows: [{ idcompra: 77, idvoucher: 11, stusado: "n", dtvalidade: "2099-11-07", dtagenda: "2099-11-01", original_date: "2099-10-01", tpagenda: "padra" }] }).mockResolvedValueOnce({ rows: [] });
    const result = await getUserVoucherExportData("52998224725", 77, [11]);
    expect(result?.vouchers[0]).toMatchObject({ visitDate: "2099-11-01", originalDate: "2099-10-01", validUntil: "2099-11-07" });
  });
});
