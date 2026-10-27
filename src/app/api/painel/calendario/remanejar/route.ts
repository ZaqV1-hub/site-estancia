import { hasOperationsPermission } from "@/lib/ops-permissions";
import { NextResponse } from "next/server";
import { requirePainelApiAccess } from "@/lib/painel-api-auth";
import { listOpenCalendarDestinations } from "@/lib/operational-calendar";
import { CalendarRescheduleError, moveCalendarVouchers } from "@/lib/calendar-reschedule";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const access = await requirePainelApiAccess(request, "vis_agenda");
  if (!access.ok) return access.response;
  return NextResponse.json({ ok: true, data: await listOpenCalendarDestinations() }, { headers: { "Cache-Control": "private, no-store" } });
}
export async function POST(request: Request) {
  const access = await requirePainelApiAccess(request, "vis_agenda");
  if (!access.ok) return access.response;
  if (!hasOperationsPermission(access.session.permissions, "ops.vouchers")) return NextResponse.json({ ok: false, error: { code: "operations_forbidden", message: "Sem permissão para mover vouchers." } }, { status: 403 });
  try {
    const payload = await request.json();
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return NextResponse.json({ ok: false, error: { message: "Dados inválidos." } }, { status: 400 });
    const data = await moveCalendarVouchers(payload, { name: access.session.actorName, cpf: access.session.actorCpf });
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    if (error instanceof CalendarRescheduleError) return NextResponse.json({ ok: false, error: { code: error.code, message: error.message, warnings: error.warnings } }, { status: error.status });
    if (error instanceof SyntaxError) return NextResponse.json({ ok: false, error: { code: "invalid_json", message: "Dados inválidos." } }, { status: 400 });
    console.error("calendar-reschedule-failed", error);
    return NextResponse.json({ ok: false, error: { code: "reschedule_failed", message: "Não foi possível remanejar os vouchers." } }, { status: 500 });
  }
}
