import Link from "next/link";
import { legacyPanelContracts } from "@/lib/legacy-panel-contracts";
import type { PainelHomePageData } from "@/lib/painel-home";

type PainelHomePageProps = {
  data: PainelHomePageData;
};

export function PainelHomePage({ data }: PainelHomePageProps) {
  const contract = legacyPanelContracts.home;
  const topUrls = data.urls.slice(0, 8);

  return (
    <div className="space-y-6 text-[#35503b]">
      <section className="panel-section px-5 py-5">
        <p className="panel-eyebrow">
          {contract.breadcrumb?.[0] ?? "Painel"}
        </p>
        <div className="mt-3 grid gap-5 lg:grid-cols-[1fr_0.8fr]">
          <div>
            <h2 className="text-[28px] font-black leading-tight text-[#17351f]">
              Visao geral
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[8px] border border-[#dbe7d7] bg-[#f6faf3] p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#6e9464]">
                Falhas de e-mail
              </p>
              <p className="mt-2 text-[30px] font-black text-[#17351f]">{data.emailErrorCount}</p>
            </div>
            <div className="rounded-[8px] border border-[#dbe7d7] bg-[#f6faf3] p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#6e9464]">
                URLs monitoradas
              </p>
              <p className="mt-2 text-[30px] font-black text-[#17351f]">{data.urls.length}</p>
            </div>
          </div>
        </div>
      </section>

      <section>
        {data.emailErrorCount === 0 ? (
          <div className="rounded-[24px] border border-[#cae5c6] bg-[#eef9ea] px-5 py-5 text-[16px] text-[#245330]">
            {contract.feedback?.successText}
          </div>
        ) : (
          <div className="rounded-[24px] border border-[#efc9c3] bg-[#fff2ee] px-5 py-5 text-[16px] text-[#9d4236]">
            <span>
              {contract.feedback?.errorTextPrefix} {data.emailErrorCount}{" "}
              {contract.feedback?.errorTextSuffix}
            </span>{" "}
            <Link href="/painel" className="underline">
              Ver detalhes
            </Link>
          </div>
        )}
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <article className="panel-section p-5">
          <p className="text-[12px] uppercase tracking-[0.2em] text-[#6f9565]">
            Resumo rapido
          </p>
          <h3 className="mt-2 text-[28px] font-black text-[#17351f]">
            Estado do dia
          </h3>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-[8px] bg-[#f7fbf5] p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#78966f]">
                Saude do envio
              </p>
              <p className="mt-2 text-[22px] font-black text-[#17351f]">
                {data.emailErrorCount === 0 ? "Estavel" : "Atencao"}
              </p>
            </div>
            <div className="rounded-[8px] bg-[#f7fbf5] p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#78966f]">
                Acessos recentes
              </p>
              <p className="mt-2 text-[22px] font-black text-[#17351f]">
                {data.urls.reduce((total, item) => total + item.accessCount, 0)}
              </p>
            </div>
          </div>
        </article>

        <article className="panel-section p-5">
          <p className="text-[12px] uppercase tracking-[0.2em] text-[#6f9565]">
            URLs mais acessadas
          </p>
          <h3 className="mt-2 text-[28px] font-black text-[#17351f]">
            Origem de trafego
          </h3>

          {topUrls.length > 0 ? (
            <div className="mt-5 space-y-3">
              {topUrls.map((item) => (
                <div
                  key={item.url}
                  className="flex flex-col gap-2 rounded-[8px] border border-[#e1ebdd] bg-[#f9fcf8] px-4 py-4 md:flex-row md:items-center md:justify-between"
                >
                  <p className="truncate text-[14px] font-semibold text-[#17351f]">
                    {item.url}
                  </p>
                  <div className="rounded-full bg-[#e8f4e2] px-3 py-1 text-sm font-bold text-[#275330]">
                    {item.accessCount} acessos
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-5 text-[16px] text-[#617b66]">
              {contract.emptyStates?.urls}
            </p>
          )}
        </article>
      </section>
    </div>
  );
}
