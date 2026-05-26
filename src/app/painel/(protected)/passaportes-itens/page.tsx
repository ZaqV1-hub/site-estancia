import type { Metadata } from "next";
import { PainelProductsManager } from "@/components/painel-products-manager";
import { readEstanciaContent } from "@/lib/estancia-content-store";
import { requirePainelAccess } from "@/lib/painel-session";

export const metadata: Metadata = {
  title: "Painel - Passaportes e Itens | Estância",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

export default async function PainelPassaportesItensRoute() {
  await requirePainelAccess(["vis_agenda", "vis_tabpre"], "/painel/passaportes-itens");

  return (
    <div className="space-y-5">
      <section className="panel-section p-5">
        <p className="panel-eyebrow">Produtos</p>
        <h2 className="mt-2 text-[28px] font-black leading-tight text-[#17351f]">
          Passaportes e itens
        </h2>
        <p className="mt-3 max-w-[720px] text-[15px] leading-7 text-[#5f7564]">
          Cadastre os passaportes e itens adicionais padrão usados no site.
        </p>
      </section>

      <PainelProductsManager products={readEstanciaContent().products} />
    </div>
  );
}
