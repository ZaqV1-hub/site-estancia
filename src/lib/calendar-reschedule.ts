import { getIngressoDbPool } from "@/lib/ingresso-db";
import { listB2cProducts } from "@/lib/b2c-catalog";
import { getCalendarRule, ensureCalendarTables } from "@/lib/operational-calendar";
import { getSaoPauloToday, resolveCalendarValidityDate } from "@/lib/calendar-validity";
import { registerOpsAuditLog } from "@/lib/ops-audit-log";
import { notifyCalendarReschedule } from "@/lib/calendar-reschedule-email";
import type { CalendarActor, CalendarRule, CalendarValidity, MoveCalendarInput, MoveCalendarResult } from "@/lib/operational-calendar-contracts";

export class CalendarRescheduleError extends Error {
  constructor(public code: string, message: string, public status = 409, public warnings: string[] = []) { super(message); }
}
const validities: CalendarValidity[] = ["day", "1d", "7d", "30d", "6m"];
function ids(value: unknown, required: boolean) {
  if (!Array.isArray(value) || (required && !value.length) || value.length > 500 || value.some((id) => !Number.isSafeInteger(id) || id <= 0)) {
    throw new CalendarRescheduleError("invalid_reschedule_payload", "Selecione compras e vouchers válidos (até 500 por operação).", 400);
  }
  return [...new Set<number>(value)];
}
export type RescheduleVoucherRow = {
  idvoucher: number; idagenda: number; idcompra: number; stusado: string | null; stcompra: string;
  tpcompra: string; formapag: string | null; payment_status: number | null;
  dtagenda: string; dtvalidade: string | null; descricao: string | null; tpvoucher: string | null;
  email: string | null; nmusuario: string | null;
};
export async function moveCalendarVouchers(input: MoveCalendarInput, actor: CalendarActor): Promise<MoveCalendarResult> {
  const purchaseIds = ids(input.purchaseIds, true);
  const voucherIds = input.voucherIds === undefined ? null : ids(input.voucherIds, true);
  const reason = typeof input.reason === "string" ? input.reason.trim() : "";
  const date = input.targetDate;
  if ((!input.keepVisitDate && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T12:00:00Z`)) || new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) !== date || date <= getSaoPauloToday())) || (input.keepVisitDate !== undefined && typeof input.keepVisitDate !== "boolean") || !["keep", "destination", "custom"].includes(input.validityMode) || (input.validityMode === "custom" && !validities.includes(input.validity!)) || !reason || reason.length > 500 || typeof input.notifyEmail !== "boolean" || (input.confirmUnavailable !== undefined && typeof input.confirmUnavailable !== "boolean")) {
    throw new CalendarRescheduleError("invalid_reschedule_payload", "Informe data futura, validade e motivo válidos.", 400);
  }
  await ensureCalendarTables();
  const client = await getIngressoDbPool().connect();
  let vouchers: RescheduleVoucherRow[] = [];
  let warnings: string[] = [];
  try {
    await client.query("BEGIN");
    let destination: CalendarRule | null = null;
    let sourceAgendaIds: number[] = [];
    if (input.keepVisitDate) {
      const sources = await client.query<{ idagenda: number }>(`SELECT DISTINCT voucher.idagenda FROM voucher
        WHERE voucher.idcompra = ANY($1::int[]) ${voucherIds ? "AND voucher.idvoucher = ANY($2::int[])" : ""}
        ORDER BY voucher.idagenda`, voucherIds ? [purchaseIds, voucherIds] : [purchaseIds]);
      sourceAgendaIds = sources.rows.map((row) => row.idagenda);
      await client.query("SELECT idagenda FROM agenda WHERE idagenda = ANY($1::int[]) ORDER BY idagenda FOR UPDATE", [sourceAgendaIds]);
    } else {
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", ["estancia-calendar:" + date]);
      await client.query("SELECT idagenda FROM agenda WHERE dtagenda = $1::date AND tpagenda IN ('padra', 'promo') ORDER BY idagenda FOR UPDATE", [date]);
      // Match the date editor lock order: advisory, agenda, then rule.
      await client.query("SELECT date FROM estancia_calendar_rules WHERE date = $1::date FOR UPDATE", [date]);
      destination = await getCalendarRule(date, client);
      if (!destination || destination.status !== "abe" || !["dayuse", "event"].includes(destination.type)) {
        throw new CalendarRescheduleError("destination_unavailable", "A data de destino precisa estar aberta.");
      }
    }
    const result = await client.query<RescheduleVoucherRow>(`
      SELECT voucher.idvoucher, voucher.idagenda, voucher.idcompra, voucher.stusado, voucher.tpvoucher,
        voucher.descricao, voucher.dtvalidade::text AS dtvalidade,
        agenda.dtagenda::text AS dtagenda, compra.stcompra, compra.tpcompra, compra.formapag,
        usuario.email, usuario.nmusuario, payment.status AS payment_status
      FROM voucher JOIN compra ON compra.idcompra = voucher.idcompra
      JOIN agenda ON agenda.idagenda = voucher.idagenda
      LEFT JOIN usuario ON usuario.cpf = compra.cpf
      LEFT JOIN LATERAL (SELECT status FROM pagpagseguro WHERE idcompra = compra.idcompra ORDER BY date DESC NULLS LAST LIMIT 1) payment ON true
      WHERE voucher.idcompra = ANY($1::int[]) ${voucherIds ? "AND voucher.idvoucher = ANY($2::int[])" : ""}
      ORDER BY voucher.idvoucher FOR UPDATE OF voucher, compra
    `, voucherIds ? [purchaseIds, voucherIds] : [purchaseIds]);
    vouchers = result.rows;
    if (!vouchers.length || (voucherIds && vouchers.length !== voucherIds.length) || purchaseIds.some((id) => !vouchers.some((voucher) => voucher.idcompra === id))) {
      throw new CalendarRescheduleError("voucher_not_found", "Alguns vouchers não pertencem às compras selecionadas.", 404);
    }
    if (input.keepVisitDate && vouchers.some((voucher) => !sourceAgendaIds.includes(voucher.idagenda))) {
      throw new CalendarRescheduleError("vouchers_changed_retry", "A visita foi alterada por outro operador. Reabra os vouchers e tente novamente.");
    }
    for (const voucher of vouchers) {
      const paid = voucher.stcompra === "conc" && (voucher.tpcompra === "bilhe" || (voucher.tpcompra === "ponli" && [3, 4].includes(Number(voucher.payment_status))) || (voucher.tpcompra === "reser" && Boolean(voucher.formapag?.trim()) && voucher.formapag?.trim().toUpperCase() !== "N/A"));
      if (voucher.stusado !== "n" || !paid || voucher.tpvoucher === "escol") {
        throw new CalendarRescheduleError("voucher_unavailable", "O lote contém voucher usado, inválido, cancelado ou sem pagamento confirmado.");
      }
    }
    if (destination) {
      const products = await listB2cProducts();
      warnings = [...new Set(vouchers.flatMap((voucher) => {
        const product = products.find((item) => item.title === voucher.descricao) ?? products.find((item) => item.voucherType === voucher.tpvoucher && products.filter((candidate) => candidate.voucherType === voucher.tpvoucher).length === 1);
        const allowed = product && (product.type === "passport" ? destination.passportIds : destination.addonIds).includes(product.id);
        return allowed ? [] : [`${voucher.descricao || voucher.tpvoucher || "Produto legado"} não é vendido no destino. O voucher pago continuará válido.`];
      }))];
      if (warnings.length && input.confirmUnavailable !== true) {
        throw new CalendarRescheduleError("destination_products_unavailable", "Confirme os itens não vendidos no destino antes de aplicar.", 409, warnings);
      }
    }
    const validUntilByVoucher = new Map<number, string | null>();
    for (const voucher of vouchers) {
      let validUntil = voucher.dtvalidade;
      if (input.validityMode !== "keep") {
        const currentRule = destination ?? (input.validityMode === "destination" ? await getCalendarRule(voucher.dtagenda, client) : null);
        if (input.validityMode === "destination" && !currentRule) throw new CalendarRescheduleError("current_rule_unavailable", "A regra da visita atual não foi encontrada. Defina o prazo manualmente.");
        validUntil = resolveCalendarValidityDate(input.keepVisitDate ? voucher.dtagenda : date, input.validityMode === "custom" ? input.validity! : currentRule!.validity);
      }
      validUntilByVoucher.set(voucher.idvoucher, validUntil);
    }
    if (vouchers.every((voucher) => (input.keepVisitDate || voucher.dtagenda === date) && voucher.dtvalidade === validUntilByVoucher.get(voucher.idvoucher))) {
      throw new CalendarRescheduleError("reschedule_unchanged", "Os vouchers já têm esta data e validade. Nenhum aviso foi reenviado.");
    }
    const changes = [];
    for (const voucher of vouchers) {
      const validUntil = validUntilByVoucher.get(voucher.idvoucher)!;
      if (input.keepVisitDate) await client.query("UPDATE voucher SET dtvalidade = $2::date WHERE idvoucher = $1", [voucher.idvoucher, validUntil]);
      else await client.query("UPDATE voucher SET idagenda = $2, dtvalidade = $3::date WHERE idvoucher = $1", [voucher.idvoucher, destination!.agendaId, validUntil]);
      if (!input.keepVisitDate && voucher.dtagenda !== date) await client.query(`INSERT INTO estancia_voucher_reschedules (voucher_id, original_date, previous_date, target_date, reason, actor_name, actor_cpf, moved_at)
        VALUES ($1, $2::date, $2::date, $3::date, $4, $5, $6, NOW())
        ON CONFLICT (voucher_id) DO UPDATE SET previous_date = EXCLUDED.previous_date, target_date = EXCLUDED.target_date, reason = EXCLUDED.reason, actor_name = EXCLUDED.actor_name, actor_cpf = EXCLUDED.actor_cpf, moved_at = NOW()`, [voucher.idvoucher, voucher.dtagenda, date, reason, actor.name, actor.cpf]);
      changes.push({ voucherId: voucher.idvoucher, purchaseId: voucher.idcompra, previousDate: voucher.dtagenda, targetDate: input.keepVisitDate ? voucher.dtagenda : date, validUntil });
    }
    for (const purchaseId of purchaseIds) {
      await registerOpsAuditLog(client, { origem: "calendario", acao: "remanejar", compraId: purchaseId, descricao: input.keepVisitDate ? "Validade dos vouchers atualizada, mantendo as datas de visita." : vouchers.filter((voucher) => voucher.idcompra === purchaseId).some((voucher) => voucher.dtagenda !== date) ? `Vouchers remanejados para ${date}.` : `Validade dos vouchers atualizada para a visita de ${date}.`, motivo: reason, usuarioNome: [actor.name, actor.cpf ? `(${actor.cpf})` : null].filter(Boolean).join(" ") || null, detalhes: { actor, changes: changes.filter((change) => change.purchaseId === purchaseId), warnings } });
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
  let email = { sent: 0, failed: 0, skipped: purchaseIds.length };
  if (input.notifyEmail) {
    try { email = await notifyCalendarReschedule(vouchers, input.keepVisitDate ? undefined : date); }
    catch (error) { console.error("calendar-reschedule-email-failed", error); email = { sent: 0, failed: purchaseIds.length, skipped: 0 }; }
  }
  return { moved: vouchers.length, purchaseIds, warnings, email };
}
