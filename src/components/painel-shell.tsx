"use client";

import { EstanciaLogo } from "@/components/estancia-logo";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  hasLegacyPanelResource,
  type LegacyPanelResource,
  type LegacyPanelRoleId,
  type LegacyPanelRoleName,
} from "@/lib/painel-access";
import { isPainelShellNavItemActive } from "@/lib/painel-shell-nav";
import type {
  OperationsPermission,
  OperationsRole,
} from "@/lib/ops-permissions";

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

type PainelNavItem = {
  href: string;
  label: string;
  icon: string;
  roles?: LegacyPanelRoleId[];
  resources?: LegacyPanelResource[];
};

const navItems: PainelNavItem[] = [
  {
    href: "/painel/site",
    label: "Site",
    icon: "site",
    roles: [1, 2],
    resources: ["vis_info", "vis_param"],
  },
  {
    href: "/painel/agenda",
    label: "Agenda",
    icon: "calendar",
    roles: [1, 2],
    resources: ["vis_agenda"],
  },
  {
    href: "/painel/passaportes-itens",
    label: "Passaportes e itens",
    icon: "products",
    roles: [1, 2],
    resources: ["vis_agenda", "vis_tabpre"],
  },
  {
    href: "/painel/bilheteria",
    label: "Bilheteria",
    icon: "ticket",
    roles: [1, 2, 3],
    resources: ["vis_bilhet"],
  },
  {
    href: "/painel/compras",
    label: "Compras",
    icon: "cart",
    roles: [1, 2],
    resources: ["vis_compra"],
  },
  {
    href: "/painel/descontos",
    label: "Descontos",
    icon: "discount",
    roles: [1],
    resources: ["vis_desc"],
  },
  {
    href: "/painel/cortesias",
    label: "Cortesias",
    icon: "gift",
    roles: [1],
    resources: ["vis_cort"],
  },
  {
    href: "/painel/cod-indica",
    label: "C\u00f3digos de indica\u00e7\u00e3o",
    icon: "share",
    roles: [1],
    resources: ["vis_indica"],
  },
  {
    href: "/painel/administrativo",
    label: "Administrativo",
    icon: "admin",
    roles: [1],
    resources: [
      "vis_usu",
      "vis_situsu",
      "vis_tabpre",
      "vis_catsoc",
      "vis_socio",
      "vis_param",
    ],
  },
];

function PanelIcon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    overview: (
      <>
        <path d="M4 13h6v7H4z" />
        <path d="M14 4h6v16h-6z" />
        <path d="M4 4h6v5H4z" />
      </>
    ),
    events: (
      <>
        <path d="M5 5h14v15H5z" />
        <path d="M8 3v4M16 3v4M5 10h14" />
        <path d="M9 14h2M13 14h2M9 17h2" />
      </>
    ),
    site: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" />
      </>
    ),
    calendar: (
      <>
        <path d="M5 5h14v15H5z" />
        <path d="M8 3v4M16 3v4M5 10h14" />
      </>
    ),
    products: (
      <>
        <path d="M4 7h16v10H4z" />
        <path d="M8 7V5h8v2M8 11h8M8 14h5" />
      </>
    ),
    ticket: (
      <>
        <path d="M4 8a2 2 0 0 0 0 4v4h16v-4a2 2 0 0 0 0-4V4H4z" />
        <path d="M9 8h6M9 12h6" />
      </>
    ),
    cart: (
      <>
        <path d="M4 5h2l2 10h9l2-7H7" />
        <circle cx="10" cy="19" r="1.5" />
        <circle cx="17" cy="19" r="1.5" />
      </>
    ),
    users: (
      <>
        <path d="M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21a6 6 0 0 1 12 0" />
        <path d="M17 11a3 3 0 1 0 0-6M15 16a5 5 0 0 1 5 5" />
      </>
    ),
    discount: (
      <>
        <path d="M20 12 12 20 4 12V4h8z" />
        <path d="M9 9h.01M15 15h.01M15 9l-6 6" />
      </>
    ),
    gift: (
      <>
        <path d="M4 10h16v10H4zM3 7h18v3H3zM12 7v13" />
        <path d="M12 7c-2.5 0-4-1-4-2.5A2 2 0 0 1 12 7ZM12 7c2.5 0 4-1 4-2.5A2 2 0 0 0 12 7Z" />
      </>
    ),
    share: (
      <>
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <path d="m8.6 10.7 6.8-4.4M8.6 13.3l6.8 4.4" />
      </>
    ),
    admin: (
      <>
        <path d="M12 3 4 6v6c0 5 3.4 8 8 9 4.6-1 8-4 8-9V6z" />
        <path d="M9 12l2 2 4-5" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.9}
      viewBox="0 0 24 24"
    >
      {paths[name] ?? paths.overview}
    </svg>
  );
}

export function PainelShell({
  actorName,
  actorCpf,
  role,
  legacyRoleId,
  legacyRoleName,
  legacyResources = [],
  children,
}: PainelShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const drawer = useRef<HTMLDialogElement>(null);
  const [pendingLogout, setPendingLogout] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1250px)");
    const closeDrawer = () => { if (desktop.matches) drawer.current?.close(); };
    desktop.addEventListener("change", closeDrawer);
    return () => desktop.removeEventListener("change", closeDrawer);
  }, []);
  const visibleItems = useMemo(() => navItems.filter((item) => {
    if (item.roles && (!legacyRoleId || !item.roles.includes(legacyRoleId))) return false;
    return item.resources ? hasLegacyPanelResource(legacyResources, item.resources) : true;
  }), [legacyResources, legacyRoleId]);

  async function handleLogout() {
    setPendingLogout(true);
    setLogoutError("");
    try {
      const response = await fetch("/api/ops/session", { method: "DELETE" });
      if (!response.ok) throw new Error("Não foi possível encerrar a sessão. Tente novamente.");
      router.replace("/painel/login");
      router.refresh();
    } catch (cause) {
      setLogoutError(cause instanceof Error ? cause.message : "Não foi possível encerrar a sessão. Tente novamente.");
    } finally { setPendingLogout(false); }
  }

  const sidebar = <>
    <div className="painel-brand"><EstanciaLogo href="/painel" compact light className="painel-logo" /></div>
    <div className="painel-operator"><p>Operador</p><strong>{actorName || actorCpf || "Sessão operacional"}</strong><span>{legacyRoleName || role}</span><small>CPF {actorCpf || "—"}</small></div>
    <nav className="painel-navigation" aria-label="Navegação do painel">{visibleItems.map((item) => {
      const active = isPainelShellNavItemActive(pathname, item);
      return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={active ? "is-active" : ""} onClick={() => drawer.current?.close()}><PanelIcon name={item.icon} /><span>{item.label}</span></Link>;
    })}</nav>
    <div className="painel-session"><button type="button" onClick={() => void handleLogout()} disabled={pendingLogout}>{pendingLogout ? "Saindo…" : "Encerrar sessão"}</button>{logoutError && <p role="alert">{logoutError}</p>}</div>
  </>;

  return <div className="estancia-panel painel-layout">
    <aside className="painel-sidebar">{sidebar}</aside>
    <dialog ref={drawer} className="painel-drawer" aria-label="Menu do painel" onClick={(event) => { if (event.target === event.currentTarget) drawer.current?.close(); }}><div className="painel-drawer-content"><button type="button" className="painel-drawer-close" aria-label="Fechar menu" onClick={() => drawer.current?.close()}>×</button>{sidebar}</div></dialog>
    <main className="painel-main">
      <header className="painel-topbar"><div><button className="calendar-icon-button painel-menu-button" type="button" aria-label="Abrir menu" onClick={() => drawer.current?.showModal()}>☰</button><button className="calendar-icon-button" type="button" aria-label="Voltar" onClick={() => { if (pathname === "/painel/agenda" || pathname === "/painel/bilheteria") router.push(legacyRoleId === 3 ? "/painel/bilheteria" : "/painel/agenda"); else router.back(); }}>‹</button><span>Painel operacional</span></div><Link href="/" className="painel-site-link" target="_blank" rel="noreferrer">Ver site ↗</Link></header>
      <div className="painel-content">{children}</div>
    </main>
  </div>;
}
