"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Script from "next/script";
import { useEffect, useState } from "react";
import { EstanciaLogo } from "@/components/estancia-logo";
import { contact } from "@/lib/site-content";

export function SiteShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const isHome = pathname === "/";

  const usesStandaloneShell =
    pathname.startsWith("/painel") ||
    pathname === "/agenda" ||
    pathname === "/ingresso/escola" ||
    pathname === "/ingresso/educador" ||
    pathname.startsWith("/agendar/") ||
    pathname.startsWith("/comprar/") ||
    pathname.startsWith("/checkout/") ||
    pathname === "/login" ||
    pathname === "/cadastro" ||
    pathname === "/meus-ingressos" ||
    pathname === "/minha-conta" ||
    pathname.startsWith("/minha-conta/");

  useEffect(() => {
    if (usesStandaloneShell || !isHome) {
      return;
    }

    const handleScroll = () => setScrolled(window.scrollY > 16);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, [isHome, usesStandaloneShell]);

  if (usesStandaloneShell) {
    return <>{children}</>;
  }

  const headerIsSolid = !isHome || scrolled || menuOpen;

  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-[#17351f]">
      <div id="fb-root" />
      <Script
        id="facebook-jssdk"
        strategy="afterInteractive"
        src="https://connect.facebook.net/pt_BR/sdk.js#xfbml=1&version=v23.0"
      />

      <a
        href={contact.whatsapp}
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-4 right-4 z-50 md:bottom-[2%] md:right-[2%]"
      >
        <Image
          src="/theme/whatsapp-icon.png"
          alt="WhatsApp"
          width={80}
          height={80}
          className="h-[60px] w-[60px] md:h-[80px] md:w-[80px]"
          style={{ height: "auto" }}
        />
      </a>

      <header
        className={`fixed inset-x-0 top-0 z-40 transition-all duration-200 ${
          headerIsSolid
            ? "border-b border-[rgba(35,73,63,0.08)] bg-white/95 shadow-[0_10px_30px_rgba(21,48,42,0.06)] backdrop-blur-md"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto grid min-h-[108px] w-[min(1240px,calc(100%-40px))] grid-cols-[auto_1fr] items-center gap-5 py-2 lg:grid-cols-[auto_1fr]">
          <EstanciaLogo
            href="/"
            compact
            light={!headerIsSolid}
            className="h-[62px] max-w-[260px]"
          />

          <button
            type="button"
            aria-label="Abrir menu"
            onClick={() => setMenuOpen((current) => !current)}
            className={`flex h-[50px] w-[50px] items-center justify-center justify-self-end rounded-[8px] border text-[22px] font-black lg:hidden ${
              headerIsSolid
                ? "border-[#d8e0d4] bg-white text-[#17342d] shadow-[0_12px_28px_rgba(22,47,41,0.1)]"
                : "border-white/20 bg-white/10 text-white"
            }`}
          >
            =
          </button>

          <nav
            className={`${
              menuOpen ? "block" : "hidden"
            } absolute left-5 right-5 top-[calc(100%+12px)] rounded-[8px] border border-[rgba(35,73,63,0.08)] bg-white p-4 text-left shadow-[0_24px_48px_rgba(19,48,41,0.14)] lg:static lg:col-start-2 lg:row-start-1 lg:block lg:justify-self-center lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none`}
          >
            <ul className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-[34px]">
              {[
                ["In\u00edcio", "/"],
                ["Atra\u00e7\u00f5es", "/#atracoes"],
                ["Eventos", "/#eventos"],
                ["Comprar ingressos", "/agenda"],
              ].map(([label, href]) => (
                <li key={href}>
                  <Link
                    href={href}
                    className={`relative py-1 text-[1rem] font-medium transition after:absolute after:bottom-[-4px] after:left-0 after:right-0 after:h-0.5 after:origin-center after:scale-x-0 after:bg-current after:transition hover:after:scale-x-100 ${
                      headerIsSolid ? "text-[#17342d]" : "text-white"
                    } ${headerIsSolid ? "" : "drop-shadow-[0_2px_8px_rgba(0,0,0,0.75)]"}`}
                    onClick={() => setMenuOpen(false)}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t border-[rgba(22,47,41,0.08)] bg-[linear-gradient(180deg,rgba(23,52,45,0.04),rgba(23,52,45,0.08))] px-5 py-10 text-left">
        <div className="mx-auto grid max-w-[1240px] gap-7 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center">
          <div>
            <strong className="block text-[1.1rem] text-[#17342d]">
              {"Est\u00e2ncia e Parque Ecol\u00f3gico das \u00c1guas"}
            </strong>
            <p className="mt-2 max-w-[520px] text-[0.95rem] leading-7 text-[#5e746e]">
              {"Turismo, lazer, natureza e eventos em uma experi\u00eancia completa."}
            </p>
          </div>

          <nav className="flex flex-wrap gap-5 text-[0.96rem] font-bold text-[#17342d]">
            <Link href="/">{"In\u00edcio"}</Link>
            <Link href="/#atracoes">{"Atra\u00e7\u00f5es"}</Link>
            <Link href="/#eventos">Eventos</Link>
            <Link href="/agenda">Comprar ingressos</Link>
          </nav>

          <p className="m-0 text-[0.92rem] leading-7 text-[#5e746e]">
            {"\u00a9 2026 Est\u00e2ncia. Todos os direitos reservados."}
          </p>
        </div>
      </footer>
    </div>
  );
}
