"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Script from "next/script";
import { useState } from "react";
import { EstanciaLogo } from "@/components/estancia-logo";
import { contact } from "@/lib/site-content";

const marketingNav = [
  { href: "/#inicio", label: "Início" },
  { href: "/#atracoes", label: "Atrações" },
  { href: "/#eventos", label: "Eventos" },
];

const socialLinks = [
  { href: contact.instagram, src: "/brand/instagram.png", label: "Instagram" },
  { href: contact.facebook, src: "/brand/facebook.png", label: "Facebook" },
  { href: contact.tiktok, src: "/brand/tiktok.png", label: "TikTok" },
].filter((item) => item.href && item.href !== "#");

export function SiteShell({
  children,
  customerMenuHref,
}: {
  children: React.ReactNode;
  customerMenuHref: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
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

  if (usesStandaloneShell) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f7faf6] text-[#17351f]">
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
        className="fixed inset-x-0 top-0 z-40 border-b border-[rgba(35,73,63,0.08)] bg-white shadow-[0_10px_30px_rgba(21,48,42,0.06)]"
      >
        <div className="mx-auto grid min-h-[76px] w-[min(1240px,calc(100%-28px))] grid-cols-[auto_1fr] items-center gap-3 py-2 sm:w-[min(1240px,calc(100%-40px))] lg:min-h-[104px] lg:grid-cols-[220px_1fr_auto] lg:gap-6">
          <EstanciaLogo
            href="/"
            compact
            className="h-[40px] max-w-[170px] sm:h-[48px] sm:max-w-[210px] lg:h-[62px] lg:max-w-[260px]"
          />

          <button
            type="button"
            aria-label="Abrir menu"
            onClick={() => setMenuOpen((current) => !current)}
            className="flex h-[46px] w-[46px] items-center justify-center justify-self-end rounded-[8px] border border-[#d8e0d4] bg-white text-[22px] font-black text-[#17342d] shadow-[0_12px_28px_rgba(22,47,41,0.1)] lg:hidden"
          >
            =
          </button>

          <nav
            className={`${
              menuOpen ? "block" : "hidden"
            } absolute left-5 right-5 top-[calc(100%+12px)] rounded-[8px] border border-[rgba(35,73,63,0.08)] bg-white p-4 text-left shadow-[0_24px_48px_rgba(19,48,41,0.14)] lg:static lg:col-start-2 lg:row-start-1 lg:block lg:justify-self-center lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none`}
          >
            <ul className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-center lg:gap-[34px]">
              {[
                ...marketingNav,
                { href: customerMenuHref, label: "Minha conta" },
                { href: "/agenda", label: "Comprar ingressos" },
              ].map(({ label, href }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="relative py-1 text-[1rem] font-medium text-[#17342d] transition after:absolute after:bottom-[-4px] after:left-0 after:right-0 after:h-0.5 after:origin-center after:scale-x-0 after:bg-current after:transition hover:after:scale-x-100"
                    onClick={() => setMenuOpen(false)}
                  >
                    {label}
                  </Link>
                </li>
              ))}
              <li className="pt-2 lg:hidden">
                <a
                  href={contact.whatsapp}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-[48px] w-full items-center justify-center rounded-full bg-[#1a6b3a] px-7 text-[0.96rem] font-bold text-white shadow-[0_14px_30px_rgba(26,107,58,0.22)] transition hover:-translate-y-0.5 hover:bg-[#145630]"
                >
                  WhatsApp
                </a>
              </li>
              {socialLinks.length > 0 ? (
                <li className="flex items-center gap-3 pt-1 lg:hidden">
                  {socialLinks.map((item) => (
                    <a
                      key={item.label}
                      href={item.href}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={item.label}
                      className="grid h-10 w-10 place-items-center rounded-full border border-[#d8e0d4] bg-white transition hover:-translate-y-0.5 hover:border-[#bdd5c3]"
                    >
                      <Image
                        src={item.src}
                        alt=""
                        width={24}
                        height={24}
                        className="h-6 w-6"
                      />
                    </a>
                  ))}
                </li>
              ) : null}
            </ul>
          </nav>

          <div className="hidden lg:flex lg:items-center lg:gap-3 lg:justify-self-end">
            <a
              href={contact.whatsapp}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-[#d8e0d4] px-6 text-[0.95rem] font-bold text-[#17342d] transition hover:border-[#bdd5c3] hover:bg-[#f4f8f2]"
            >
              WhatsApp
            </a>
            <Link
              href="/agenda"
              className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-[#1a6b3a] px-6 text-[0.95rem] font-bold text-white shadow-[0_14px_30px_rgba(26,107,58,0.22)] transition hover:-translate-y-0.5 hover:bg-[#145630]"
            >
              Agenda e compra
            </Link>
            {socialLinks.length > 0 ? (
              <div className="flex items-center gap-2 pl-1">
                {socialLinks.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={item.label}
                    className="grid h-10 w-10 place-items-center rounded-full border border-[#d8e0d4] bg-white transition hover:-translate-y-0.5 hover:border-[#bdd5c3]"
                  >
                    <Image
                      src={item.src}
                      alt=""
                      width={24}
                      height={24}
                      className="h-6 w-6"
                    />
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <main className={isHome ? "pt-[76px] lg:pt-[108px]" : ""}>{children}</main>

      <footer className="bg-[#17342d] px-5 py-14 text-left text-white">
        <div className="mx-auto grid max-w-[1240px] gap-10 lg:grid-cols-[1.35fr_0.9fr_0.9fr_1.1fr]">
          <div>
            <strong className="block text-[1.22rem] text-white">
              {"Est\u00e2ncia e Parque Ecol\u00f3gico das \u00c1guas"}
            </strong>
            <p className="mt-3 max-w-[520px] text-[0.96rem] leading-7 text-white/72">
              {
                "Natureza, lazer e experi\u00eancias em fam\u00edlia em uma jornada de compra mais clara e mais moderna."
              }
            </p>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/45">
              Páginas
            </p>
            <nav className="mt-4 flex flex-col gap-3 text-[0.96rem] text-white/76">
              {marketingNav.map((item) => (
                <Link key={item.href} href={item.href} className="hover:text-white">
                  {item.label}
                </Link>
              ))}
              <Link href="/agenda" className="hover:text-white">
                Comprar ingressos
              </Link>
            </nav>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/45">
              Atendimento
            </p>
            <div className="mt-4 flex flex-col gap-3 text-[0.96rem] text-white/76">
              <Link href={customerMenuHref} className="hover:text-white">
                Minha conta
              </Link>
              <a href={contact.whatsapp} target="_blank" rel="noreferrer" className="hover:text-white">
                WhatsApp oficial
              </a>
              <a href={contact.map} target="_blank" rel="noreferrer" className="hover:text-white">
                Como chegar
              </a>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/45">
              Contato
            </p>
            <div className="mt-4 space-y-3 text-[0.96rem] leading-7 text-white/76">
              <p>{contact.address}</p>
              <p>{contact.phones[0]}</p>
              {socialLinks.length > 0 ? (
                <div className="flex items-center gap-3 pt-2">
                  {socialLinks.map((item) => (
                    <a
                      key={item.label}
                      href={item.href}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={item.label}
                      className="grid h-10 w-10 place-items-center rounded-full bg-white/10 transition hover:-translate-y-0.5 hover:bg-white/16"
                    >
                      <Image
                        src={item.src}
                        alt=""
                        width={24}
                        height={24}
                        className="h-6 w-6"
                      />
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mx-auto mt-10 max-w-[1240px] border-t border-white/10 pt-8">
          <div className="overflow-hidden rounded-[24px] border border-white/10 bg-white/5 shadow-[0_18px_40px_rgba(0,0,0,0.16)]">
            <iframe
              title="Mapa da Estância"
              src={contact.mapEmbed}
              className="h-[260px] w-full md:h-[320px]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>

        <div className="mx-auto mt-10 flex max-w-[1240px] flex-col gap-3 border-t border-white/10 pt-6 text-[0.9rem] text-white/52 md:flex-row md:items-center md:justify-between">
          <p className="m-0">{"\u00a9 2026 Est\u00e2ncia. Todos os direitos reservados."}</p>
          <div className="flex flex-wrap gap-4">
            <Link href={customerMenuHref} className="hover:text-white">
              Minha conta
            </Link>
            <Link href="/agenda" className="hover:text-white">
              Comprar ingressos
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
