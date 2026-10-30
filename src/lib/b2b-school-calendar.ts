import { Pool } from "pg";

export type SchoolTripSummary = {
  agendaId: number; clientId: number; date: string; name: string; status: string;
  students: number; educators: number; paid: number; pending: number; cancelled: number;
  used: number; paidCents: number; pendingCents: number;
};
export type SchoolTripParticipant = {
  purchaseId: number; voucher: string; name: string; role: string; className: string;
  buyer: string; phone: string; paymentId: string; valueCents: number;
  purchaseDate: string; status: string; used: boolean;
};
export type SchoolTripDetail = {trip: SchoolTripSummary; participants: SchoolTripParticipant[]};
export function schoolTripSourceHref(trip: Pick<SchoolTripSummary,"agendaId"|"clientId">) {
  return `https://estancia.ecologicodasaguas.brevia.company/painel/clientes/detalhe-passeio/idagenda/${trip.agendaId}/idcliente/${trip.clientId}`;
}
function pool() {
  if (!process.env.B2B_READ_DATABASE_URL) throw new Error("B2B read connection unavailable");
  const shared = globalThis as typeof globalThis & {schoolReadPool?: Pool};
  return shared.schoolReadPool ??= new Pool({connectionString:process.env.B2B_READ_DATABASE_URL,
    max:2, connectionTimeoutMillis:5000, query_timeout:15000, idleTimeoutMillis:30000,
    options:"-c default_transaction_read_only=on", application_name:"estancia-dayuse-school-read"});
}
const summarySql = `SELECT a.idagenda, ae.idcliente, to_char(a.dtagenda,'YYYY-MM-DD') AS date,
  cl.nome AS name, COALESCE(ae.stagenda_cli,a.stagenda,'abe') AS status,
  COUNT(v.idvoucher) FILTER (WHERE COALESCE(v.tpparticipante,'aluno') <> 'educador')::int AS students,
  COUNT(v.idvoucher) FILTER (WHERE v.tpparticipante='educador')::int AS educators,
  COUNT(v.idvoucher) FILTER (WHERE c.stcompra='conc')::int AS paid,
  COUNT(v.idvoucher) FILTER (WHERE c.stcompra='pend')::int AS pending,
  COUNT(v.idvoucher) FILTER (WHERE c.stcompra='canc')::int AS cancelled,
  COUNT(v.idvoucher) FILTER (WHERE v.stusado='s' AND c.stcompra='conc')::int AS used,
  COALESCE(SUM(v.vlunicompra) FILTER (WHERE c.stcompra='conc'),0)::text AS paid_value,
  COALESCE(SUM(v.vlunicompra) FILTER (WHERE c.stcompra='pend'),0)::text AS pending_value
  FROM (SELECT DISTINCT ON (idagenda,idcliente) idagenda,idcliente,stagenda_cli FROM agenda_extras ORDER BY idagenda,idcliente,idextra DESC) ae
  JOIN agenda a ON a.idagenda=ae.idagenda JOIN clientes cl ON cl.idcliente=ae.idcliente
  LEFT JOIN voucher v ON v.idagenda=a.idagenda AND v.idescola=ae.idcliente
  LEFT JOIN compra c ON c.idcompra=v.idcompra`;
type SummaryRow = SchoolTripSummary & {idagenda:number;idcliente:number;paid_value:string;pending_value:string};
function mapTrip(r:SummaryRow):SchoolTripSummary {
  return {agendaId:Number(r.idagenda),clientId:Number(r.idcliente),date:r.date,name:r.name,status:r.status,
    students:r.students,educators:r.educators,paid:r.paid,pending:r.pending,cancelled:r.cancelled,used:r.used,
    paidCents:Math.round(Number(r.paid_value)*100),pendingCents:Math.round(Number(r.pending_value)*100)};
}
export async function listSchoolTrips(start:string,end:string):Promise<SchoolTripSummary[]> {
  const result=await pool().query<SummaryRow>(`${summarySql} WHERE a.dtagenda BETWEEN $1::date AND $2::date
    GROUP BY a.idagenda,ae.idcliente,a.dtagenda,cl.nome,ae.stagenda_cli,a.stagenda ORDER BY a.dtagenda,cl.nome`,[start,end]);
  return result.rows.map(mapTrip);
}
export async function getSchoolTrip(agendaId:number,clientId:number):Promise<SchoolTripDetail|null> {
  if (![agendaId,clientId].every(n=>Number.isSafeInteger(n)&&n>0)) return null;
  const summary=await pool().query<SummaryRow>(`${summarySql} WHERE a.idagenda=$1 AND ae.idcliente=$2
    GROUP BY a.idagenda,ae.idcliente,a.dtagenda,cl.nome,ae.stagenda_cli,a.stagenda`,[agendaId,clientId]);
  if (!summary.rows[0]) return null;
  const result=await pool().query(`SELECT v.idcompra,v.numvoucher,v.nomealuno,v.nomeeducador,v.tpparticipante,
    COALESCE(NULLIF(v.turma_nome,''),NULLIF(v.turma,''),'-') AS class_name,
    v.vlunicompra::text,c.nomecomprador,c.whatsapp,c.stcompra,v.stusado,
    to_char(c.dtcompra,'DD/MM/YYYY') AS purchase_date,
    (SELECT p.idpagseguro::text FROM pagpagseguro p WHERE p.idcompra=v.idcompra ORDER BY p.idpagseguro DESC LIMIT 1) AS payment_id
    FROM voucher v JOIN compra c ON c.idcompra=v.idcompra
    WHERE v.idagenda=$1 AND v.idescola=$2 ORDER BY class_name,COALESCE(v.nomealuno,v.nomeeducador),v.idvoucher`,[agendaId,clientId]);
  return {trip:mapTrip(summary.rows[0]),participants:result.rows.map(r=>({purchaseId:Number(r.idcompra),voucher:r.numvoucher??'-',
    name:(r.tpparticipante==='educador'?r.nomeeducador:r.nomealuno)||'-',role:r.tpparticipante==='educador'?'Educador':'Aluno',
    className:r.class_name,buyer:r.nomecomprador||'-',phone:r.whatsapp||'-',paymentId:r.payment_id||'-',
    valueCents:Math.round(Number(r.vlunicompra)*100),purchaseDate:r.purchase_date??'-',status:r.stcompra,used:r.stusado==='s'}))};
}
export const schoolStatusLabel=(status:string)=>({conc:'Pago',pend:'Em processamento',canc:'Cancelado'}[status]??status);
