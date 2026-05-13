import type { Metadata } from "next";
import { PainelBilheteriaPageHeader } from "@/components/painel-bilheteria-page-header";
import { PainelBilheteriaSalesBuilder } from "@/components/painel-bilheteria-sales-builder";
import { requirePainelAccess } from "@/lib/painel-session";

export const metadata: Metadata = {
  title: "Painel - Vendas da Bilheteria | Clube Rincao",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

export default async function PainelBilheteriaVendasPage() {
  const session = await requirePainelAccess(
    ["vis_bilhet", "vis_compra"],
    "/painel/bilheteria/vendas",
  );

  return (
    <div className="grid gap-5">
      <PainelBilheteriaPageHeader
        current="sales"
        screen="bilheteria-sales"
        isManager={session.legacyRoleId === 1}
        title="Vendas"
        description="Monte a compra, aplique descontos e cortesias, e siga para a finalização do pagamento."
        actorName={session.actorName}
      />

      <PainelBilheteriaSalesBuilder />
    </div>
  );
}
