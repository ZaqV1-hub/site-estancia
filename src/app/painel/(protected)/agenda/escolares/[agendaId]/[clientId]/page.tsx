import Link from "next/link";
import { notFound } from "next/navigation";
import { getSchoolTrip, schoolStatusLabel } from "@/lib/b2b-school-calendar";
import { schoolTripB2BHref,schoolTripLocalHref } from "@/lib/school-calendar-links";
import { requirePainelAccess } from "@/lib/painel-session";
import { SchoolTripsPanel } from "@/components/school-trips-panel";
export const dynamic='force-dynamic';
export default async function Page({params,searchParams}:{params:Promise<{agendaId:string;clientId:string}>;searchParams:Promise<{status?:string;list?:string}>}){
  await requirePainelAccess('vis_agenda','/painel/agenda');
  const ids=await params;const query=await searchParams;
  let data;
  try { data=await getSchoolTrip(Number(ids.agendaId),Number(ids.clientId)); }
  catch { return <section className="calendar-card" role="alert"><h1>Passeios escolares indisponíveis</h1><p>Não foi possível consultar o B2B agora. Atualize a página para tentar novamente.</p><Link href="/painel/agenda">Voltar à agenda</Link></section>; }
  if(!data)notFound();
  const {trip}=data;const status=['conc','pend','canc'].includes(query.status??'')?query.status:'';
  const role=query.list==='educators'?'Educador':query.list==='students'?'Aluno':'';
  const rows=data.participants.filter(p=>(!status||p.status===status)&&(!role||p.role===role));
  const filters=new URLSearchParams({status:status??'',list:query.list??''});
  const exportBase=`/api/painel/agenda/escolares/${trip.agendaId}/${trip.clientId}/export?${filters}`;
  return <div className="calendar-page"><nav className="calendar-crumbs"><Link href="/painel/agenda">Agenda</Link><span>›</span><Link href={`/painel/agenda/${trip.date}`}>{trip.date.split('-').reverse().join('/')}</Link><span>› {trip.name}</span></nav><SchoolTripsPanel trips={[trip]}/><section className="calendar-card"><h1 className="calendar-heading">Listas do passeio · {trip.name}</h1><p className="calendar-muted">Somente consulta. Registros de compra podem incluir novas tentativas para o mesmo aluno.</p><div className="flex flex-wrap gap-3 my-4"><Link href={schoolTripLocalHref(trip)} className="calendar-button-secondary">Todos</Link><Link href={`${schoolTripLocalHref(trip)}?list=students&status=${status}`} className="calendar-button-secondary">Lista de alunos</Link><Link href={`${schoolTripLocalHref(trip)}?list=educators&status=${status}`} className="calendar-button-secondary">Lista de educadores</Link><a href={schoolTripB2BHref(trip)} target="_blank" rel="noopener noreferrer" className="calendar-text-link">Abrir no e-commerce escolar</a></div><form className="flex flex-wrap gap-3 mb-4" method="get"><input type="hidden" name="list" value={query.list??''}/><label>Status da compra <select name="status" defaultValue={status} className="calendar-input"><option value="">Todos</option><option value="conc">Pagos</option><option value="pend">Em processamento</option><option value="canc">Cancelados</option></select></label><button className="calendar-button" type="submit">Filtrar</button><Link className="calendar-button-secondary" href={exportBase}>Exportar Excel</Link><Link className="calendar-button-secondary" href={`${exportBase}&format=pdf`} target="_blank">Relatório / PDF</Link></form><p>{rows.length} registros encontrados.</p><div className="calendar-table-scroll"><table className="calendar-purchases-table"><thead><tr>{['Compra','Voucher','Nome','Participante','Turma','Comprador','Telefone','ID pagamento','Valor','Data da compra','Usado?','Status'].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((p,i)=><tr key={`${p.voucher}-${i}`}><td>{p.purchaseId}</td><td>{p.voucher}</td><td>{p.name}</td><td>{p.role}</td><td>{p.className}</td><td>{p.buyer}</td><td>{p.phone}</td><td>{p.paymentId}</td><td>{(p.valueCents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td><td>{p.purchaseDate}</td><td>{p.used?'Sim':'Não'}</td><td>{schoolStatusLabel(p.status)}</td></tr>)}</tbody></table></div></section></div>;
}
