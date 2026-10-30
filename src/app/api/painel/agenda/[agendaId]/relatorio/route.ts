import { requirePainelApiAccess } from "@/lib/painel-api-auth";
import { getCalendarDay } from "@/lib/operational-calendar";
import { assertCalendarDate } from "@/lib/calendar-validity";
import { renderCalendarDayReport } from "@/lib/calendar-day-report-document";
export const runtime='nodejs';
export async function GET(request:Request,{params}:{params:Promise<{agendaId:string}>}){
  const access=await requirePainelApiAccess(request,'vis_agenda');if(!access.ok)return access.response;
  const {agendaId:date}=await params;
  try{assertCalendarDate(date);}catch{return Response.json({error:'Data inválida.'},{status:400});}
  try{const data=await getCalendarDay(date);if(!data.rule&&!data.schoolTrips?.length&&!data.schoolTripsUnavailable)return Response.json({error:'Data não encontrada.'},{status:404});
    const q=new URL(request.url).searchParams;const origin=q.get('origin');
    return new Response(renderCalendarDayReport(data,{search:q.get('search')??'',origin:origin==='site'||origin==='bilheteria'?origin:'all'}),{headers:{'content-type':'text/html; charset=utf-8','cache-control':'private, no-store'}});
  }catch{return Response.json({error:'Não foi possível carregar o relatório.'},{status:503});}
}
