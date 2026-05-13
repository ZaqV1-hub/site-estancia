import type { Metadata } from "next";
import Link from "next/link";
import { PainelAdminBreadcrumb } from "@/components/painel-admin-breadcrumb";
import { PainelAdminSidebar } from "@/components/painel-admin-sidebar";
import { painelAdminModules } from "@/lib/painel-admin-modules";
import { requirePainelAccess } from "@/lib/painel-session";

export const metadata: Metadata = {
  title: "Painel - Administrativo | Estancia",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function PainelAdministrativoPage() {
  const session = await requirePainelAccess(
    ["vis_usu", "vis_situsu", "vis_tabpre", "vis_catsoc", "vis_socio", "vis_param"],
    "/painel/administrativo",
  );

  const visibleModules = painelAdminModules.filter((module) =>
    module.resources.some((resource) => session.legacyResources.includes(resource)),
  );

  return (
    <div className="grid gap-5">
      <section className="rounded-[6px] bg-white px-4 py-6 shadow-[0_10px_28px_rgba(26,61,94,0.08)] md:px-8">
        <PainelAdminBreadcrumb
          items={[
            { href: "/painel", label: "Home" },
            { label: "Administrativo" },
          ]}
        />

        <div className="mt-7 grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="min-w-0">
            <header>
              <h1 className="text-[44px] leading-none text-[#205a7f]">
                Administrativo
              </h1>
            </header>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              {visibleModules.map((module) => (
                <Link
                  key={module.href}
                  href={module.href}
                  className="rounded-[6px] border border-[#d7e1e8] bg-[#f7fbff] px-5 py-5 shadow-[0_8px_18px_rgba(26,61,94,0.06)] transition hover:border-[#5f84a3] hover:bg-white"
                >
                  <div className="text-[22px] text-[#205a7f]">{module.label}</div>
                  <p className="mt-2 text-sm leading-6 text-[#5d7282]">
                    {module.description}
                  </p>
                </Link>
              ))}
            </div>
          </section>

          <PainelAdminSidebar
            currentHref="/painel/administrativo"
            legacyResources={session.legacyResources}
          />
        </div>
      </section>
    </div>
  );
}
