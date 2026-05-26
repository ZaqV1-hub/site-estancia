import type { Metadata } from "next";
import { requirePainelAccess } from "@/lib/painel-session";

export const metadata: Metadata = {
  title: "Painel - Passaportes e Itens | Estância",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

const passports = [
  {
    title: "Passaporte Explorador",
    description: "Dia de natureza e lazer",
    price: "R$ 100,00",
  },
  {
    title: "Passaporte Aventura",
    description: "Experiência completa",
    price: "R$ 100,00",
  },
  {
    title: "Passaporte Infantil",
    description: "Crianças de 3 a 12 anos",
    price: "R$ 70,00",
  },
];

const addons = [
  { title: "Almoço Caipira Buffet", price: "R$ 35,00" },
  { title: "Café da Manhã", price: "R$ 25,00" },
  { title: "Ecobag de Algodão", price: "R$ 20,00" },
  { title: "Kit Bebidas", price: "R$ 24,00" },
];

function ProductCard({
  title,
  description,
  price,
}: {
  title: string;
  description?: string;
  price: string;
}) {
  return (
    <article className="rounded-[8px] border border-[#dbe7d7] bg-white p-4">
      <div className="h-28 rounded-[8px] border border-dashed border-[#b9d3b1] bg-[#f6faf3]" />
      <h4 className="mt-4 text-lg font-black text-[#17351f]">{title}</h4>
      {description ? (
        <p className="mt-1 text-sm text-[#5f7564]">{description}</p>
      ) : null}
      <div className="mt-4 flex items-center justify-between gap-3">
        <strong className="text-xl text-[#17351f]">{price}</strong>
        <div className="flex gap-2">
          <button className="rounded-full border border-[#dbe7d7] px-4 py-2 text-xs font-black text-[#17351f]">
            Editar
          </button>
          <button className="rounded-full border border-[#f0c3bc] px-4 py-2 text-xs font-black text-[#a33b31]">
            Excluir
          </button>
        </div>
      </div>
    </article>
  );
}

export default async function PainelPassaportesItensRoute() {
  await requirePainelAccess(["vis_agenda", "vis_tabpre"], "/painel/passaportes-itens");

  return (
    <div className="space-y-5">
      <section className="panel-section p-5">
        <p className="panel-eyebrow">Produtos</p>
        <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-[28px] font-black leading-tight text-[#17351f]">
              Passaportes e itens adicionais
            </h2>
            <p className="mt-3 max-w-[720px] text-[15px] leading-7 text-[#5f7564]">
              Cadastre os produtos padrão do Estância e selecione por data na agenda.
            </p>
          </div>
        </div>
      </section>

      <section className="panel-section p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="panel-eyebrow">Passaportes</p>
            <h3 className="mt-2 text-[24px] font-black text-[#17351f]">
              Produtos principais
            </h3>
          </div>
          <button className="rounded-full bg-[#17342d] px-5 py-3 text-sm font-black text-white">
            Adicionar passaporte
          </button>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {passports.map((item) => (
            <ProductCard key={item.title} {...item} />
          ))}
        </div>
      </section>

      <section className="panel-section p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="panel-eyebrow">Itens adicionais</p>
            <h3 className="mt-2 text-[24px] font-black text-[#17351f]">
              Produtos complementares
            </h3>
          </div>
          <button className="rounded-full bg-[#17342d] px-5 py-3 text-sm font-black text-white">
            Adicionar item
          </button>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-4">
          {addons.map((item) => (
            <ProductCard key={item.title} {...item} />
          ))}
        </div>
      </section>
    </div>
  );
}
