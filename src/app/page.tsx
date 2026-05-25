"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, type PointerEvent } from "react";

const heroImages = [
  {
    src: "/hero/current/banner-site-oficial-1.jpg",
    alt: "Piscina e \u00e1rea verde do Est\u00e2ncia",
  },
  {
    src: "/hero/current/banner-onda.jpg",
    alt: "Piscina de ondas do Est\u00e2ncia",
  },
  {
    src: "/hero/current/banner-14-06-2026.jpg",
    alt: "Evento no Est\u00e2ncia",
  },
];

const attractions = [
  {
    title: "Piscina Natural",
    description:
      "\u00c1gua, sombra e \u00e1rea verde para aproveitar o dia em fam\u00edlia com conforto.",
    imageSrc: "/photos/estrutura-piscina.jpg",
    imageAlt: "Piscina natural do Est\u00e2ncia",
  },
  {
    title: "Trilhas e Natureza",
    description:
      "Caminhos ao ar livre, paisagens do parque e contato direto com a natureza.",
    imageSrc: "/photos/day-use.jpg",
    imageAlt: "\u00c1rea verde e trilhas do Est\u00e2ncia",
  },
  {
    title: "Piscina de Ondas",
    description:
      "Uma das experi\u00eancias mais procuradas para quem quer brincar na \u00e1gua.",
    imageSrc: "/hero/current/banner-onda.jpg",
    imageAlt: "Piscina de ondas do Est\u00e2ncia",
  },
  {
    title: "Buffet Caipira",
    description:
      "Sabores do parque em uma experi\u00eancia gastron\u00f4mica simples e bem servida.",
    imageSrc: "/photos/estrutura-galeria.jpg",
    imageAlt: "Buffet e estrutura gastron\u00f4mica do Est\u00e2ncia",
  },
];

const events = [
  {
    title: "Festa Junina",
    description:
      "Comidas t\u00edpicas, m\u00fasica, brincadeiras e lazer ao ar livre em um dia preparado para curtir com a fam\u00edlia no Est\u00e2ncia.",
    imageSrc: "/hero/current/banner-14-06-2026.jpg",
    imageAlt: "Festa Junina no Est\u00e2ncia e Parque Ecol\u00f3gico das \u00c1guas",
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
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.68)_0%,rgba(0,0,0,0.36)_30%,rgba(16,43,37,0.1)_58%,rgba(0,0,0,0.38)_100%)]" />

        <button
          type="button"
          aria-label="Imagem anterior"
          onClick={() =>
            setHeroIndex((current) => moveIndex(current, -1, heroImages.length))
          }
          className="absolute left-5 top-1/2 z-10 hidden h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-3xl font-black text-white shadow-[0_16px_30px_rgba(0,0,0,0.22)] transition hover:bg-black/55 md:flex"
        >
          {"<"}
        </button>
        <button
          type="button"
          aria-label="Pr\u00f3xima imagem"
          onClick={() =>
            setHeroIndex((current) => moveIndex(current, 1, heroImages.length))
          }
          className="absolute right-5 top-1/2 z-10 hidden h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-3xl font-black text-white shadow-[0_16px_30px_rgba(0,0,0,0.22)] transition hover:bg-black/55 md:flex"
        >
          {">"}
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
        <section id="atracoes" className="px-5 py-14 md:py-20">
          <div className="mx-auto w-full max-w-[1240px]">
            <div className="mb-9 text-center">
              <p className="mb-3 text-[12px] font-bold uppercase tracking-[0.18em] text-[#1f6b36]">
                Parque
              </p>
              <h2 className="m-0 text-[clamp(2rem,4vw,3.4rem)] font-black leading-none text-[#7a7a7a]">
                {"Atra\u00e7\u00f5es"}
              </h2>
            </div>

            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 right-0 z-10 hidden items-center justify-between md:flex">
                <button
                  type="button"
                  aria-label="Atra\u00e7\u00e3o anterior"
                  onClick={() => scrollCarousel(attractionsRef.current, -1)}
                  className="pointer-events-auto -ml-5 flex h-12 w-12 items-center justify-center rounded-full bg-white text-3xl font-black text-[#17342d] shadow-[0_14px_30px_rgba(19,48,41,0.16)]"
                >
                  {"<"}
                </button>
                <button
                  type="button"
                  aria-label="Pr\u00f3xima atra\u00e7\u00e3o"
                  onClick={() => scrollCarousel(attractionsRef.current, 1)}
                  className="pointer-events-auto -mr-5 flex h-12 w-12 items-center justify-center rounded-full bg-white text-3xl font-black text-[#17342d] shadow-[0_14px_30px_rgba(19,48,41,0.16)]"
                >
                  {">"}
                </button>
              </div>

              <div
                ref={attractionsRef}
                onPointerDown={handleCarouselPointerDown}
                onPointerMove={handleCarouselPointerMove}
                onPointerUp={handleCarouselPointerEnd}
                onPointerCancel={handleCarouselPointerEnd}
                className="-mx-5 flex cursor-grab snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-5 [scrollbar-width:none] active:cursor-grabbing md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden"
              >
                {attractions.map((attraction) => (
                  <article
                    key={attraction.title}
                    className="grid min-w-[86vw] snap-center overflow-hidden rounded-[8px] bg-[#efeded] md:min-w-[920px] md:grid-cols-[0.98fr_1fr] lg:min-w-[1120px]"
                  >
                    <div className="order-2 min-h-[220px] md:order-none">
                      <div className="relative h-full min-h-[220px] md:min-h-[340px]">
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
                      <h3 className="text-[1.8rem] font-black uppercase leading-none text-[#7a7a7a] md:text-[2.45rem]">
                        {attraction.title}
                      </h3>
                      <p className="mt-5 max-w-[560px] text-[0.98rem] leading-7 text-[#273b45]">
                        {attraction.description}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="eventos" className="px-5 py-14 md:py-20">
          <div className="mx-auto w-full max-w-[1240px]">
            <h2 className="mb-9 text-center text-[clamp(2rem,4vw,3.4rem)] font-black leading-none text-[#7a7a7a]">
              Eventos
            </h2>

            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 right-0 z-10 hidden items-center justify-between md:flex">
                <button
                  type="button"
                  aria-label="Evento anterior"
                  onClick={() => scrollCarousel(eventsRef.current, -1)}
                  className="pointer-events-auto -ml-5 flex h-12 w-12 items-center justify-center rounded-full bg-white text-3xl font-black text-[#17342d] shadow-[0_14px_30px_rgba(19,48,41,0.16)]"
                >
                  {"<"}
                </button>
                <button
                  type="button"
                  aria-label="Pr\u00f3ximo evento"
                  onClick={() => scrollCarousel(eventsRef.current, 1)}
                  className="pointer-events-auto -mr-5 flex h-12 w-12 items-center justify-center rounded-full bg-white text-3xl font-black text-[#17342d] shadow-[0_14px_30px_rgba(19,48,41,0.16)]"
                >
                  {">"}
                </button>
              </div>

              <div
                ref={eventsRef}
                onPointerDown={handleCarouselPointerDown}
                onPointerMove={handleCarouselPointerMove}
                onPointerUp={handleCarouselPointerEnd}
                onPointerCancel={handleCarouselPointerEnd}
                className="-mx-5 flex cursor-grab snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-5 [scrollbar-width:none] active:cursor-grabbing md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden"
              >
                {events.map((event) => (
                  <article
                    key={event.title}
                    className="grid min-w-[86vw] snap-center items-stretch overflow-hidden rounded-[8px] bg-[#efeded] md:min-w-[920px] md:grid-cols-[0.98fr_1fr] lg:min-w-[1120px]"
                  >
                    <Link
                      href={event.href}
                      className="relative block min-h-[260px] bg-white md:min-h-[380px]"
                      aria-label={event.title}
                    >
                      <Image
                        src={event.imageSrc}
                        alt={event.imageAlt}
                        fill
                        className="object-cover transition-transform duration-500 hover:scale-[1.03]"
                        sizes="(max-width: 1024px) 86vw, 560px"
                      />
                    </Link>

                    <div className="flex flex-col justify-center px-6 py-8 text-left md:px-10">
                      <h3 className="mb-5 text-[clamp(2rem,4vw,2.8rem)] font-black leading-none text-[#071514]">
                        {event.title}
                      </h3>
                      <p className="mb-7 text-[0.98rem] leading-7 text-[#4b6570]">
                        {event.description}
                      </p>
                      <Link
                        href={event.href}
                        className="inline-flex min-h-[52px] w-fit items-center justify-center rounded-full bg-[#086eb8] px-8 text-[0.95rem] font-black text-white shadow-[0_16px_28px_rgba(8,110,184,0.18)] transition hover:-translate-y-0.5 hover:bg-[#045d9e]"
                      >
                        {event.buttonLabel}
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
