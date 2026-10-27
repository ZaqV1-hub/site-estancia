import type { PoolClient } from "pg";
import type { B2cProduct } from "@/lib/b2c-catalog-defaults";
import { calendarEventDate } from "@/lib/calendar-event-link";
import { assertCalendarDate, getSaoPauloToday, isEventOnlyProduct, resolveCalendarValidityDate } from "@/lib/calendar-validity";
import { ensureCalendarTables } from "@/lib/calendar-schema";
import { getIngressoDbPool } from "@/lib/ingresso-db";
import { readEstanciaContent, type EstanciaContentData } from "@/lib/estancia-content-store";
import { getAgendaProductAvailability } from "@/lib/painel-agenda-product-availability";
import { registerOpsAuditLog } from "@/lib/ops-audit-log";
import type { CalendarActor, CalendarDay, CalendarMonth, CalendarPurchase, CalendarRule, CalendarSummary, CalendarValidity, SaveCalendarDateInput } from "@/lib/operational-calendar-contracts";
export { ensureCalendarTables } from "@/lib/calendar-schema";

export class CalendarError extends Error {
  constructor(public code: string, message: string, public status = 400) { super(message); }
}

function validateDate(date: string) {
  try { assertCalendarDate(date); }
  catch { throw new CalendarError("calendar_invalid_date", "Informe uma data válida."); }
}

export type CalendarVoucherRow = {
  idvoucher: number; idcompra: number; cpf: string; nmusuario: string | null;
  email: string | null; tpcompra: string; stcompra: string; date: string;
  numvoucher: string | null; tpvoucher: string | null; descricao: string | null;
  vlunicompra: string | null; vldesc: string | null; vltotcompra: string | null;
  stusado: string | null; dtvalidade: string | null;
  original_date: string | null; reason: string | null;
};

function normalizeTitle(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

export function resolveCalendarVoucherProduct(row: Pick<CalendarVoucherRow, "descricao" | "tpvoucher">, products: B2cProduct[]) {
  const title = row.descricao?.trim() || ({ norma: "Passaporte", infan: "Passaporte 6 a 11 anos", isent: "Isento 0 a 5 anos", corte: "Cortesia", escol: "Escolar" }[row.tpvoucher ?? ""] ?? "Adicional");
  const product = products.find((candidate) => normalizeTitle(candidate.title) === normalizeTitle(title));
  const kind: B2cProduct["type"] = product?.type ?? (/passaporte|isento|cortesia/i.test(title) || ["norma", "infan", "isent", "corte", "escol"].includes(row.tpvoucher ?? "") ? "passport" : "addon");
  return { title, productId: product?.id ?? null, kind };
}

function cents(value: string | null) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? Math.round(number * 100) : 0;
}

export function buildCalendarPurchases(rows: CalendarVoucherRow[], products: B2cProduct[], date: string): CalendarPurchase[] {
  const byPurchase = new Map<number, CalendarVoucherRow[]>();
  for (const row of rows) {
    if (row.stcompra !== "conc") continue;
    const group = byPurchase.get(Number(row.idcompra)) ?? [];
    group.push(row);
    byPurchase.set(Number(row.idcompra), group);
  }
  const purchases: CalendarPurchase[] = [];
  for (const [id, allVouchers] of byPurchase) {
    allVouchers.sort((a, b) => a.idvoucher - b.idvoucher);
    const first = allVouchers[0];
    const weights = allVouchers.map((row) => Math.max(0, cents(row.vlunicompra) - cents(row.vldesc)));
    const totalWeight = weights.reduce((sum, value) => sum + value, 0);
    const paidCents = Math.max(0, cents(first.vltotcompra));
    const values = weights.map((weight) => totalWeight > 0 ? Math.floor(paidCents * weight / totalWeight) : 0);
    const remainders = weights.map((weight,index)=>({index,weight,remainder:totalWeight>0?(paidCents*weight)%totalWeight:0}))
      .filter((item)=>item.weight>0).sort((a,b)=>b.remainder-a.remainder||a.index-b.index);
    const unallocated = paidCents-values.reduce((sum,value)=>sum+value,0);
    for (let index=0;index<unallocated && remainders.length;index++) values[remainders[index%remainders.length].index]++;
    const vouchers = allVouchers.flatMap((row, index) => {
      if (row.date !== date || row.stusado === "inv") return [];
      const { title, productId, kind } = resolveCalendarVoucherProduct(row, products);
      return [{ id: Number(row.idvoucher), number: row.numvoucher, type: row.tpvoucher ?? "", productId,
        title, kind, valueCents: values[index], used: row.stusado === "s", invalid: false,
        validUntil: row.dtvalidade, originalDate: row.original_date, rescheduleReason: row.reason }];
    });
    if (!vouchers.length) continue;
    const originalDate = vouchers.find((voucher) => voucher.originalDate)?.originalDate ?? null;
    purchases.push({ id, customerId: first.cpf ?? "", customerName: first.nmusuario ?? "Comprador", email: first.email,
      origin: first.tpcompra === "ponli" ? "site" : "bilheteria",
      status: vouchers.every((voucher) => voucher.used) ? "Utilizado" : "Disponível",
      people: vouchers.filter((voucher) => voucher.kind === "passport").length,
      addons: vouchers.filter((voucher) => voucher.kind === "addon").length,
      valueCents: vouchers.reduce((sum, voucher) => sum + voucher.valueCents, 0), originalDate, vouchers });
  }
  return purchases;
}

export function summarizeCalendarPurchases(purchases: CalendarPurchase[]): CalendarSummary {
  const passports = new Map<string, number>();
  const addons = new Map<string, number>();
  const summary: CalendarSummary = { people: 0, purchases: purchases.length, addons: 0, revenueCents: 0,
    siteCents: 0, boxOfficeCents: 0, rescheduled: 0, passports: [], addonItems: [] };
  for (const purchase of purchases) {
    summary.people += purchase.people;
    summary.addons += purchase.addons;
    summary.revenueCents += purchase.valueCents;
    if (purchase.origin === "site") summary.siteCents += purchase.valueCents;
    else summary.boxOfficeCents += purchase.valueCents;
    if (purchase.originalDate) summary.rescheduled++;
    for (const voucher of purchase.vouchers) {
      const counts = voucher.kind === "passport" ? passports : addons;
      counts.set(voucher.title, (counts.get(voucher.title) ?? 0) + 1);
    }
  }
  summary.passports = [...passports].map(([title, quantity]) => ({ title, quantity }));
  summary.addonItems = [...addons].map(([title, quantity]) => ({ title, quantity }));
  return summary;
}

type RuleRow = { idagenda: number; date: string; tpagenda: string; stagenda: "abe" | "fec" | "lot";
  nmpromocional: string | null; kind: string | null; validity: CalendarValidity | null;
  passport_ids: string[] | null; addon_ids: string[] | null; event_id: string | null; event_title: string | null };

const ruleSelect = `SELECT a.idagenda, to_char(a.dtagenda,'YYYY-MM-DD') AS date,
  a.tpagenda,a.stagenda,a.nmpromocional,r.kind,r.validity,r.passport_ids,r.addon_ids,r.event_id,r.event_title
  FROM agenda a LEFT JOIN estancia_calendar_rules r ON r.agenda_id=a.idagenda`;

async function mapRule(row: RuleRow, client?: PoolClient, content?: EstanciaContentData): Promise<CalendarRule> {
  const availability = row.passport_ids !== null ? { passportIds: row.passport_ids, addonIds: row.addon_ids ?? [] }
    : client ? await legacyAvailabilityInTransaction(row.date, client)
    : await getAgendaProductAvailability(row.date);
  const rule: CalendarRule = { configured: row.validity !== null, agendaId: Number(row.idagenda), date: row.date, type: row.kind === "event" || row.tpagenda === "promo" ? "event" : "dayuse",
    status: row.stagenda, validity: row.validity ?? (row.tpagenda === "promo" ? "day" : "6m"), passportIds: availability.passportIds,
    addonIds: availability.addonIds, eventId: row.event_id, eventTitle: row.event_title ?? row.nmpromocional };
  if (!rule.eventId && row.kind !== "dayuse") {
    const site = content ?? (client
      ? (await client.query<{content_json:EstanciaContentData}>("SELECT content_json FROM estancia_site_content WHERE content_key='main'")).rows[0]?.content_json
      : await readEstanciaContent());
    const matches = site?.events.filter((event) => calendarEventDate(event) === row.date) ?? [];
    if (matches.length === 1) {
      rule.type = "event";
      rule.eventId = matches[0].id;
      rule.eventTitle = matches[0].title;
    }
  }
  return rule;
}

async function legacyAvailabilityInTransaction(date: string, client: PoolClient) {
  const result = await client.query<{content_json:EstanciaContentData}>("SELECT content_json FROM estancia_site_content WHERE content_key='main'");
  const products=result.rows[0]?.content_json.products??[];
  const { readLegacyAgendaAvailability } = await import("@/lib/painel-agenda-product-availability");
  return readLegacyAgendaAvailability(date) ?? {
    passportIds: products.filter((product)=>product.active && product.type==="passport" && !isEventOnlyProduct(product)).map((product)=>product.id),
    addonIds: products.filter((product)=>product.active && product.type==="addon").map((product)=>product.id),
  };
}

export async function getCalendarRule(date: string, client?: PoolClient): Promise<CalendarRule | null> {
  validateDate(date);
  if (!client) await ensureCalendarTables();
  const result = await (client ?? getIngressoDbPool()).query<RuleRow>(`${ruleSelect}
    WHERE a.dtagenda=$1::date AND a.tpagenda IN ('padra','promo') ORDER BY a.idagenda LIMIT 1`, [date]);
  if (!result.rows[0]) return null;
  return mapRule(result.rows[0],client);
}

async function loadVoucherRows(start: string, end: string) {
  const result = await getIngressoDbPool().query<CalendarVoucherRow>(`
    SELECT v.idvoucher,v.idcompra,c.cpf,u.nmusuario,u.email,c.tpcompra,c.stcompra,
      to_char(a.dtagenda,'YYYY-MM-DD') AS date,v.numvoucher,v.tpvoucher,v.descricao,
      v.vlunicompra::text,v.vldesc::text,c.vltotcompra::text,v.stusado,
      to_char(v.dtvalidade,'YYYY-MM-DD') AS dtvalidade,
      to_char(m.original_date,'YYYY-MM-DD') AS original_date,m.reason
    FROM voucher v JOIN compra c ON c.idcompra=v.idcompra JOIN agenda a ON a.idagenda=v.idagenda
    LEFT JOIN usuario u ON u.cpf=c.cpf
    LEFT JOIN estancia_voucher_reschedules m ON m.voucher_id=v.idvoucher
    WHERE c.stcompra='conc' AND c.tpcompra IN ('ponli','reser','bilhe')
      AND a.tpagenda IN ('padra','promo')
      AND EXISTS (SELECT 1 FROM voucher chosen JOIN agenda day ON day.idagenda=chosen.idagenda
        WHERE chosen.idcompra=c.idcompra AND day.dtagenda BETWEEN $1::date AND $2::date)
    ORDER BY c.idcompra DESC,v.idvoucher`, [start, end]);
  return result.rows;
}

export async function getCalendarMonth(month: number, year: number): Promise<CalendarMonth> {
  if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new CalendarError("calendar_invalid_month", "Informe um mês e ano válidos.");
  }
  await ensureCalendarTables();
  const start = `${year}-${String(month).padStart(2,"0")}-01`;
  const end = new Date(Date.UTC(year,month,0,12)).toISOString().slice(0,10);
  const [result, rows, content] = await Promise.all([
    getIngressoDbPool().query<RuleRow>(`${ruleSelect} WHERE a.dtagenda BETWEEN $1::date AND $2::date
      AND a.tpagenda IN ('padra','promo') ORDER BY a.dtagenda,a.idagenda`, [start,end]),
    loadVoucherRows(start,end), readEstanciaContent(),
  ]);
  const rules = await Promise.all(result.rows.map((row)=>mapRule(row, undefined, content)));
  return { month,year,today:getSaoPauloToday(),days:rules.map((rule)=>({ date:rule.date,rule,
    summary:summarizeCalendarPurchases(buildCalendarPurchases(rows,content.products,rule.date)) })) };
}

export async function getCalendarDay(date: string): Promise<CalendarDay> {
  validateDate(date);
  await ensureCalendarTables();
  const [rule, rows, content] = await Promise.all([getCalendarRule(date), loadVoucherRows(date,date), readEstanciaContent()]);
  const purchases = buildCalendarPurchases(rows,content.products,date);
  return { date,rule,purchases,summary:summarizeCalendarPurchases(purchases),products:content.products,
    event: rule?.type==="event" ? content.events.find((event)=>event.id===rule.eventId)??null : null };
}

export async function listOpenCalendarDestinations(): Promise<CalendarRule[]> {
  await ensureCalendarTables();
  const result = await getIngressoDbPool().query<RuleRow>(`${ruleSelect}
    WHERE a.dtagenda>$1::date AND a.stagenda='abe' AND a.tpagenda IN ('padra','promo') ORDER BY a.dtagenda`, [getSaoPauloToday()]);
  const content = await readEstanciaContent();
  return Promise.all(result.rows.map((row)=>mapRule(row, undefined, content)));
}

export async function saveCalendarDate(input: SaveCalendarDateInput, actor: CalendarActor, transactionClient?: PoolClient): Promise<CalendarRule> {
  try { assertCalendarDate(input.date); resolveCalendarValidityDate(input.date,input.validity); }
  catch { throw new CalendarError("calendar_invalid_date", "Informe uma data e validade válidas."); }
  if (!["abe","fec"].includes(input.status)) throw new CalendarError("calendar_invalid_status", "Selecione Aberta ou Fechada.");
  if (input.type && !["dayuse","event"].includes(input.type)) throw new CalendarError("calendar_invalid_type", "Tipo de data inválido.");
  if (!Array.isArray(input.passportIds) || !input.passportIds.length || !Array.isArray(input.addonIds)
    || [...input.passportIds,...input.addonIds].some((id)=>typeof id!=="string")) {
    throw new CalendarError("calendar_passport_required", "Selecione ao menos um passaporte e confira os adicionais.");
  }
  const content = transactionClient
    ? (await transactionClient.query<{content_json:EstanciaContentData}>("SELECT content_json FROM estancia_site_content WHERE content_key='main'")).rows[0]?.content_json
    : await readEstanciaContent();
  if (!content) throw new CalendarError("calendar_catalog_unavailable", "Catálogo indisponível.",503);
  const type = input.type ?? "dayuse";
  const passports = [...new Set(input.passportIds)];
  const addons = [...new Set(input.addonIds)];
  for (const [ids,kind] of [[passports,"passport"],[addons,"addon"]] as const) {
    for (const id of ids) {
      const product = content.products.find((product)=>product.id===id && product.type===kind && product.active);
      if (!product || (type!=="event" && isEventOnlyProduct(product))) {
        throw new CalendarError("calendar_invalid_product", "Selecione produtos ativos; passaportes especiais são exclusivos de eventos.");
      }
    }
  }
  if (type==="event" && (!input.eventId?.trim() || !input.eventTitle?.trim())) {
    throw new CalendarError("calendar_event_required", "Informe o evento vinculado a esta data.");
  }
  if (!transactionClient) await ensureCalendarTables();
  const client = transactionClient ?? await getIngressoDbPool().connect();
  try {
    if (!transactionClient) await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", ["estancia-calendar:"+input.date]);
    const existing = await client.query<{idagenda:number;tpagenda:string}>(
      "SELECT idagenda,tpagenda FROM agenda WHERE dtagenda=$1::date FOR UPDATE",[input.date]);
    let agendaId = input.agendaId ?? null;
    if (agendaId !== null && (!Number.isSafeInteger(agendaId) || agendaId<=0)) {
      throw new CalendarError("calendar_invalid_agenda", "Data não encontrada.",404);
    }
    if (agendaId && !existing.rows.some((row)=>Number(row.idagenda)===agendaId)) {
      throw new CalendarError("calendar_date_mismatch", "A data não corresponde à agenda editada.",409);
    }
    if (!agendaId && (input.date<=getSaoPauloToday() || existing.rows.length)) {
      throw new CalendarError("calendar_date_unavailable", "A nova data precisa ser futura e ainda não existir.",409);
    }
    const oldRow = existing.rows.find((row)=>Number(row.idagenda)===agendaId);
    if (oldRow && !["padra","promo"].includes(oldRow.tpagenda)) {
      throw new CalendarError("calendar_b2c_only", "Esta agenda não é uma data de day use ou evento.",409);
    }
    const currentRule = oldRow ? await getCalendarRule(input.date, client) : null;
    if (oldRow && (currentRule?.type !== type || (currentRule.eventId && currentRule.eventId !== input.eventId))) {
      throw new CalendarError("calendar_event_type_locked", "Use a configuração do evento no Site; o tipo de uma data publicada não pode ser alterado.",409);
    }
    if (!agendaId) {
      const price = await client.query<{idtabpreco:number}>("SELECT idtabpreco FROM tabpreco WHERE COALESCE(sttabpreco,'ativ') NOT IN ('ina','inat') ORDER BY idtabpreco LIMIT 1");
      if (!price.rows[0]) throw new CalendarError("calendar_legacy_configuration", "Cadastro base de ingressos indisponível.",409);
      const inserted = await client.query<{idagenda:number}>(`INSERT INTO agenda
        (dtagenda,idtabpreco,tpagenda,stagenda,nmpromocional,dspromocional,dtcadastro,hrcadastro)
        VALUES ($1::date,$2,$3,$4,$5,$6,CURRENT_DATE,CURRENT_TIME) RETURNING idagenda`,
        [input.date,price.rows[0].idtabpreco,type==="event"?"promo":"padra",input.status,
          type==="event"?input.eventTitle:null,type==="event"?input.eventDescription:null]);
      agendaId=Number(inserted.rows[0].idagenda);
    } else {
      await client.query(`UPDATE agenda SET stagenda=$2,tpagenda=$3,
        nmpromocional=CASE WHEN $3='promo' THEN $4 ELSE NULL END,
        dspromocional=CASE WHEN $3='promo' THEN COALESCE($5,dspromocional) ELSE NULL END WHERE idagenda=$1`,
        [agendaId,input.status,type==="event"?"promo":"padra",input.eventTitle??null,input.eventDescription??null]);
    }
    await client.query(`INSERT INTO estancia_calendar_rules
      (date,agenda_id,kind,status,validity,passport_ids,addon_ids,event_id,event_title)
      VALUES ($1::date,$2,$3,$4,$5,$6::text[],$7::text[],$8,$9)
      ON CONFLICT(date) DO UPDATE SET kind=excluded.kind,status=excluded.status,validity=excluded.validity,
        passport_ids=excluded.passport_ids,addon_ids=excluded.addon_ids,event_id=excluded.event_id,
        event_title=excluded.event_title,updated_at=now()`,
      [input.date,agendaId,type,input.status,input.validity,passports,addons,input.eventId??null,input.eventTitle??null]);
    await registerOpsAuditLog(client,{origem:"calendar",acao:input.agendaId?"date_update":"date_create",
      descricao:`${input.agendaId?"Configuração":"Abertura"} da data ${input.date}`,
      motivo:"Configuração da oferta e validade da data",usuarioNome:actor.name??actor.cpf,
      detalhes:{...input,actorCpf:actor.cpf}});
    if (!transactionClient) await client.query("COMMIT");
    return { configured:true,agendaId,date:input.date,type,status:input.status,validity:input.validity,
      passportIds:passports,addonIds:addons,eventId:input.eventId??null,eventTitle:input.eventTitle??null };
  } catch(error) {
    if (!transactionClient) await client.query("ROLLBACK");
    throw error;
  } finally { if (!transactionClient) client.release(); }
}
