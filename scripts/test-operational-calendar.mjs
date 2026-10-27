import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";

// This fixture deliberately refuses shared databases and remote HTTP targets.
const base = new URL(process.env.CALENDAR_TEST_BASE_URL ?? "http://localhost:3002");
assert(["localhost", "127.0.0.1"].includes(base.hostname));
assert(["localhost", "127.0.0.1"].includes(process.env.INGRESSO_DB_HOST));
assert.equal(process.env.INGRESSO_DB_NAME, "estancia_calendar_local");
assert(!process.env.INGRESSO_DATABASE_URL);
assert(!process.env.EMAIL_SMTP_USERNAME && !process.env.EMAIL_SMTP_PASSWORD);
const pool = new Pool({ host: process.env.INGRESSO_DB_HOST, port: Number(process.env.INGRESSO_DB_PORT), database: process.env.INGRESSO_DB_NAME, user: process.env.INGRESSO_DB_USER });
const marker = randomUUID().slice(0, 8);
let cookie = "";
async function request(path, body, expected = 200, method = body ? "POST" : "GET") {
  const form = body instanceof FormData;
  const response = await fetch(new URL(path, base), { method, headers: { ...(cookie ? { Cookie: cookie } : {}), ...(!form && body ? { "Content-Type": "application/json" } : {}) }, body: body ? form ? body : JSON.stringify(body) : undefined });
  if (response.headers.get("set-cookie")) cookie = response.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
  const payload = await response.json();
  assert.equal(response.status, expected, `${path}: ${JSON.stringify(payload)}`);
  return payload;
}
const checks = [];
function passed(name) { checks.push(name); console.log(`PASS ${name}`); }
try {
  await request("/api/painel/calendario", undefined, 401);
  await request("/api/painel/session", { login: "22181922845", senha: "12345" });
  passed("authenticated access; unauthenticated calendar rejected");
  const stored = await pool.query("SELECT content_json FROM estancia_site_content WHERE content_key='main'");
  const products = stored.rows[0].content_json.products.filter((product) => product.active);
  const passport = products.find((product) => product.type === "passport" && /adulto/i.test(product.title));
  const addon = products.find((product) => product.type === "addon" && /caf[eé]/i.test(product.title));
  assert(passport && addon);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const dates = [];
  for (let offset = 1; dates.length < 3 && offset < 365; offset++) {
    const date = new Date(`${today}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + offset);
    const key = date.toISOString().slice(0, 10);
    if (!(await pool.query("SELECT 1 FROM agenda WHERE dtagenda=$1::date", [key])).rowCount) dates.push(key);
  }
  assert.equal(dates.length, 3);
  const config = (date) => ({ date, status: "abe", validity: "day", passportIds: [passport.id], addonIds: [addon.id] });
  const source = (await request("/api/painel/calendario", config(dates[0]))).data;
  const destination = (await request("/api/painel/calendario", { ...config(dates[1]), addonIds: [], validity: "7d" })).data;
  await request("/api/painel/calendario", config(dates[0]), 409);
  await request("/api/painel/calendario", { ...config("2026-02-30") }, 400);
  await request("/api/painel/calendario", { ...config(dates[2]), passportIds: [] }, 400);
  passed("date creation rejects duplicates, impossible dates and missing passports");
  const eventTitle = `Evento de teste ${marker}`.padEnd(52, "x");
  const form = new FormData();
  for (const [key, value] of Object.entries({ title: eventTitle, description: "Evento local de validação do calendário.", eventMode: "date", eventDate: dates[2], eventPageMode: "with-page", pageContent: "Programação criada somente na base local.", buttonLabel: "Compre seu ingresso!", validity: "day", status: "abe", active: "on" })) form.set(key, value);
  form.append("passportIds", passport.id); form.append("addonIds", addon.id);
  form.set("image", new Blob([await readFile("public/brand/estancia-logo-dark.png")], { type: "image/png" }), "calendar-test.png");
  const event = (await request("/api/painel/calendar-events", form)).data;
  const eventDay = (await request(`/api/painel/calendario?date=${dates[2]}`)).data;
  assert.equal(eventDay.rule.type, "event"); assert(eventDay.rule.eventId);
  assert.equal(eventDay.rule.eventTitle, eventTitle);
  assert.equal(eventDay.rule.eventTitle.length, 52);
  passed("internal event and optional page linked atomically to its date");
  const external = new FormData();
  for (const [key, value] of Object.entries({ title: `Evento externo ${marker}`, description: "Link externo local de validação.", eventMode: "link", href: "https://example.com/evento", active: "on" })) external.set(key, value);
  external.set("image", new Blob([await readFile("public/brand/estancia-logo-dark.png")], { type: "image/png" }), "calendar-test.png");
  const externalEvent = (await request("/api/painel/calendar-events", external)).data;
  assert.equal(externalEvent.date, null);
  external.set("href", "javascript:alert(1)");
  await request("/api/painel/calendar-events", external, 400);
  passed("external event needs no date; unsafe external URL rejected");

  const purchaseIds = [];
  const voucherIds = [];
  for (const origin of ["ponli", "reser"]) {
    const price = origin === "ponli" ? passport.sitePrice : passport.boxOfficePrice;
    const addonPrice = origin === "ponli" ? addon.sitePrice : addon.boxOfficePrice;
    const total = (Number(price) + Number(addonPrice)).toFixed(2);
    const purchase = await pool.query(`INSERT INTO compra(cpf,tpcompra,dtcompra,hrcompra,formapag,vltotcompra,stcompra)
      VALUES('22181922845',$1,CURRENT_DATE,CURRENT_TIME,$2,$3,'conc') RETURNING idcompra`, [origin, origin === "ponli" ? "pgseg" : "dinhe", total]);
    const id = purchase.rows[0].idcompra; purchaseIds.push(id);
    if (origin === "ponli") await pool.query("INSERT INTO pagpagseguro(idcompra,idpagseguro,status,date) VALUES($1,$2,3,CURRENT_TIMESTAMP)", [id, `local-${marker}`]);
    for (const product of [passport, addon]) {
      const value = origin === "ponli" ? product.sitePrice : product.boxOfficePrice;
      const voucher = await pool.query(`INSERT INTO voucher(idcompra,numvoucher,idagenda,tpvoucher,vlunicompra,stusado,dtvalidade,descricao)
        VALUES($1,$2,$3,$4,$5,'n',$6::date,$7) RETURNING idvoucher`, [id, `T${randomUUID().replaceAll("-", "").slice(0, 9)}`, source.agendaId, product.voucherType, value, dates[0], product.title]);
      voucherIds.push(voucher.rows[0].idvoucher);
    }
  }
  const before = (await request(`/api/painel/calendario?date=${dates[0]}`)).data;
  assert.equal(before.summary.people, 2); assert.equal(before.summary.addons, 2); assert.equal(before.summary.purchases, 2);
  assert.equal(before.summary.siteCents + before.summary.boxOfficeCents, before.summary.revenueCents);
  const month = (await request(`/api/painel/calendario?month=${Number(dates[0].slice(5, 7))}&year=${dates[0].slice(0, 4)}`)).data;
  assert.deepEqual(month.days.find((day) => day.date === dates[0]).summary, before.summary);
  passed("calendar/day totals agree; site and box office people/addons/revenue counted once");
  const move = { purchaseIds, targetDate: dates[1], validityMode: "destination", reason: "Chuva", notifyEmail: true };
  const warning = await request("/api/painel/calendario/remanejar", move, 409);
  assert.equal(warning.error.code, "destination_products_unavailable"); assert(warning.error.warnings.length);
  assert.equal((await request(`/api/painel/calendario?date=${dates[0]}`)).data.summary.people, 2);
  const moved = (await request("/api/painel/calendario/remanejar", { ...move, confirmUnavailable: true })).data;
  assert.equal(moved.moved, 4); assert.equal(moved.email.sent, 0);
  const afterSource = (await request(`/api/painel/calendario?date=${dates[0]}`)).data;
  const afterDestination = (await request(`/api/painel/calendario?date=${dates[1]}`)).data;
  assert.equal(afterSource.summary.people, 0); assert.equal(afterSource.summary.revenueCents, 0);
  assert.equal(afterDestination.summary.people, 2); assert.equal(afterDestination.summary.rescheduled, 2);
  assert.equal(afterDestination.summary.revenueCents, before.summary.revenueCents);
  assert(afterDestination.purchases.every((purchase) => purchase.originalDate === dates[0]));
  const audit = await pool.query("SELECT compra_id,usuario_nome,motivo FROM edicoes_log WHERE compra_id=ANY($1::int[]) AND acao='remanejar'", [purchaseIds]);
  assert.equal(audit.rowCount, 2); assert(audit.rows.every((row) => row.usuario_nome && row.motivo === "Chuva"));
  passed("batch move warns then preserves prices, updates both dates and records operator/history");
  await request("/api/painel/calendario/remanejar", { ...move, confirmUnavailable: true }, 409);
  await pool.query("UPDATE voucher SET stusado='s' WHERE idvoucher=$1", [voucherIds[0]]);
  await request("/api/painel/calendario/remanejar", { ...move, targetDate: dates[2], confirmUnavailable: true }, 409);
  assert.equal((await request(`/api/painel/calendario?date=${dates[1]}`)).data.summary.people, 2);
  await pool.query("UPDATE voucher SET stusado='n' WHERE idvoucher=$1", [voucherIds[0]]);
  passed("duplicate operation and used voucher batch rejected without partial updates");
  const currentAgenda = (await pool.query("SELECT idagenda FROM agenda WHERE dtagenda=$1::date LIMIT 1", [today])).rows[0];
  assert(currentAgenda);
  const currentPurchase = (await pool.query(`INSERT INTO compra(cpf,tpcompra,dtcompra,hrcompra,formapag,vltotcompra,stcompra)
    VALUES('22181922845','reser',CURRENT_DATE,CURRENT_TIME,'dinhe',0,'conc') RETURNING idcompra`)).rows[0].idcompra;
  const currentVoucher = (await pool.query(`INSERT INTO voucher(idcompra,numvoucher,idagenda,tpvoucher,vlunicompra,stusado,dtvalidade,descricao)
    VALUES($1,$2,$3,'norma',0,'n',$4::date,$5) RETURNING idvoucher`, [currentPurchase, `T${randomUUID().replaceAll("-", "").slice(0, 9)}`, currentAgenda.idagenda, today, passport.title])).rows[0].idvoucher;
  await pool.query("UPDATE agenda SET stagenda='fec' WHERE idagenda=$1", [currentAgenda.idagenda]);
  const expiryEdit=(await request("/api/painel/calendario/remanejar",{purchaseIds:[currentPurchase],voucherIds:[currentVoucher],keepVisitDate:true,targetDate:"",validityMode:"custom",validity:"7d",reason:"Pedido do cliente",notifyEmail:false})).data;
  assert.equal(expiryEdit.moved,1);
  const edited=(await pool.query("SELECT idagenda,dtvalidade::text FROM voucher WHERE idvoucher=$1",[currentVoucher])).rows[0];
  assert.equal(edited.idagenda,currentAgenda.idagenda); assert(edited.dtvalidade>today);
  assert.equal((await pool.query("SELECT 1 FROM estancia_voucher_reschedules WHERE voucher_id=$1",[currentVoucher])).rowCount,0);
  passed("individual expiry can change on today's closed date without moving or adding reschedule badge");
  const customerLogin = await request("/api/auth/login", { cpf: "22181922845", senha: "12345" }); assert(customerLogin.ok);
  const customer = await request("/api/me/vouchers?limit=50&offset=0");
  const customerPurchases = customer.data.purchases.filter((purchase) => purchaseIds.includes(purchase.id));
  assert.equal(customerPurchases.length, 2);
  assert(customerPurchases.every((purchase) => purchase.vouchers.every((voucher) => voucher.originalDate === dates[0] && voucher.visitDate === dates[1] && voucher.validUntil)));
  passed("customer area shows new visit, original date and per-voucher validity");
  const summaryPdf=await fetch(new URL(`/api/painel/compras/${purchaseIds[0]}/resumo`,base),{headers:{Cookie:cookie}});
  // Public login uses a separate cookie; obtain the panel session again for its PDF.
  await request("/api/painel/session", { login: "22181922845", senha: "12345" });
  const panelPdf=summaryPdf.status===200?summaryPdf:await fetch(new URL(`/api/painel/compras/${purchaseIds[0]}/resumo`,base),{headers:{Cookie:cookie}});
  assert.equal(panelPdf.status,200);assert.equal(panelPdf.headers.get("content-type"),"application/pdf");
  const pdf=Buffer.from(await panelPdf.arrayBuffer());assert.equal(pdf.subarray(0,4).toString(),"%PDF");
  await writeFile(".local/calendar-validation/purchase-summary.pdf",pdf);
  passed("authenticated purchase summary exports a real PDF");
  const report = { checks, dates, purchaseIds, voucherIds, event, source, destination, totals: before.summary, email: moved.email, timestamp: new Date().toISOString() };
  await mkdir(".local/calendar-validation", { recursive: true });
  await writeFile(".local/calendar-validation/integration.json", JSON.stringify(report, null, 2));
  console.log(`Validated ${checks.length} integration scenarios. Local fixture retained for browser review.`);
} finally { await pool.end(); }
