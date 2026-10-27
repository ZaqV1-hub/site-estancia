import type { Metadata } from "next";
import { PainelSiteManager } from "@/components/painel-site-manager";
import { readEstanciaContent } from "@/lib/estancia-content-store";
import { requirePainelAccess } from "@/lib/painel-session";

export const metadata: Metadata = {
  title: "Painel - Site | Estância",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

export default async function PainelSiteRoute({
  searchParams,
}: {
  searchParams: Promise<{
    editEvent?: string;
    createEvent?: string;
  }>;
}) {
  await requirePainelAccess(["vis_info", "vis_param"], "/painel/site");
  const params = await searchParams;
  const content = await readEstanciaContent();
  return <PainelSiteManager content={content} initialEditEventId={params.editEvent ?? null} initialOpenCreateEvent={Boolean(params.createEvent)} />;
}
