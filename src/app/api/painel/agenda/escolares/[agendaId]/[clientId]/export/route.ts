import { getSchoolTrip,schoolStatusLabel } from "@/lib/b2b-school-calendar";
import { requirePainelApiAccess } from "@/lib/painel-api-auth";
import { exportPainelTable } from "@/lib/painel-table-export";
export const runtime='nodejs';
export async function GET(request:Request,{params}:{params:Promise<{agendaId:string;clientId:string}>}){
  const access=await requirePainelApiAccess(request,'vis_agenda');if(!access.ok)return access.response;
  const ids=await params;const q=new URL(request.url).searchParams;
  try{
    const data=await getSchoolTrip(Number(ids.agendaId),Number(ids.clientId));if(!data)return Response.json({error:'Passeio não encontrado'},{status:404});
    const status=['conc','pend','canc'].includes(q.get('status')??'')?q.get('status'):null;
    const role=q.get('list')==='students'?'Aluno':q.get('list')==='educators'?'Educador':null;
    const participants=data.participants.filter(p=>(!status||p.status===status)&&(!role||p.role===role));
    const rows=[['Compra','Voucher','Nome','Participante','Turma','Valor','Data da compra','Utilizado','Status'],...participants.map(p=>[String(p.purchaseId),p.voucher,p.name,p.role,p.className,(p.valueCents/100).toFixed(2).replace('.',','),p.purchaseDate,p.used?'Sim':'Não',schoolStatusLabel(p.status)])];
    const trip=data.trip;
    const title=`${trip.name} · ${trip.date.split('-').reverse().join('/')} · ${participants.length} registros · ${trip.paid} pagos · ${trip.pending} em processamento · ${trip.used} utilizados${status?' · Filtro: '+schoolStatusLabel(status):''}${role?' · '+role:''}`;
    return await exportPainelTable(rows,title,`passeio-${trip.agendaId}-${trip.clientId}`,q.get('format'));
  }catch{ return Response.json({error:'Não foi possível consultar o e-commerce escolar. Tente novamente.'},{status:503}); }
}
