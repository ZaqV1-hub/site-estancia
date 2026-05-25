"use client";

import { EstanciaLogo } from "@/components/estancia-logo";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  hasLegacyPanelResource,
  type LegacyPanelResource,
  type LegacyPanelRoleId,
  type LegacyPanelRoleName,
} from "@/lib/painel-access";
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
  { href: "/painel", label: "Visão geral" },
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
    label: "Convênios",
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
    label: "Compra convênio",
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const visibleItems = useMemo(
    () =>
      navItems.filter((item) =>
        item.resources
          ? hasLegacyPanelResource(legacyResources, item.resources)
          : true,
      ),
    [legacyResources],
  );

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

  return (
    <div className="estancia-panel min-h-screen bg-[linear-gradient(180deg,#f8f5ef_0%,#fbfaf7_32%,#ffffff_100%)] text-[#17312d]">
      <div
        className={`grid min-h-screen transition-[grid-template-columns] duration-200 ${
          sidebarCollapsed
            ? "lg:grid-cols-[112px_minmax(0,1fr)]"
            : "lg:grid-cols-[284px_minmax(0,1fr)]"
        }`}
      >
        <aside
          className={`flex flex-col border-r border-[rgba(35,73,63,0.12)] bg-[#17342d] text-white transition-all duration-200 ${
            menuOpen ? "block" : "hidden lg:flex"
          }`}
        >
          <div
            className={`flex min-h-[108px] items-center border-b border-white/10 px-4 py-3 ${
              sidebarCollapsed ? "justify-center" : "justify-between"
            }`}
          >
            <div
              className={`min-w-0 overflow-hidden transition-all ${
                sidebarCollapsed ? "w-20" : "w-[230px]"
              }`}
            >
              <EstanciaLogo
                href="/painel"
                compact
                light
                stacked={sidebarCollapsed}
                className={sidebarCollapsed ? "h-20 w-20 max-w-none" : "h-[74px] max-w-[230px]"}
              />
            </div>

            <button
              type="button"
              aria-label="Alternar menu mobile"
              onClick={() => setMenuOpen((current) => !current)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-[8px] border border-white/15 bg-white/6 text-xl lg:hidden"
            >
              =
            </button>
          </div>

          <div className={`px-3 py-4 ${sidebarCollapsed ? "px-2" : ""}`}>
            <div
              className={`border-b border-white/10 pb-4 ${
                sidebarCollapsed ? "px-0 text-center" : "px-2"
              }`}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9fb9b3]">
                Operador
              </p>
              <p
                className={`mt-1 truncate text-sm font-bold text-white ${
                  sidebarCollapsed ? "hidden" : ""
                }`}
              >
                {actorName || actorCpf || "Sessão operacional"}
              </p>
              <p className={`mt-1 text-xs text-white/65 ${sidebarCollapsed ? "hidden" : ""}`}>
                {legacyRoleName || role}
              </p>
              <p
                className={`mt-2 text-[11px] uppercase tracking-[0.14em] text-white/48 ${
                  sidebarCollapsed ? "hidden" : ""
                }`}
              >
                CPF {actorCpf || "-"}
              </p>
              <span
                className={`mx-auto mt-2 flex h-9 w-9 items-center justify-center rounded-[8px] bg-white/10 text-sm font-black ${
                  sidebarCollapsed ? "" : "hidden"
                }`}
              >
                {(actorName || actorCpf || "O").charAt(0).toUpperCase()}
              </span>
            </div>

            <nav className={`${menuOpen ? "mt-4 grid" : "mt-4 hidden"} gap-1.5 lg:grid`}>
              {visibleItems.map((item) => {
                const active = isPainelShellNavItemActive(pathname, item);

                return (
                  <Link
                    key={item.href}
                    title={sidebarCollapsed ? item.label : undefined}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={`min-h-11 border-l-4 text-sm font-semibold transition ${
                      active
                        ? "border-[#efe7d9] bg-white/10 text-white"
                        : "border-transparent text-white/72 hover:bg-white/6 hover:text-white"
                    } ${
                      sidebarCollapsed
                        ? "flex items-center justify-center px-0 py-2 text-center"
                        : "flex items-center px-4 py-2.5"
                    }`}
                  >
                    <span className={sidebarCollapsed ? "hidden" : ""}>{item.label}</span>
                    <span className={sidebarCollapsed ? "block text-[13px] font-black" : "hidden"}>
                      {item.label.slice(0, 2)}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="mt-auto border-t border-white/10 px-3 py-4">
            <button
              type="button"
              onClick={() => void handleLogout()}
              disabled={pendingLogout}
              className="inline-flex min-h-[42px] w-full items-center justify-center rounded-[8px] border border-white/14 bg-white/8 px-4 text-sm font-bold text-white transition hover:bg-white/14 disabled:opacity-60"
            >
              {pendingLogout ? "Saindo..." : sidebarCollapsed ? "Sair" : "Encerrar sessão"}
            </button>
          </div>
        </aside>

        <main className="min-w-0">
          <div className="border-b border-[rgba(35,73,63,0.08)] bg-white/95 px-4 py-3 shadow-[0_10px_30px_rgba(21,48,42,0.06)] backdrop-blur-md md:px-6 lg:px-8">
            <div className="mx-auto flex max-w-[1500px] items-center gap-4">
              <button
                type="button"
                aria-label={sidebarCollapsed ? "Abrir menu lateral" : "Fechar menu lateral"}
                onClick={() => {
                  if (window.matchMedia("(min-width: 1024px)").matches) {
                    setSidebarCollapsed((current) => !current);
                  } else {
                    setMenuOpen((current) => !current);
                  }
                }}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px] border border-[rgba(35,73,63,0.12)] bg-white text-[18px] font-black text-[#17342d] shadow-[0_12px_28px_rgba(22,47,41,0.08)] hover:bg-[#17342d] hover:text-white"
              >
                {sidebarCollapsed ? ">" : "<"}
              </button>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#1e5564]">
                  Estância
                </p>
                <h1 className="text-[24px] font-bold leading-tight text-[#17342d]">
                  Painel operacional
                </h1>
              </div>
            </div>
          </div>

          <div className="mx-auto w-full max-w-[1500px] px-4 py-5 md:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
