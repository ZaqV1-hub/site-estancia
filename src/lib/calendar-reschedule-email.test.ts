import { beforeEach, describe, expect, it, vi } from "vitest";
const { query, queueLegacyEmail } = vi.hoisted(() => ({ query: vi.fn(), queueLegacyEmail: vi.fn() }));
vi.mock("@/lib/ingresso-db", () => ({ getIngressoDbPool: () => ({ query }) }));
vi.mock("@/lib/legacy-email", () => ({ queueLegacyEmail }));
import { notifyCalendarReschedule } from "@/lib/calendar-reschedule-email";
import type { RescheduleVoucherRow } from "@/lib/calendar-reschedule";
const voucher = { idcompra: 4, email: "ana@example.com", nmusuario: "Ana" } as RescheduleVoucherRow;
describe("reschedule notification", () => {
 beforeEach(() => { vi.clearAllMocks(); queueLegacyEmail.mockResolvedValue(8); });
 it.each([["env", 0, { sent: 1, failed: 0, skipped: 0 }], ["nov", 0, { sent: 0, failed: 0, skipped: 1 }], ["nov", 1, { sent: 0, failed: 1, skipped: 0 }], ["fal", 2, { sent: 0, failed: 1, skipped: 0 }]])("reports stored status %s and failures %s honestly", async (stemail, erros, expected) => { query.mockResolvedValue({ rows: [{ stemail, erros }] }); expect(await notifyCalendarReschedule([voucher, voucher], "2026-11-01")).toEqual(expected); expect(queueLegacyEmail).toHaveBeenCalledTimes(1); });
 it("skips missing addresses without SMTP", async () => { expect(await notifyCalendarReschedule([{ ...voucher, email: null }], "2026-11-01")).toEqual({ sent: 0, failed: 0, skipped: 1 }); expect(queueLegacyEmail).not.toHaveBeenCalled(); });

 it("describes validity-only edits without inventing a new visit date", async () => { query.mockResolvedValue({ rows: [{ stemail: "env", erros: 0 }] }); await notifyCalendarReschedule([voucher]); expect(queueLegacyEmail).toHaveBeenCalledWith(expect.objectContaining({ html: expect.stringContaining("As datas das visitas foram mantidas.") })); });
});
