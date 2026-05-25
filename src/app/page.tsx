"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, type PointerEvent } from "react";

const heroImages = [
  {
    src: "/hero/current/banner-site-oficial-1.jpg",
    alt: "Piscina e área verde do Estância",
  },
  {
    src: "/hero/current/banner-onda.jpg",
    alt: "Piscina de ondas do Estância",
  },
  {
    src: "/hero/current/banner-14-06-2026.jpg",
    alt: "Evento no Estância",
  },
];

const attractions = [
  {
    title: "Piscina Natural",
    description:
      "Água, sombra e área verde para aproveitar o dia em família com conforto.",
    imageSrc: "/photos/estrutura-piscina.jpg",
    imageAlt: "Piscina natural do Estância",
  },
  {
    title: "Trilhas e Natureza",
    description:
      "Caminhos ao ar livre, paisagens do parque e contato direto com a natureza.",
    imageSrc: "/photos/day-use.jpg",
    imageAlt: "Área verde e trilhas do Estância",
  },
  {
    title: "Piscina de Ondas",
    description:
      "Uma das experiências mais procuradas para quem quer brincar na água.",
    imageSrc: "/hero/current/banner-onda.jpg",
    imageAlt: "Piscina de ondas do Estância",
  },
  {
    title: "Buffet Caipira",
    description:
      "Sabores do parque em uma experiência gastronômica simples e bem servida.",
    imageSrc: "/photos/estrutura-galeria.jpg",
    imageAlt: "Buffet e estrutura gastronômica do Estância",
  },
];

const events = [
  {
    category: "Evento especial",
    title: "Festa Junina",
    description:
      "Comidas típicas, música, brincadeiras e lazer ao ar livre em um dia preparado para curtir com a família no Estância.",
    imageSrc: "/hero/current/banner-14-06-2026.jpg",
    imageAlt: "Festa Junina no Estância e Parque Ecológico das Águas",
    href: "/agenda?mes=6&ano=2026&date=2026-06-14",
    buttonLabel: "Compre seu ingresso!",
  },
];

function moveIndex(current: number, direction: -1 | 1, length: number) {
  return (current + direction + length) % length;
}

function scrollCarousel(element: HTMLDivElement | null, direction: -1 | 1) {
  if (!element) {
    return;
  }

  element.scrollBy({
    left: direction * Math.max(320, element.clientWidth * 0.86),
    behavior: "smooth",
  });
}

export default function Home() {
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroDragStart, setHeroDragStart] = useState<number | null>(null);
  const attractionsRef = useRef<HTMLDivElement>(null);
  const eventsRef = useRef<HTMLDivElement>(null);
  const carouselDragRef = useRef<{
    element: HTMLDivElement;
    x: number;
    scrollLeft: number;
  } | null>(null);

  function handleHeroPointerUp(event: PointerEvent<HTMLElement>) {
    if (heroDragStart === null) {
      return;
    }

    const distance = event.clientX - heroDragStart;
    setHeroDragStart(null);

    if (Math.abs(distance) < 34) {
      return;
    }

    setHeroIndex((current) =>
      moveIndex(current, distance < 0 ? 1 : -1, heroImages.length),
    );
  }

  function handleCarouselPointerDown(event: PointerEvent<HTMLDivElement>) {
    carouselDragRef.current = {
      element: event.currentTarget,
      x: event.clientX,
      scrollLeft: event.currentTarget.scrollLeft,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleCarouselPointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = carouselDragRef.current;

    if (!drag || drag.element !== event.currentTarget) {
      return;
    }

    event.currentTarget.scrollLeft = drag.scrollLeft - (event.clientX - drag.x);
  }

  function handleCarouselPointerEnd() {
    carouselDragRef.current = null;
  }

  return (
    <div className="min-h-screen bg-[#fbfaf7] text-[#17342d]">
      <section
        id="inicio"
        onPointerDown={(event) => setHeroDragStart(event.clientX)}
        onPointerUp={handleHeroPointerUp}
        onPointerCancel={() => setHeroDragStart(null)}
        className="relative h-[76svh] min-h-[520px] cursor-grab overflow-hidden bg-[#17342d] active:cursor-grabbing"
      >
        <div className="absolute inset-0">
          {heroImages.map((image, index) => (
            <Image
              key={image.src}
              src={image.src}
              alt={image.alt}
              fill
              priority={index === 0}
              className={`object-cover transition-opacity duration-500 ${
                index === heroIndex ? "opacity-100" : "opacity-0"
              }`}
              sizes="100vw"
            />
          ))}
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.64)_0%,rgba(0,0,0,0.28)_28%,rgba(16,43,37,0.05)_58%,rgba(0,0,0,0.36)_100%)]" />

        <button
          type="button"
          aria-label="Imagem anterior"
          onClick={() =>
            setHeroIndex((current) => moveIndex(current, -1, heroImages.length))
          }
          className="absolute left-5 top-1/2 z-10 hidden h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-3xl font-black text-white shadow-[0_16px_30px_rgba(0,0,0,0.22)] transition hover:bg-black/55 md:flex"
        >
          ‹
        </button>
        <button
          type="button"
          aria-label="Próxima imagem"
          onClick={() =>
            setHeroIndex((current) => moveIndex(current, 1, heroImages.length))
          }
          className="absolute right-5 top-1/2 z-10 hidden h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-3xl font-black text-white shadow-[0_16px_30px_rgba(0,0,0,0.22)] transition hover:bg-black/55 md:flex"
        >
          ›
        </button>

        <div className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 gap-2">
          {heroImages.map((image, index) => (
            <button
              key={image.src}
              type="button"
              aria-label={`Ver imagem ${index + 1}`}
              onClick={() => setHeroIndex(index)}
              className={`h-2.5 rounded-full bg-white/85 transition-all ${
                index === heroIndex ? "w-9" : "w-2.5 opacity-60"
              }`}
            />
          ))}
        </div>
      </section>

      <main>
        <section id="atracoes" className="px-5 py-16 md:py-24">
          <div className="mx-auto w-full max-w-[1240px]">
            <div className="mb-10 flex items-end justify-between gap-5">
              <div className="text-left md:text-center md:mx-auto">
                <p className="mb-3 text-[12px] font-bold uppercase tracking-[0.18em] text-[#1f6b36]">
                  Parque
                </p>
                <h2 className="m-0 text-[clamp(2.4rem,5vw,4.2rem)] font-black leading-none text-[#7a7a7a]">
                  Atrações
                </h2>
              </div>
              <div className="flex shrink-0 gap-3">
                <button
                  type="button"
                  aria-label="Atração anterior"
                  onClick={() => scrollCarousel(attractionsRef.current, -1)}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-3xl font-black text-[#17342d] shadow-[0_14px_30px_rgba(19,48,41,0.12)]"
                >
                  ‹
                </button>
                <button
                  type="button"
                  aria-label="Próxima atração"
                  onClick={() => scrollCarousel(attractionsRef.current, 1)}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-3xl font-black text-[#17342d] shadow-[0_14px_30px_rgba(19,48,41,0.12)]"
                >
                  ›
                </button>
              </div>
            </div>

            <div
              ref={attractionsRef}
              onPointerDown={handleCarouselPointerDown}
              onPointerMove={handleCarouselPointerMove}
              onPointerUp={handleCarouselPointerEnd}
              onPointerCancel={handleCarouselPointerEnd}
              className="-mx-5 flex cursor-grab snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-5 [scrollbar-width:thin] active:cursor-grabbing md:mx-0 md:px-0"
            >
              {attractions.map((attraction) => (
                <article
                  key={attraction.title}
                  className="grid min-w-[86vw] snap-center overflow-hidden rounded-[8px] bg-[#efeded] md:min-w-[920px] md:grid-cols-[0.98fr_1fr] lg:min-w-[1120px]"
                >
                  <div className="order-2 min-h-[240px] md:order-none">
                    <div className="relative h-full min-h-[240px] md:min-h-[360px]">
                      <Image
                        src={attraction.imageSrc}
                        alt={attraction.imageAlt}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 86vw, 560px"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col justify-center px-6 py-8 text-left md:px-10">
                    <h3 className="text-[2rem] font-black uppercase leading-none text-[#7a7a7a] md:text-[2.8rem]">
                      {attraction.title}
                    </h3>
                    <p className="mt-5 max-w-[560px] text-[1rem] leading-8 text-[#273b45]">
                      {attraction.description}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="eventos" className="bg-[#dff2f7] px-5 py-16 md:py-24">
          <div className="mx-auto w-full max-w-[1240px]">
            <div className="mb-10 flex items-end justify-between gap-5">
              <div className="text-left">
                <p className="mb-3 text-[12px] font-bold uppercase tracking-[0.18em] text-[#096b81]">
                  Eventos
                </p>
                <h2 className="m-0 text-[clamp(2rem,4vw,3.4rem)] font-semibold leading-none text-[#071514]">
                  Programação do Estância
                </h2>
              </div>
              <div className="flex shrink-0 gap-3">
                <button
                  type="button"
                  aria-label="Evento anterior"
                  onClick={() => scrollCarousel(eventsRef.current, -1)}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-3xl font-black text-[#071514] shadow-[0_14px_30px_rgba(0,83,111,0.12)]"
                >
                  ‹
                </button>
                <button
                  type="button"
                  aria-label="Próximo evento"
                  onClick={() => scrollCarousel(eventsRef.current, 1)}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-3xl font-black text-[#071514] shadow-[0_14px_30px_rgba(0,83,111,0.12)]"
                >
                  ›
                </button>
              </div>
            </div>

            <div
              ref={eventsRef}
              onPointerDown={handleCarouselPointerDown}
              onPointerMove={handleCarouselPointerMove}
              onPointerUp={handleCarouselPointerEnd}
              onPointerCancel={handleCarouselPointerEnd}
              className="-mx-5 flex cursor-grab snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-5 [scrollbar-width:thin] active:cursor-grabbing md:mx-0 md:px-0"
            >
              {events.map((event) => (
                <article
                  key={event.title}
                  className="grid min-w-[86vw] snap-center items-stretch gap-9 lg:min-w-[1120px] lg:grid-cols-[minmax(0,1fr)_420px]"
                >
                  <Link
                    href={event.href}
                    className="relative block min-h-[360px] overflow-hidden rounded-[8px] bg-white shadow-[0_22px_44px_rgba(0,83,111,0.12)] md:min-h-[460px]"
                    aria-label={event.title}
                  >
                    <Image
                      src={event.imageSrc}
                      alt={event.imageAlt}
                      fill
                      className="object-cover transition-transform duration-500 hover:scale-[1.03]"
                      sizes="(max-width: 1024px) 100vw, 760px"
                    />
                  </Link>

                  <div className="flex flex-col justify-center text-left">
                    <p className="mb-4 text-[12px] font-bold uppercase tracking-[0.18em] text-[#096b81]">
                      {event.category}
                    </p>
                    <h3 className="mb-5 text-[clamp(2.2rem,4vw,3.2rem)] font-black leading-none text-[#071514]">
                      {event.title}
                    </h3>
                    <p className="mb-7 text-[1.04rem] leading-8 text-[#4b6570]">
                      {event.description}
                    </p>
                    <Link
                      href={event.href}
                      className="inline-flex min-h-[58px] w-fit items-center justify-center rounded-full bg-[#086eb8] px-10 text-[1rem] font-black text-white shadow-[0_16px_28px_rgba(8,110,184,0.18)] transition hover:-translate-y-0.5 hover:bg-[#045d9e]"
                    >
                      {event.buttonLabel}
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 py-16 md:py-20">
          <div className="mx-auto grid max-w-[1180px] items-center gap-8 rounded-[8px] border border-[rgba(35,73,63,0.1)] bg-white p-7 shadow-[0_20px_48px_rgba(19,48,41,0.08)] md:grid-cols-[1fr_auto] md:p-9">
            <div className="text-left">
              <p className="mb-3 text-[12px] font-bold uppercase tracking-[0.18em] text-[#1f6b36]">
                Data da visita
              </p>
              <h2 className="m-0 max-w-[720px] text-[clamp(2rem,4vw,3.2rem)] font-semibold leading-none text-[#17342d]">
                Compre agora seu passaporte.
              </h2>
            </div>
            <Link
              href="/agenda"
              className="inline-flex min-h-[58px] w-fit items-center justify-center rounded-full bg-[#1f6b36] px-9 text-[1rem] font-black text-white shadow-[0_14px_26px_rgba(31,107,54,0.18)] transition hover:-translate-y-0.5 hover:bg-[#17342d]"
            >
              Comprar ingressos
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
