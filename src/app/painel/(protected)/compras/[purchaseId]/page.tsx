import type { Metadata } from "next";
import { PainelCompraDetailPage } from "@/components/painel-compra-detail-page";
import { getPainelPurchaseDetail } from "@/lib/painel-compras";
import { hasLegacyPanelResource } from "@/lib/painel-access";
import { getPurchaseRefundState } from "@/lib/purchase-refund";
import { requirePainelAccess } from "@/lib/painel-session";

export const metadata: Metadata = {
  title: "Painel - Detalhe da Compra | Estância",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

export default async function PainelCompraDetailRoute({
  params,
}: {
  params: Promise<{ purchaseId: string }>;
}) {
  const session = await requirePainelAccess("vis_compra", "/painel/compras");
  const routeParams = await params;
  const detail = await getPainelPurchaseDetail(Number(routeParams.purchaseId));

  const canRefund = session.legacyRoleId === 1;
  const refund = canRefund && detail?.type === "ponli" ? await getPurchaseRefundState(detail.purchaseId) : null;

  return (
    <PainelCompraDetailPage
      actorCpf={session.actorCpf}
      actorName={session.actorName}
      canRefund={canRefund}
      reconciliationPending={refund?.reconciliationPending ?? false}
      refundState={refund?.state ?? null}
      canValidate={hasLegacyPanelResource(session.legacyResources, "vis_bilhet")}
      canManageHistory={session.legacyRoleId === 1}
      detail={detail}
    />
  );
}
