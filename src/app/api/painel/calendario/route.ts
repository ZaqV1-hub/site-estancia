import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { authenticateOperationsRequest } from "@/lib/ops-auth";
import { requirePainelApiAccess } from "@/lib/painel-api-auth";
import { CalendarError, getCalendarDay, getCalendarMonth, saveCalendarDate } from "@/lib/operational-calendar";
import { getSaoPauloToday } from "@/lib/calendar-validity";
import type { SaveCalendarDateInput } from "@/lib/operational-calendar-contracts";

export const runtime = "nodejs";

function failure(error: unknown) {
  if (error instanceof CalendarError) {
    return NextResponse.json({ ok:false,error:{code:error.code,message:error.message} },{status:error.status});
  }
  console.error("operational-calendar-failed", error);
  return NextResponse.json({ok:false,error:{code:"calendar_unavailable",message:"Não foi possível carregar ou salvar esta data."}},{status:500});
}

export async function GET(request: Request) {
  const auth = authenticateOperationsRequest(request,{requiredPermission:"ops.read"});
  if (!auth.ok) return auth.response;
  const panel = await requirePainelApiAccess(request,"vis_agenda");
  if (!panel.ok) return panel.response;
  const query = new URL(request.url).searchParams;
  try {
    const date = query.get("date");
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new CalendarError("calendar_invalid_date","Informe uma data válida.");
    const today = getSaoPauloToday();
    const data = date ? await getCalendarDay(date)
      : await getCalendarMonth(Number(query.get("month")??today.slice(5,7)),Number(query.get("year")??today.slice(0,4)));
    return NextResponse.json({ok:true,data},{headers:{"Cache-Control":"private, no-store"}});
  } catch(error) { return failure(error); }
}

export async function POST(request: Request) {
  const auth = authenticateOperationsRequest(request,{requiredPermission:"ops.purchases"});
  if (!auth.ok) return auth.response;
  const panel = await requirePainelApiAccess(request,"vis_agenda");
  if (!panel.ok) return panel.response;
  let payload: unknown;
  try { payload=await request.json(); }
  catch { return NextResponse.json({ok:false,error:{message:"Envie os dados da data em JSON válido."}},{status:400}); }
  if (!payload || typeof payload!=="object" || Array.isArray(payload)) {
    return NextResponse.json({ok:false,error:{message:"Informe os dados da data."}},{status:400});
  }
  const input=payload as SaveCalendarDateInput;
  if (input.type==="event" || input.eventId || input.eventTitle) {
    return NextResponse.json({ok:false,error:{code:"calendar_event_wizard_required",message:"Crie ou edite eventos pela área de Site."}},{status:400});
  }
  try {
    const data=await saveCalendarDate(input,{name:panel.session.actorName,cpf:panel.session.actorCpf});
    revalidatePath("/painel/agenda");
    revalidatePath("/agenda");
    revalidatePath("/");
    return NextResponse.json({ok:true,data});
  } catch(error) { return failure(error); }
}
