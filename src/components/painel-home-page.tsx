import Link from "next/link";
import { legacyPanelContracts } from "@/lib/legacy-panel-contracts";
import type { PainelHomePageData } from "@/lib/painel-home";

type PainelHomePageProps = {
  data: PainelHomePageData;
};

export function PainelHomePage({ data }: PainelHomePageProps) {
  const contract = legacyPanelContracts.home;

  return (
    <div className="mx-auto max-w-[1540px] px-4 pb-10 pt-4 text-[#5f6468]">
      <div className="border-b border-[#d8e3eb] pb-3">
        <div className="text-[15px] text-[#8b8f93]">{contract.breadcrumb?.[0]}</div>
      </div>

      <section className="pt-4">
        {data.emailErrorCount === 0 ? (
          <div className="rounded-[4px] border border-[#c7e5c7] bg-[#dff0d8] px-4 py-5 text-[16px] text-[#3c763d]">
            {contract.feedback?.successText}
          </div>
        ) : (
          <div className="rounded-[4px] border border-[#ebccd1] bg-[#f2dede] px-4 py-5 text-[16px] text-[#a94442]">
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

      <section className="pt-5">
        {data.urls.length > 0 ? (
          <div className="overflow-hidden border border-[#d7e1e8] bg-white">
            <table className="min-w-full text-left text-[15px]">
              <thead className="bg-[#6b87a1] text-white">
                <tr>
                  {contract.tables?.[0]?.columns.map((column) => (
                    <th key={column.key} className="px-4 py-3 font-normal">
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.urls.map((item) => (
                  <tr key={item.url} className="border-t border-[#d7e1e8]">
                    <td className="px-4 py-3">{item.url}</td>
                    <td className="px-4 py-3">{item.accessCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-[16px] text-[#666]">{contract.emptyStates?.urls}</p>
        )}
      </section>
    </div>
  );
}
