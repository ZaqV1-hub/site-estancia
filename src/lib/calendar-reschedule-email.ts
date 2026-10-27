import { getIngressoDbPool } from "@/lib/ingresso-db";
import { queueLegacyEmail } from "@/lib/legacy-email";
import type { RescheduleVoucherRow } from "@/lib/calendar-reschedule";
export async function notifyCalendarReschedule(vouchers: RescheduleVoucherRow[], targetDate?: string) {
  const result = { sent: 0, failed: 0, skipped: 0 };
  for (const purchaseId of new Set(vouchers.map((voucher) => voucher.idcompra))) {
    const customer = vouchers.find((voucher) => voucher.idcompra === purchaseId)!;
    if (!customer.email) { result.skipped += 1; continue; }
    try {
      const emailId = await queueLegacyEmail({ to: customer.email, toName: customer.nmusuario, subject: `Vouchers atualizados · compra ${purchaseId}`, html: `<p>Os vouchers da compra ${purchaseId} foram atualizados. ${targetDate ? `Data da visita: ${targetDate.split("-").reverse().join("/")}.` : "As datas das visitas foram mantidas."}</p><p>Consulte a data e a validade de cada voucher na sua área do cliente.</p>` });
      const status = emailId ? await getIngressoDbPool().query<{ stemail: string; erros: number }>("SELECT stemail, erros FROM email WHERE idemail = $1", [emailId]) : null;
      if (status?.rows[0]?.stemail === "env") result.sent += 1;
      else if (status?.rows[0]?.stemail === "nov" && !Number(status.rows[0].erros)) result.skipped += 1;
      else result.failed += 1;
    } catch (error) { console.error("calendar-reschedule-notification-failed", { purchaseId, error }); result.failed += 1; }
  }
  return result;
}
