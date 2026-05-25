"use client";

import { EstanciaLogo } from "@/components/estancia-logo";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AuthUser } from "@/lib/auth-contracts";

type IngressoShellProps = {
  children: React.ReactNode;
  active: "schedule" | "buy" | "tickets" | "account" | "auth";
  user?: AuthUser | null;
};

const navItems = [
  {
    key: "schedule" as const,
    label: "Agendamento",
    href: "/agenda",
  },
  {
    key: "buy" as const,
    label: "Comprar",
    href: "/agenda",
  },
  {
    key: "tickets" as const,
    label: "Meus ingressos",
    href: "/meus-ingressos",
  },
  {
    key: "account" as const,
    label: "Meus dados",
    href: "/minha-conta",
  },
];

export function IngressoShell({
  children,
  active,
  user = null,
}: IngressoShellProps) {
  const router = useRouter();
  const [logoutPending, setLogoutPending] = useState(false);

  async function handleLogout() {
    setLogoutPending(true);

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } catch (error) {
      console.error("customer-logout-failed", error);
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[linear-gradient(180deg,#f8f5ef_0%,#fbfaf7_32%,#ffffff_100%)] text-[#17312d]">
      <header className="sticky top-0 z-40 border-b border-[rgba(35,73,63,0.08)] bg-white/95 shadow-[0_10px_30px_rgba(21,48,42,0.06)] backdrop-blur-md">
        <div className="mx-auto grid min-h-[96px] w-[min(1240px,calc(100%-40px))] grid-cols-1 items-center gap-4 py-3 lg:grid-cols-[260px_1fr_260px]">
          <div className="flex justify-center lg:justify-start">
            <EstanciaLogo href="/" compact className="h-[62px] max-w-[260px]" />
          </div>

          <nav className="order-3 justify-self-center lg:order-none">
            <ul className="flex flex-wrap items-center justify-center gap-5 md:gap-8">
              {navItems.map((item) => {
                const isActive =
                  item.key === active ||
                  (active === "auth" &&
                    (item.key === "schedule" || item.key === "buy"));

                return (
                  <li key={item.key}>
                    <Link
                      href={item.href}
                      className={`relative py-1 text-[0.96rem] font-bold transition after:absolute after:bottom-[-4px] after:left-0 after:right-0 after:h-0.5 after:origin-center after:bg-current after:transition ${
                        isActive
                          ? "text-[#17342d] after:scale-x-100"
                          : "text-[#5e746e] after:scale-x-0 hover:text-[#17342d] hover:after:scale-x-100"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex flex-col items-center gap-3 text-center lg:items-end lg:text-right">
            {user ? (
              <div className="flex flex-wrap items-center gap-3 text-[14px]">
                <span className="font-bold text-[#17351f]">{user.name}</span>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={logoutPending}
                  className="text-[#426048] underline underline-offset-2 disabled:opacity-60"
                >
                  {logoutPending ? "saindo..." : "deslogar"}
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-3 text-[14px]">
                <Link href="/login" className="text-[#426048] underline underline-offset-2">
                  entrar
                </Link>
                <Link href="/cadastro" className="text-[#426048] underline underline-offset-2">
                  criar conta
                </Link>
              </div>
            )}

            <Link
              href="/"
              className="inline-flex min-h-[42px] items-center justify-center rounded-full border border-[rgba(35,73,63,0.12)] bg-[rgba(35,73,63,0.04)] px-5 text-[14px] font-bold text-[#17342d] hover:bg-[#17342d] hover:text-white"
            >
              Voltar para o site
            </Link>
          </div>
        </div>
      </header>

      <main className="pb-12">{children}</main>
    </div>
  );
}
