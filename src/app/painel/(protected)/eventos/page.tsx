import type { Metadata } from "next";
import Link from "next/link";
import { requirePainelAccess } from "@/lib/painel-session";

export const metadata: Metadata = {
  title: "Painel - Eventos | Estancia",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

export default async function PainelEventosRoute() {
  await requirePainelAccess(["vis_info", "vis_agenda"], "/painel/eventos");

  return (
    <div className="space-y-5">
      <section className="panel-section p-5">
        <p className="panel-eyebrow">Eventos</p>
        <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-[28px] font-black leading-tight text-[#17351f]">
              Datas promocionais
            </h2>
            <p className="mt-3 max-w-[720px] text-[15px] leading-7 text-[#5f7564]">
              Crie eventos para a tela inicial e vincule uma data de venda com
              valores especiais.
            </p>
          </div>
          <Link
            href="/painel/agenda/adicionar"
            className="inline-flex min-h-11 items-center justify-center rounded-[8px] bg-[#17342d] px-5 text-sm font-black text-white"
          >
            Adicionar data promocional
          </Link>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
        <article className="panel-section p-5">
          <p className="panel-eyebrow">Evento em destaque</p>
          <h3 className="mt-2 text-[24px] font-black text-[#17351f]">
            Festa Junina
          </h3>
          <p className="mt-3 text-[15px] leading-7 text-[#5f7564]">
            Comidas t\u00edpicas, m\u00fasica, brincadeiras e lazer ao ar livre.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[8px] border border-[#dbe7d7] bg-[#f6faf3] p-4">
              <p className="panel-eyebrow">Data</p>
              <p className="mt-2 text-[20px] font-black text-[#17351f]">
                14/06/2026
              </p>
            </div>
            <div className="rounded-[8px] border border-[#dbe7d7] bg-[#f6faf3] p-4">
              <p className="panel-eyebrow">Bot\u00e3o</p>
              <p className="mt-2 text-[18px] font-black text-[#17351f]">
                Compre seu ingresso!
              </p>
            </div>
            <div className="rounded-[8px] border border-[#dbe7d7] bg-[#f6faf3] p-4">
              <p className="panel-eyebrow">Status</p>
              <p className="mt-2 text-[18px] font-black text-[#17351f]">
                Publicado
              </p>
            </div>
          </div>
        </article>

        <article className="panel-section p-5">
          <p className="panel-eyebrow">Configura\u00e7\u00e3o</p>
          <h3 className="mt-2 text-[24px] font-black text-[#17351f]">
            Publica\u00e7\u00e3o do evento
          </h3>
          <div className="mt-5 grid gap-3">
            {[
              "Nome",
              "Descri\u00e7\u00e3o",
              "Imagem",
              "Data vinculada",
              "Valores",
              "Produtos dispon\u00edveis",
            ].map((item) => (
              <div
                key={item}
                className="flex items-center justify-between rounded-[8px] border border-[#dbe7d7] bg-white px-4 py-3 text-sm font-bold text-[#17351f]"
              >
                <span>{item}</span>
                <span className="text-[#6e9464]">Configurado</span>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
