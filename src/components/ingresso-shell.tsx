"use client";

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
    label: "AGENDAMENTO",
    href: "/agenda",
  },
  {
    key: "buy" as const,
    label: "COMPRAR",
    href: "/agenda",
  },
  {
    key: "tickets" as const,
    label: "MEUS INGRESSOS",
    href: "/meus-ingressos",
  },
  {
    key: "account" as const,
    label: "MEUS DADOS",
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
    <div className="min-h-screen overflow-x-hidden bg-white text-[var(--brown-1)]">
      <header className="relative bg-[linear-gradient(180deg,#3d97da_0%,#1a5c8c_100%)]">
        <div className="mx-auto flex w-full max-w-[1920px] flex-col gap-4 px-4 pb-8 pt-5 md:px-6 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
          <div className="flex items-start gap-6">
            <Link href="/" className="shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/rincao-logo.png"
                alt="Clube e Park Rincao - Pousada e Lazer"
                width={340}
                height={159}
                className="h-auto w-[280px] md:w-[340px]"
              />
            </Link>

            <nav className="hidden self-center lg:block">
              <ul className="flex items-end gap-2 pt-5">
                {navItems.map((item) => {
                  const isActive =
                    item.key === active ||
                    (active === "auth" &&
                      (item.key === "schedule" || item.key === "buy"));

                  return (
                    <li key={item.key}>
                      <Link
                        href={item.href}
                        className={`legacy-condensed inline-flex min-h-[46px] items-center border-b-[3px] px-3 text-[18px] text-white transition ${
                          isActive
                            ? "border-white"
                            : "border-white/45 hover:border-white/80"
                        }`}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>

          <div className="flex flex-col items-start gap-3 text-left text-white lg:items-end lg:pt-4 lg:text-right">
            {user ? (
              <div className="flex flex-wrap items-center gap-3 text-[14px]">
                <span className="legacy-rounded">{user.name}</span>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={logoutPending}
                  className="underline underline-offset-2 disabled:opacity-60"
                >
                  {logoutPending ? "saindo..." : "deslogar"}
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-3 text-[14px]">
                <Link href="/login" className="underline underline-offset-2">
                  entrar
                </Link>
                <Link href="/cadastro" className="underline underline-offset-2">
                  criar conta
                </Link>
              </div>
            )}

            <Link
              href="/"
              className="legacy-rounded inline-flex min-h-[42px] items-center justify-center rounded-full border border-white px-5 text-[14px] text-white hover:bg-white/10"
            >
              Voltar para o site
            </Link>
          </div>
        </div>

        <div
          aria-hidden
          className="h-9 w-full bg-cover bg-left-top bg-no-repeat"
          style={{ backgroundImage: "url('/theme/color-bar.png')" }}
        />
      </header>

      <main className="pb-12">{children}</main>

      <footer className="mt-8">
        <div
          aria-hidden
          className="h-9 w-full bg-cover bg-left-top bg-no-repeat"
          style={{ backgroundImage: "url('/theme/color-bar.png')" }}
        />
      </footer>
    </div>
  );
}
