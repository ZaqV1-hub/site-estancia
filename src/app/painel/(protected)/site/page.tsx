import type { Metadata } from "next";
import Link from "next/link";
import { requirePainelAccess } from "@/lib/painel-session";

export const metadata: Metadata = {
  title: "Painel - Site | Estância",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

const homeImages = [
  { title: "Banner desktop", size: "1920 x 760 px", status: "Publicado" },
  { title: "Banner mobile", size: "1080 x 1500 px", status: "Publicado" },
];

const attractions = [
  {
    title: "Piscina Natural",
    description: "Água, sombra e área verde para aproveitar o dia em família.",
  },
  {
    title: "Trilhas e Natureza",
    description: "Caminhos verdes para passeio, descanso e contato com o parque.",
  },
];

const events = [
  {
    title: "Festa Junina",
    description: "Comidas típicas, música, brincadeiras e lazer ao ar livre.",
  },
];

function ActionButtons() {
  return (
    <div className="flex flex-wrap gap-2">
      <button className="rounded-full border border-[#dbe7d7] px-4 py-2 text-xs font-black text-[#17351f]">
        Editar
      </button>
      <button className="rounded-full border border-[#f0c3bc] px-4 py-2 text-xs font-black text-[#a33b31]">
        Excluir
      </button>
    </div>
  );
}

export default async function PainelSiteRoute() {
  await requirePainelAccess(["vis_info", "vis_param"], "/painel/site");

  return (
    <div className="space-y-5">
      <section className="panel-section p-5">
        <p className="panel-eyebrow">Site</p>
        <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-[28px] font-black leading-tight text-[#17351f]">
              Conteúdo da página inicial
            </h2>
            <p className="mt-3 max-w-[720px] text-[15px] leading-7 text-[#5f7564]">
              Gerencie imagens da home, atrações e eventos publicados.
            </p>
          </div>
        </div>
      </section>

      <section className="panel-section p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="panel-eyebrow">Imagens da home</p>
            <h3 className="mt-2 text-[24px] font-black text-[#17351f]">
              Desktop e mobile
            </h3>
          </div>
          <button className="rounded-full bg-[#17342d] px-5 py-3 text-sm font-black text-white">
            Adicionar imagem
          </button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {homeImages.map((item) => (
            <article
              key={item.title}
              className="rounded-[8px] border border-[#dbe7d7] bg-[#fbfdf9] p-4"
            >
              <div className="h-32 rounded-[8px] border border-dashed border-[#b9d3b1] bg-white" />
              <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h4 className="text-lg font-black text-[#17351f]">
                    {item.title}
                  </h4>
                  <p className="mt-1 text-sm font-bold text-[#6e9464]">
                    {item.size}
                  </p>
                  <p className="mt-1 text-sm text-[#5f7564]">{item.status}</p>
                </div>
                <ActionButtons />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <article className="panel-section p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="panel-eyebrow">Atrações</p>
              <h3 className="mt-2 text-[24px] font-black text-[#17351f]">
                Carrossel do parque
              </h3>
            </div>
            <button className="rounded-full bg-[#17342d] px-5 py-3 text-sm font-black text-white">
              Adicionar atração
            </button>
          </div>
          <div className="mt-5 grid gap-3">
            {attractions.map((item) => (
              <div
                key={item.title}
                className="rounded-[8px] border border-[#dbe7d7] bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h4 className="text-lg font-black text-[#17351f]">
                      {item.title}
                    </h4>
                    <p className="mt-1 text-sm leading-6 text-[#5f7564]">
                      {item.description}
                    </p>
                  </div>
                  <ActionButtons />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel-section p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="panel-eyebrow">Eventos</p>
              <h3 className="mt-2 text-[24px] font-black text-[#17351f]">
                Programações publicadas
              </h3>
            </div>
            <Link
              href="/painel/agenda/adicionar?tipo=promo"
              className="rounded-full bg-[#17342d] px-5 py-3 text-sm font-black text-white"
            >
              Criar evento
            </Link>
          </div>
          <div className="mt-5 grid gap-3">
            {events.map((item) => (
              <div
                key={item.title}
                className="rounded-[8px] border border-[#dbe7d7] bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h4 className="text-lg font-black text-[#17351f]">
                      {item.title}
                    </h4>
                    <p className="mt-1 text-sm leading-6 text-[#5f7564]">
                      {item.description}
                    </p>
                  </div>
                  <ActionButtons />
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
