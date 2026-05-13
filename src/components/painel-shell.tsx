"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  hasLegacyPanelResource,
  type LegacyPanelResource,
  type LegacyPanelRoleId,
  type LegacyPanelRoleName,
} from "@/lib/painel-access";
import { painelAdminModules } from "@/lib/painel-admin-modules";
import { isPainelShellNavItemActive } from "@/lib/painel-shell-nav";
import type { OperationsPermission, OperationsRole } from "@/lib/ops-permissions";

type PainelShellProps = {
  actorName: string | null;
  actorCpf: string | null;
  role: OperationsRole;
  permissions: OperationsPermission[];
  legacyRoleId?: LegacyPanelRoleId | null;
  legacyRoleName?: LegacyPanelRoleName | null;
  legacyResources?: LegacyPanelResource[];
  children: React.ReactNode;
};

const navItems = [
  { href: "/painel", label: "Home" },
  {
    href: "/painel/agenda",
    label: "Agenda",
    resources: ["vis_agenda"] as LegacyPanelResource[],
  },
  {
    href: "/painel/bilheteria",
    label: "Bilheteria",
    resources: ["vis_bilhet", "vis_compra"] as LegacyPanelResource[],
  },
  {
    href: "/painel/compras",
    label: "Compras",
    resources: ["vis_compra"] as LegacyPanelResource[],
  },
  {
    href: "/painel/clientes",
    label: "Clientes",
    resources: ["vis_clientes", "vis_escola"] as LegacyPanelResource[],
  },
  {
    href: "/painel/convenios",
    label: "Convenios",
    resources: ["vis_conve"] as LegacyPanelResource[],
  },
  {
    href: "/painel/descontos",
    label: "Descontos",
    resources: ["vis_desc"] as LegacyPanelResource[],
  },
  {
    href: "/painel/cortesias",
    label: "Cortesias",
    resources: ["vis_cort"] as LegacyPanelResource[],
  },
  {
    href: "/painel/cod-indica",
    label: "Cod Indica",
    resources: ["vis_indica"] as LegacyPanelResource[],
  },
  {
    href: "/painel/compra-convenio",
    label: "Compra Convenio",
    resources: ["vis_compra", "vis_conve"] as LegacyPanelResource[],
  },
  {
    href: "/painel/administrativo",
    label: "Administrativo",
    resources: [
      "vis_usu",
      "vis_situsu",
      "vis_tabpre",
      "vis_catsoc",
      "vis_socio",
      "vis_param",
    ] as LegacyPanelResource[],
  },
];

const topShellAdminLinks = painelAdminModules.filter((module) =>
  ["Usuarios", "Tabela de Preco", "Informacoes"].includes(module.label),
);

function usesLegacyTopShell(pathname: string) {
  return (
    pathname === "/painel" ||
    pathname.startsWith("/painel/bilheteria") ||
    pathname.startsWith("/painel/compras") ||
    pathname.startsWith("/painel/compra-convenio")
  );
}

export function PainelShell({
  actorName,
  actorCpf,
  role,
  legacyRoleName,
  legacyResources = [],
  children,
}: PainelShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [pendingLogout, setPendingLogout] = useState(false);

  async function handleLogout() {
    setPendingLogout(true);

    try {
      await fetch("/api/ops/session", {
        method: "DELETE",
      });
    } finally {
      router.replace("/painel/login");
      router.refresh();
      setPendingLogout(false);
    }
  }

  if (usesLegacyTopShell(pathname)) {
    return (
      <div className="flex min-h-screen flex-col bg-white text-[#1b3447]">
        <header className="shrink-0">
          <div className="bg-[linear-gradient(180deg,#3b97db_0%,#205a7f_100%)] px-4 py-4 text-white">
            <div className="mx-auto flex max-w-[1540px] items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3 text-[15px]">
                <Link href="/painel" className="underline underline-offset-2">
                  Home
                </Link>
                <span className="text-white/50">|</span>
                <span>Meus dados</span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-[15px]">
                <span className="hidden text-white/80 md:inline">
                  {actorName || actorCpf || "Sessão operacional"}
                </span>
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  disabled={pendingLogout}
                  className="border border-[#dca7a1] bg-white px-4 py-2 text-[#c2271a] disabled:opacity-60"
                >
                  {pendingLogout ? "Saindo..." : "Deslogar"}
                </button>
              </div>
            </div>
          </div>

          <nav className="border-b border-[#d4d4d4] bg-[#ededed] px-4 py-3 text-[#666]">
            <div className="mx-auto flex max-w-[1540px] flex-wrap items-center gap-x-5 gap-y-2 text-[16px]">
              {navItems
                .filter((item) =>
                  item.resources
                    ? hasLegacyPanelResource(legacyResources, item.resources)
                    : true,
                )
                .map((item, index, visibleItems) => {
                  const active = isPainelShellNavItemActive(pathname, item);

                  return (
                    <div key={item.href} className="flex items-center gap-5">
                      <Link
                        href={item.href}
                        className={active ? "text-[#205a7f] underline underline-offset-2" : ""}
                      >
                        {item.label}
                      </Link>
                      {index < visibleItems.length - 1 ? (
                        <span className="text-[#b8b8b8]">|</span>
                      ) : null}
                    </div>
                  );
                })}
              {hasLegacyPanelResource(legacyResources, ["vis_usu", "vis_tabpre", "vis_info"]) ? (
                <>
                  <span className="text-[#b8b8b8]">|</span>
                  {topShellAdminLinks
                    .filter((item) =>
                      hasLegacyPanelResource(legacyResources, item.resources),
                    )
                    .map((item, index, visibleItems) => {
                      const active = pathname.startsWith(item.href);

                      return (
                        <div key={item.href} className="flex items-center gap-5">
                          <Link
                            href={item.href}
                            className={active ? "text-[#205a7f] underline underline-offset-2" : ""}
                          >
                            {item.label}
                          </Link>
                          {index < visibleItems.length - 1 ? (
                            <span className="text-[#b8b8b8]">|</span>
                          ) : null}
                        </div>
                      );
                    })}
                </>
              ) : null}
            </div>
          </nav>
        </header>

        <main className="mx-auto w-full max-w-[1540px] flex-1 px-4 py-5">
          {children}
        </main>

        <footer className="mt-8 shrink-0 bg-[linear-gradient(180deg,#3b97db_0%,#205a7f_100%)] px-4 py-4 text-white">
          <div className="mx-auto max-w-[1540px] text-sm font-semibold uppercase tracking-[0.08em]">
            Clube e Park Rincão
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#edf3f7] text-[#1b3447]">
      <div className="grid min-h-screen lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="border-r border-[#d6e2eb] bg-[#10293a] px-5 py-5 text-[#dbe8f1]">
          <nav className="grid gap-2">
            {navItems
              .filter((item) =>
                item.resources
                  ? hasLegacyPanelResource(legacyResources, item.resources)
                  : true,
              )
              .map((item) => {
              const active = isPainelShellNavItemActive(pathname, item);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                    active
                      ? "bg-[#246b99] text-white"
                      : "bg-white/4 text-[#dbe8f1] hover:bg-white/10"
                  }`}
                    >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-5 rounded-[24px] border border-white/10 bg-white/6 p-4 text-sm text-[#c8d8e3]">
            <div className="font-semibold text-white">
              {actorName || actorCpf || "Sessao operacional"}
            </div>
            <div className="mt-1 text-xs uppercase tracking-[0.18em] text-[#92c7e7]">
              {legacyRoleName || role}
            </div>
            <div className="mt-3 text-xs leading-5 text-[#dbe8f1]">
              CPF: {actorCpf || "-"}
            </div>
            <button
              type="button"
              onClick={() => void handleLogout()}
              disabled={pendingLogout}
              className="mt-4 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
            >
              {pendingLogout ? "Saindo..." : "Encerrar sessao"}
            </button>
          </div>
        </aside>

        <main className="min-w-0 px-4 py-5 md:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
