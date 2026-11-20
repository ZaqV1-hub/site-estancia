import { requirePainelApiAccess } from "@/lib/painel-api-auth";
import { PurchaseRefundError, reconcilePurchaseRefund, requestPurchaseRefund } from "@/lib/purchase-refund";

export async function POST(request: Request) {
  const access = await requirePainelApiAccess(request, "vis_compra");
  if (!access.ok) return access.response;
  const session = access.session;
  if (session.legacyRoleId !== 1 || !(session.actorName || session.actorCpf)) {
    return Response.json({ message: "Estorno restrito à administração." }, { status: 403 });
  }
  if (request.headers.get("sec-fetch-site") === "cross-site" ||
      request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") {
    return Response.json({ message: "Requisição de estorno inválida." }, { status: 400 });
  }
  const input = await request.json().catch(() => null);
  if (!Number.isSafeInteger(input?.purchaseId) || input.purchaseId <= 0) {
    return Response.json({ message: "Compra inválida." }, { status: 400 });
  }
  try {
    const reason = typeof input.reason === "string" ? input.reason.trim() : "";
    if (input.consult !== true && (!reason || reason.length > 500)) {
      return Response.json({ message: "Informe um motivo com até 500 caracteres." }, { status: 400 });
    }
    const result = input.consult === true
      ? await reconcilePurchaseRefund(input.purchaseId)
      : await requestPurchaseRefund({
          purchaseId: input.purchaseId, reason,
          actorName: session.actorName || session.actorCpf!, actorCpf: session.actorCpf,
        });
    const status = result.state === "refunded" ? "confirmed" : result.state === "denied" ? "denied" : "pending";
    return Response.json({ status, message: result.message, reconciliationPending: result.reconciliationPending }, { status: status === "pending" ? 202 : 200 });
  } catch (error) {
    if (error instanceof PurchaseRefundError) {
      return Response.json({
        message: error.message,
        noRequest: input.consult === true ? error.code === "refund_not_found" : error.code !== "refund_not_found",
      }, { status: error.status });
    }
    console.error("painel-refund-failed", { purchaseId: input.purchaseId });
    return Response.json({ message: "Não foi possível concluir a operação. Consulte o estado do estorno." }, { status: 503 });
  }
}
