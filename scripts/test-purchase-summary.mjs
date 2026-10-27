import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { Pool } from "pg";

const base = new URL(process.env.CALENDAR_TEST_BASE_URL ?? "http://localhost:3002");
assert(["localhost", "127.0.0.1"].includes(base.hostname));
assert(["localhost", "127.0.0.1"].includes(process.env.INGRESSO_DB_HOST));
assert.equal(process.env.INGRESSO_DB_NAME, "estancia_calendar_local");
assert(!process.env.INGRESSO_DATABASE_URL);
const pool = new Pool({ host: process.env.INGRESSO_DB_HOST, port: Number(process.env.INGRESSO_DB_PORT), database: process.env.INGRESSO_DB_NAME, user: process.env.INGRESSO_DB_USER });
const marker = randomUUID().slice(0, 4);
const output = ".local/calendar-validation/rincao-summary-tests";
let cookie;
try {
  const login = await fetch(new URL("/api/painel/session", base), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ login: "22181922845", senha: "12345" }) });
  assert.equal(login.status, 200);
  cookie = login.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
  const agenda = (await pool.query("SELECT idagenda,to_char(dtagenda,'YYYY-MM-DD') AS date FROM agenda WHERE tpagenda='padra' AND dtagenda>CURRENT_DATE ORDER BY dtagenda LIMIT 1")).rows[0];
  assert(agenda);
  await pool.query("INSERT INTO cliente_tipos(idtipo,nome) VALUES(4,'Escola') ON CONFLICT DO NOTHING");
  const school = (await pool.query("INSERT INTO clientes(idtipo,nome) VALUES(4,$1) RETURNING idcliente", [`Colégio de teste local ${marker}`])).rows[0].idcliente;
  await mkdir(output, { recursive: true });
  const cases = [
    { name: "dayuse", status: "conc", total: 173, count: 3, school: false },
    { name: "school", status: "conc", total: 390, count: 4, school: true },
    { name: "school-many", status: "conc", total: 3120, count: 24, school: true },
    { name: "pending", status: "pend", total: 69, count: 1, school: false },
    { name: "cancelled", status: "canc", total: 69, count: 1, school: false },
  ];
  const report = [];
  for (const fixture of cases) {
    const purchaseId = (await pool.query("INSERT INTO compra(cpf,tpcompra,dtcompra,hrcompra,formapag,vltotcompra,stcompra) VALUES('22181922845','ponli',CURRENT_DATE,CURRENT_TIME,'pgseg',$1,$2) RETURNING idcompra", [fixture.total, fixture.status])).rows[0].idcompra;
    const voucherIds = [];
    for (let index = 0; index < fixture.count; index++) {
      const addon = !fixture.school && index === 2;
      const used = fixture.status === "conc" && index === 0 ? "s" : fixture.name === "school" && index === 3 ? "inv" : "n";
      const voucherId = (await pool.query(`INSERT INTO voucher(idcompra,numvoucher,idagenda,tpvoucher,descricao,vlunicompra,stusado,dtvalidade,dtuso,hruso,idescola,nomealuno,turma,periodo)
        VALUES($1,$2,$3,$4,$5,$6,$7,($8::date+INTERVAL '6 days')::date,$9,$10,$11,$12,$13,$14) RETURNING idvoucher`, [
        purchaseId, `V${marker}${purchaseId.toString(36)}${index.toString(36).padStart(2, "0")}`, agenda.idagenda, fixture.school ? "escol" : addon ? "espec" : "norma",
        fixture.school ? "Escolar" : addon ? "Café da manhã da roça" : "Passaporte Estancieiro Adulto",
        used === "inv" ? 0 : fixture.school ? 130 : addon ? 35 : 69, used, agenda.date,
        used === "s" ? agenda.date : null, used === "s" ? "10:15:00" : null, fixture.school ? school : null,
        fixture.school ? `Aluno de teste ${index + 1}` : null, fixture.school ? "Fundamental II - 8º ano B" : null, fixture.school ? "Manhã" : null,
      ])).rows[0].idvoucher;
      voucherIds.push(voucherId);
      if (index === 1 && fixture.status === "conc") await pool.query(`INSERT INTO estancia_voucher_reschedules(voucher_id,original_date,previous_date,target_date,reason,actor_name)
        VALUES($1,($2::date-INTERVAL '7 days')::date,($2::date-INTERVAL '7 days')::date,$2::date,'Chuva','Teste local')`, [voucherId, agenda.date]);
    }
    const detail = await fetch(new URL(`/painel/compras/${purchaseId}`, base), { headers: { Cookie: cookie } });
    assert.equal(detail.status, 200);
    const html = await detail.text();
    assert(html.includes("Gerar Resumo"));
    assert(html.includes(`calendar-purchase-status-${fixture.status}`));
    if (fixture.status === "conc") assert(html.includes("calendar-voucher-used"));
    const pdf = await fetch(new URL(`/api/painel/compras/${purchaseId}/resumo`, base), { headers: { Cookie: cookie } });
    assert.equal(pdf.status, 200);
    assert.equal(pdf.headers.get("content-type"), "application/pdf");
    const buffer = Buffer.from(await pdf.arrayBuffer());
    assert.equal(buffer.subarray(0, 5).toString(), "%PDF-");
    await writeFile(`${output}/${fixture.name}.pdf`, buffer);
    report.push({ ...fixture, purchaseId, voucherIds, visit: agenda.date, file: `${output}/${fixture.name}.pdf` });
    console.log(`PASS ${fixture.name}: real detail page and authenticated PDF`);
  }
  const list = await fetch(new URL("/painel/compras", base), { headers: { Cookie: cookie } });
  const html = await list.text();
  for (const status of ["conc", "pend", "canc"]) assert(html.includes(`calendar-purchase-status-${status}`));
  assert(html.includes("Vouchers por data de visita"));
  const vouchers = await fetch(new URL(`/painel/compras/vouchers?dtagenda%5Bde%5D=${agenda.date}&dtagenda%5Bate%5D=${agenda.date}`, base), { headers: { Cookie: cookie } });
  assert.equal(vouchers.status, 200);
  assert((await vouchers.text()).includes("calendar-voucher-list"));
  await writeFile(`${output}/fixtures.json`, JSON.stringify(report, null, 2));
  console.log("PASS purchase statuses and voucher visit-date access; local fixtures retained for visual review");
} finally { await pool.end(); }
