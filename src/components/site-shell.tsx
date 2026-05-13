"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Script from "next/script";
import { useState } from "react";
import { contact, primaryNav } from "@/lib/site-content";

export function SiteShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

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
    <div className="min-h-screen overflow-x-hidden bg-white text-[var(--brown-1)]">
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
        className="fixed bottom-4 left-4 z-50 md:bottom-[2%] md:left-[2%]"
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

      <header className="site-header">
        <Link href="/" className="site-logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/rincao-logo.png"
            alt="Estancia"
            width={340}
            height={159}
            className="h-auto w-[300px] md:w-[340px]"
          />
        </Link>

        <nav className={`site-nav ${menuOpen ? "is-open" : ""}`}>
          <button
            type="button"
            aria-label="Abrir menu"
            onClick={() => setMenuOpen((current) => !current)}
            className="site-mobile-menu"
          />
          <ul>
            {primaryNav
              .filter((item) => item.href !== "/")
              .map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="site-nav-link legacy-condensed"
                    onClick={() => setMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
          </ul>
        </nav>

        <div className="site-header-actions">
          <Link
            href="/agenda"
            className="site-ticket"
          >
            Comprar
            <span className="legacy-condensed">Ingressos</span>
          </Link>

          <a
            href={contact.facebook}
            target="_blank"
            rel="noreferrer"
            className="site-social site-social-last"
          >
            <Image src="/brand/facebook.png" alt="Facebook" width={40} height={40} />
          </a>
          <a
            href={contact.instagram}
            target="_blank"
            rel="noreferrer"
            className="site-social"
          >
            <Image src="/brand/instagram.png" alt="Instagram" width={40} height={40} />
          </a>
          <a
            href={contact.tiktok}
            target="_blank"
            rel="noreferrer"
            className="site-social"
          >
            <Image src="/brand/tiktok.png" alt="TikTok" width={40} height={40} />
          </a>
        </div>

        <ol className="site-account-links">
          <li>
            <Link
              href="/meus-ingressos"
              className="site-account-link"
            >
              Meus Ingressos
            </Link>
          </li>
          <li>
            <Link
              href="/minha-conta"
              className="site-account-link"
            >
              Minha Conta
            </Link>
          </li>
        </ol>

        <div
          aria-hidden
          className="absolute bottom-[-13px] left-0 z-[1] h-9 w-full bg-cover bg-left-top bg-no-repeat"
          style={{ backgroundImage: "url('/theme/color-bar.png')" }}
        />
      </header>

      <main>{children}</main>

      <footer className="relative mt-10 text-left">
        <div
          className="bg-cover bg-center bg-no-repeat px-4 py-10 text-center md:px-10"
          style={{ backgroundImage: "url('/theme/pool-bg.jpg')" }}
        >
          <h2 className="legacy-rounded text-[26px] text-white drop-shadow-[2px_2px_6px_rgba(0,0,0,0.45)]">
            Conheça nossa estrutura e agende seu evento
          </h2>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <a href={contact.whatsapp} className="legacy-button">
              Solicite um orçamento
            </a>
            <Link
              href="/estrutura"
              className="legacy-rounded text-base text-white underline"
            >
              Conheça nossa estrutura
            </Link>
          </div>
        </div>

        <div className="bg-[#165189] px-5 py-6">
          <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-center gap-6 md:justify-between">
            <div className="flex items-center gap-6">
              <a href={contact.instagram} target="_blank" rel="noreferrer">
                <Image src="/brand/instagram.png" alt="Instagram" width={50} height={50} />
              </a>
              <a href={contact.tiktok} target="_blank" rel="noreferrer">
                <Image src="/brand/tiktok.png" alt="TikTok" width={50} height={50} />
              </a>
              <a
                href={contact.facebook}
                target="_blank"
                rel="noreferrer"
                className="legacy-rounded flex items-center gap-3 text-base text-white"
              >
                <Image src="/brand/facebook.png" alt="Facebook" width={50} height={50} />
                <span>Acompanhe nossa página no Facebook</span>
              </a>
            </div>
          </div>
        </div>

        <div className="relative bg-[#1b5d96] px-5 pb-24 pt-6 text-white">
          <div
            aria-hidden
            className="absolute left-0 top-[-20px] h-9 w-full bg-cover bg-left-top bg-no-repeat"
            style={{ backgroundImage: "url('/theme/color-bar.png')" }}
          />
          <div className="mx-auto grid max-w-[1320px] gap-8 lg:grid-cols-[1fr_1fr_400px]">
            <div className="flex gap-4">
              <div className="pt-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/theme/mark.png"
                  alt=""
                  width={18}
                  height={24}
                  className="h-auto w-[18px]"
                />
              </div>
              <div className="legacy-rounded text-[15px]">
                <address className="not-italic">
                  Av. do Jaceguava, 2.222
                  <br />
                  Jardim Casa Grande
                  <br />
                  São Paulo - SP
                  <br />
                  CEP: 04.870-425
                </address>
                <br />
                <span>{contact.company}</span>
                <br />
                <span>CNPJ: {contact.cnpj}</span>
                <br />
                <br />
                <Link href="/localizacao" className="underline">
                  Como chegar
                </Link>
              </div>
            </div>

            <div className="legacy-rounded">
              <a
                href={`mailto:${contact.email}`}
                className="text-[17px] text-white underline"
              >
                {contact.email}
              </a>
              <br />
              <a href={contact.whatsapp} className="legacy-button mt-3">
                entre em contato
              </a>
            </div>

            <div className="site-facebook-box relative">
              <a
                href={contact.facebook}
                target="_blank"
                rel="noreferrer"
                className="site-facebook-fallback absolute inset-0 z-0 flex flex-col justify-between p-5 text-[#1b5d96]"
              >
                <div>
                  <p className="legacy-rounded text-[18px]">Estancia</p>
                  <p className="mt-3 text-sm leading-6">
                    Acompanhe novidades, agenda e conteúdos institucionais na nossa página oficial.
                  </p>
                </div>
                <span className="legacy-button max-w-max">abrir Facebook</span>
              </a>
              <div
                className="fb-page relative z-10"
                data-href="#"
                data-tabs="timeline"
                data-width="400"
                data-height="200"
                data-small-header="false"
                data-adapt-container-width="false"
                data-hide-cover="false"
                data-show-facepile="true"
              >
                <blockquote
                  cite="#"
                  className="fb-xfbml-parse-ignore"
                >
                  <a href="#">Estancia</a>
                </blockquote>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
