import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { hasLegacyPanelResource, type LegacyPanelResource } from "@/lib/painel-access";
import { requirePainelSession } from "@/lib/painel-session";

export const metadata: Metadata = { title: "Painel | Estância", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const destinations: Array<{ href: string; resources: LegacyPanelResource[] }> = [
  { href: "/painel/agenda", resources: ["vis_agenda"] },
  { href: "/painel/compras", resources: ["vis_compra"] },
  { href: "/painel/site", resources: ["vis_info", "vis_param"] },
  { href: "/painel/passaportes-itens", resources: ["vis_tabpre"] },
  { href: "/painel/bilheteria", resources: ["vis_bilhet"] },
  { href: "/painel/descontos", resources: ["vis_desc"] },
  { href: "/painel/cortesias", resources: ["vis_cort"] },
  { href: "/painel/cod-indica", resources: ["vis_indica"] },
  { href: "/painel/administrativo", resources: ["vis_usu", "vis_situsu"] },
];

export default async function PainelHomeRoute() {
  const session = await requirePainelSession("/painel");
  if (session.legacyRoleId === 3 && hasLegacyPanelResource(session.legacyResources, "vis_bilhet")) {
    return redirect("/painel/bilheteria");
  }
  const destination = destinations.find(item => hasLegacyPanelResource(session.legacyResources, item.resources));
  if (destination) return redirect(destination.href);
  return <section className="calendar-card calendar-page"><h1 className="calendar-heading">Nenhum módulo disponível</h1><p className="calendar-muted">Sua sessão está autenticada, mas não tem acesso aos módulos do painel. Solicite a revisão das permissões ao responsável.</p></section>;
}
