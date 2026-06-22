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
  const initialCreateEventMode =
    params.createEvent === "link"
      ? "link"
      : params.createEvent === "date"
        ? "date"
        : null;

  return (
    <div className="space-y-5">
      <section className="panel-section p-5">
        <p className="panel-eyebrow">Site</p>
        <h2 className="mt-2 text-[28px] font-black leading-tight text-[#17351f]">
          Conteúdo publicado
        </h2>
        <p className="mt-3 max-w-[760px] text-[15px] leading-7 text-[#5f7564]">
          Gerencie imagens da home, atrações e eventos exibidos no site.
        </p>
      </section>

      <PainelSiteManager
        content={content}
        initialEditEventId={params.editEvent ?? null}
        initialCreateEventMode={initialCreateEventMode}
      />
    </div>
  );
}
