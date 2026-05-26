import type { Metadata } from "next";
import { requirePainelAccess } from "@/lib/painel-session";

export const metadata: Metadata = {
  title: "Painel - Site | Estancia",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

const homeImages = [
  { title: "Home desktop", size: "1920 x 760 px", count: "3 imagens" },
  { title: "Home mobile", size: "1080 x 1500 px", count: "3 imagens" },
];

const siteBlocks = [
  {
    title: "Atra\u00e7\u00f5es",
    description: "Imagem, t\u00edtulo, texto e ordem no carrossel.",
    count: "2 itens",
  },
  {
    title: "Eventos",
    description: "Destaque, foto, data e bot\u00e3o para compra.",
    count: "1 item",
  },
];

export default async function PainelSiteRoute() {
  await requirePainelAccess(["vis_info", "vis_param"], "/painel/site");

  return (
    <div className="space-y-5">
      <section className="panel-section p-5">
        <p className="panel-eyebrow">Site</p>
        <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-[28px] font-black leading-tight text-[#17351f]">
              Conte\u00fado da p\u00e1gina inicial
            </h2>
            <p className="mt-3 max-w-[720px] text-[15px] leading-7 text-[#5f7564]">
              Controle as imagens da home, atra\u00e7\u00f5es e chamadas
              vis\u00edveis no site.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        {homeImages.map((item) => (
          <article key={item.title} className="panel-section p-5">
            <p className="panel-eyebrow">{item.count}</p>
            <h3 className="mt-2 text-[24px] font-black text-[#17351f]">
              {item.title}
            </h3>
            <p className="mt-3 text-[15px] font-bold text-[#5f7564]">
              {item.size}
            </p>
            <div className="mt-5 h-32 rounded-[8px] border border-dashed border-[#b9d3b1] bg-[#f6faf3]" />
          </article>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        {siteBlocks.map((item) => (
          <article key={item.title} className="panel-section p-5">
            <p className="panel-eyebrow">{item.count}</p>
            <h3 className="mt-2 text-[24px] font-black text-[#17351f]">
              {item.title}
            </h3>
            <p className="mt-3 text-[15px] leading-7 text-[#5f7564]">
              {item.description}
            </p>
          </article>
        ))}
      </section>
    </div>
  );
}
