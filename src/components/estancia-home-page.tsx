"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
} from "react";
import type {
  ManagedAttraction,
  ManagedEvent,
  ManagedHomeImage,
} from "@/lib/estancia-content-store";

type EstanciaHomePageProps = {
  heroImages: ManagedHomeImage[];
  attractions: ManagedAttraction[];
  events: ManagedEvent[];
};

function moveIndex(current: number, direction: -1 | 1, length: number) {
  return (current + direction + length) % length;
}

function resolveNearestIndex(element: HTMLDivElement | null) {
  if (!element) {
    return 0;
  }

  const center = element.scrollLeft + element.clientWidth / 2;
  const children = Array.from(element.children) as HTMLElement[];
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;

  children.forEach((child, index) => {
    const childCenter = child.offsetLeft + child.clientWidth / 2;
    const distance = Math.abs(childCenter - center);

    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });

  return bestIndex;
}

function scrollCarouselToIndex(element: HTMLDivElement | null, index: number) {
  if (!element) {
    return;
  }

  const child = element.children.item(index) as HTMLElement | null;

  if (!child) {
    return;
  }

  child.scrollIntoView({
    behavior: "smooth",
    inline: "center",
    block: "nearest",
  });
}

function releasePointerCapture(element: HTMLElement, pointerId: number) {
  if (element.hasPointerCapture(pointerId)) {
    element.releasePointerCapture(pointerId);
  }
}

function isExternalHref(href: string) {
  return /^https?:\/\//i.test(href);
}

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      aria-hidden="true"
      className="h-6 w-6"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={3}
    >
      {direction === "left" ? (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 19l-7-7 7-7"
        />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      )}
    </svg>
  );
}

function shouldIgnoreCarouselPointer(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    Boolean(target.closest("a, button, input, textarea, select, label"))
  );
}

function HeroBannerImage({
  image,
  active,
  preload,
}: {
  image: ManagedHomeImage;
  active: boolean;
  preload: boolean;
}) {
  const mobileSrc = image.mobileSrc?.trim() || image.desktopSrc;
  const href = image.href?.trim() || "";
  const imageMarkup = (
    <picture
      className="block h-full w-full select-none"
      onDragStart={(event) => event.preventDefault()}
    >
      {mobileSrc !== image.desktopSrc ? (
        <source media="(max-width: 767px)" srcSet={mobileSrc} />
      ) : null}
      <img
        src={image.desktopSrc}
        alt={image.alt}
        className="block h-full w-full object-cover object-center"
        loading={preload ? "eager" : "lazy"}
        fetchPriority={preload ? "high" : "auto"}
        draggable={false}
        onDragStart={(event) => event.preventDefault()}
      />
    </picture>
  );

  return (
    <div
      className={`absolute inset-0 transition-opacity duration-300 ${
        active ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      {href ? (
        isExternalHref(href) ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            aria-label={image.alt}
            className="block h-full w-full"
            draggable={false}
            onDragStart={(event) => event.preventDefault()}
          >
            {imageMarkup}
          </a>
        ) : (
          <Link
            href={href}
            aria-label={image.alt}
            className="block h-full w-full"
            draggable={false}
            onDragStart={(event) => event.preventDefault()}
          >
            {imageMarkup}
          </Link>
        )
      ) : (
        imageMarkup
      )}
    </div>
  );
}

export function EstanciaHomePage({
  heroImages,
  attractions,
  events,
}: EstanciaHomePageProps) {
  const hasHeroImages = heroImages.length > 0;
  const [heroIndex, setHeroIndex] = useState(0);
  const [attractionIndex, setAttractionIndex] = useState(0);
  const [eventIndex, setEventIndex] = useState(0);
  const heroMouseDragRef = useRef<{
    startX: number;
    deltaX: number;
    dragged: boolean;
  } | null>(null);
  const heroDragRef = useRef<{
    pointerId: number;
    startX: number;
    deltaX: number;
    dragged: boolean;
  } | null>(null);
  const attractionsRef = useRef<HTMLDivElement>(null);
  const eventsRef = useRef<HTMLDivElement>(null);
  const heroClickSuppressedRef = useRef(false);
  const carouselDragRef = useRef<{
    element: HTMLDivElement;
    pointerId: number;
    x: number;
    scrollLeft: number;
    dragged: boolean;
  } | null>(null);
  const carouselClickSuppressedRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (heroImages.length <= 1) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setHeroIndex((current) => moveIndex(current, 1, heroImages.length));
    }, 7000);

    return () => window.clearTimeout(timeoutId);
  }, [heroImages.length, heroIndex]);

  useEffect(() => {
    function handleWindowMouseMove(event: MouseEvent | globalThis.MouseEvent) {
      const drag = heroMouseDragRef.current;

      if (!drag) {
        return;
      }

      drag.deltaX = event.clientX - drag.startX;

      if (Math.abs(drag.deltaX) >= 12) {
        drag.dragged = true;
      }
    }

    function handleWindowMouseUp() {
      const drag = heroMouseDragRef.current;

      if (!drag) {
        return;
      }

      heroMouseDragRef.current = null;

      if (!drag.dragged || Math.abs(drag.deltaX) < 34) {
        return;
      }

      heroClickSuppressedRef.current = true;
      setHeroIndex((current) =>
        moveIndex(current, drag.deltaX < 0 ? 1 : -1, heroImages.length),
      );
    }

    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleWindowMouseUp);
    };
  }, [heroImages.length]);

  function handleHeroMouseDown(event: MouseEvent<HTMLElement>) {
    if (!hasHeroImages || event.button !== 0) {
      return;
    }

    event.preventDefault();
    heroClickSuppressedRef.current = false;
    heroMouseDragRef.current = {
      startX: event.clientX,
      deltaX: 0,
      dragged: false,
    };
  }

  function handleHeroPointerDown(event: PointerEvent<HTMLElement>) {
    if (!hasHeroImages) {
      return;
    }

    if (event.pointerType === "mouse") {
      return;
    }

    heroClickSuppressedRef.current = false;
    heroDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      deltaX: 0,
      dragged: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleHeroPointerMove(event: PointerEvent<HTMLElement>) {
    if (!hasHeroImages || event.pointerType === "mouse") {
      return;
    }

    if (
      !heroDragRef.current ||
      heroDragRef.current.pointerId !== event.pointerId
    ) {
      return;
    }

    heroDragRef.current.deltaX = event.clientX - heroDragRef.current.startX;

    if (Math.abs(heroDragRef.current.deltaX) >= 12) {
      heroDragRef.current.dragged = true;
    }
  }

  function handleHeroPointerUp(event: PointerEvent<HTMLElement>) {
    if (!hasHeroImages || event.pointerType === "mouse") {
      return;
    }

    if (
      !heroDragRef.current ||
      heroDragRef.current.pointerId !== event.pointerId
    ) {
      return;
    }

    const distance = heroDragRef.current.deltaX;
    const dragged = heroDragRef.current.dragged;
    heroDragRef.current = null;
    releasePointerCapture(event.currentTarget, event.pointerId);

    if (!dragged || Math.abs(distance) < 34) {
      return;
    }

    heroClickSuppressedRef.current = true;
    setHeroIndex((current) =>
      moveIndex(current, distance < 0 ? 1 : -1, heroImages.length),
    );
  }

  function handleCarouselPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (shouldIgnoreCarouselPointer(event.target)) {
      carouselDragRef.current = null;
      return;
    }

    carouselClickSuppressedRef.current = null;
    carouselDragRef.current = {
      element: event.currentTarget,
      pointerId: event.pointerId,
      x: event.clientX,
      scrollLeft: event.currentTarget.scrollLeft,
      dragged: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleCarouselPointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = carouselDragRef.current;

    if (
      !drag ||
      drag.element !== event.currentTarget ||
      drag.pointerId !== event.pointerId
    ) {
      return;
    }

    const distance = event.clientX - drag.x;

    if (Math.abs(distance) >= 10) {
      drag.dragged = true;
    }

    if (!drag.dragged) {
      return;
    }

    event.currentTarget.scrollLeft = drag.scrollLeft - distance;
  }

  function handleCarouselPointerEnd(event: PointerEvent<HTMLDivElement>) {
    const drag = carouselDragRef.current;

    if (
      drag &&
      drag.element === event.currentTarget &&
      drag.pointerId === event.pointerId &&
      drag.dragged
    ) {
      carouselClickSuppressedRef.current = event.currentTarget;
    }

    releasePointerCapture(event.currentTarget, event.pointerId);
    carouselDragRef.current = null;
  }

  function moveAttraction(direction: -1 | 1) {
    const nextIndex = Math.min(
      Math.max(attractionIndex + direction, 0),
      attractions.length - 1,
    );
    setAttractionIndex(nextIndex);
    scrollCarouselToIndex(attractionsRef.current, nextIndex);
  }

  function moveEvent(direction: -1 | 1) {
    const nextIndex = Math.min(
      Math.max(eventIndex + direction, 0),
      events.length - 1,
    );
    setEventIndex(nextIndex);
    scrollCarouselToIndex(eventsRef.current, nextIndex);
  }

  return (
    <div className="min-h-screen bg-[#fbfaf7] text-[#17342d]">
      <section
        id="inicio"
        onMouseDown={handleHeroMouseDown}
        onPointerDown={handleHeroPointerDown}
        onPointerMove={handleHeroPointerMove}
        onPointerUp={handleHeroPointerUp}
        onPointerCancel={(event) => {
          releasePointerCapture(event.currentTarget, event.pointerId);
          heroDragRef.current = null;
          heroClickSuppressedRef.current = false;
        }}
        onClickCapture={(event) => {
          if (!heroClickSuppressedRef.current) {
            return;
          }

          event.preventDefault();
          event.stopPropagation();
          heroClickSuppressedRef.current = false;
        }}
        style={{ touchAction: "pan-y" }}
        className="relative h-[76svh] min-h-[520px] scroll-mt-[76px] cursor-grab select-none overflow-hidden bg-[#0b1110] active:cursor-grabbing lg:scroll-mt-[108px]"
      >
        {hasHeroImages ? (
          <>
            <div className="absolute inset-0">
              {heroImages.map((image, index) => (
                <HeroBannerImage
                  key={image.id}
                  image={image}
                  active={index === heroIndex}
                  preload={index === 0}
                />
              ))}
            </div>
            <div className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 gap-2">
              {heroImages.map((image, index) => (
                <button
                  key={image.id}
                  type="button"
                  aria-label={`Ver imagem ${index + 1}`}
                  onClick={() => setHeroIndex(index)}
                  className={`h-2.5 rounded-full bg-white/85 transition-all ${
                    index === heroIndex ? "w-9" : "w-2.5 opacity-60"
                  }`}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#315c43_0%,#17342d_55%,#0b1110_100%)]" />
        )}
      </section>

      <main>
        <section
          id="atracoes"
          className="scroll-mt-[96px] bg-[linear-gradient(180deg,#f7faf6_0%,#fbfaf7_100%)] px-5 py-16 md:py-20 lg:scroll-mt-[132px]"
        >
          <div className="mx-auto w-full max-w-[1240px]">
            <div className="mb-10 text-left">
              <p className="mb-3 text-[12px] font-bold uppercase tracking-[0.22em] text-[#1f6b36]">
                Parque
              </p>
              <h2 className="m-0 text-[clamp(2.4rem,5vw,4.2rem)] font-black leading-[0.95] text-[#17342d]">
                Atrações
              </h2>
            </div>

            <div className="relative">
              {attractions.length > 1 ? (
                <>
                  {attractionIndex > 0 ? (
                    <button
                      type="button"
                      aria-label="Atração anterior"
                      onClick={() => moveAttraction(-1)}
                      className="absolute left-0 top-1/2 z-10 hidden h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[#17342d] shadow-[0_14px_30px_rgba(19,48,41,0.16)] transition hover:bg-[#17342d] hover:text-white md:flex"
                    >
                      <ChevronIcon direction="left" />
                    </button>
                  ) : null}
                  {attractionIndex < attractions.length - 1 ? (
                    <button
                      type="button"
                      aria-label="Próxima atração"
                      onClick={() => moveAttraction(1)}
                      className="absolute right-0 top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full bg-white text-[#17342d] shadow-[0_14px_30px_rgba(19,48,41,0.16)] transition hover:bg-[#17342d] hover:text-white md:flex"
                    >
                      <ChevronIcon direction="right" />
                    </button>
                  ) : null}
                </>
              ) : null}

              <div
                ref={attractionsRef}
                onPointerDown={handleCarouselPointerDown}
                onPointerMove={handleCarouselPointerMove}
                onPointerUp={handleCarouselPointerEnd}
                onPointerCancel={handleCarouselPointerEnd}
                onClickCapture={(event) => {
                  if (carouselClickSuppressedRef.current !== event.currentTarget) {
                    return;
                  }

                  event.preventDefault();
                  event.stopPropagation();
                  carouselClickSuppressedRef.current = null;
                }}
                onScroll={(event) =>
                  setAttractionIndex(resolveNearestIndex(event.currentTarget))
                }
                style={{ touchAction: "pan-y" }}
                className="-mx-5 flex cursor-grab select-none snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-5 [scrollbar-width:none] active:cursor-grabbing md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden"
              >
                {attractions.map((attraction) => (
                  <article
                    key={attraction.title}
                    className="grid min-w-[86vw] snap-center overflow-hidden rounded-[18px] border border-[#dfe8d8] bg-[#f2f0ed] shadow-[0_22px_52px_rgba(23,52,45,0.08)] md:min-h-[360px] md:min-w-[920px] md:grid-cols-[0.98fr_1fr] lg:min-w-[1120px]"
                  >
                    <div className="order-2 h-full md:order-none">
                      <div className="h-full bg-[#dfe8d8]">
                        <img
                          src={attraction.imageSrc}
                          alt={attraction.title}
                          className="block h-[240px] w-full object-cover object-center md:h-full md:min-h-[360px]"
                          loading="lazy"
                          draggable={false}
                        />
                      </div>
                    </div>
                    <div className="flex flex-col justify-center px-6 py-8 text-left md:px-10">
                      <h3 className="text-[1.8rem] font-black uppercase leading-[0.95] text-[#5b635f] md:text-[2.85rem]">
                        {attraction.title}
                      </h3>
                      <p className="mt-5 max-w-[560px] text-[1rem] leading-8 text-[#365048]">
                        {attraction.description}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section
          id="eventos"
          className="scroll-mt-[96px] bg-[#17342d] px-5 py-16 text-white md:py-20 lg:scroll-mt-[132px]"
        >
          <div className="mx-auto w-full max-w-[1240px]">
            <div className="mb-9 text-center">
              <p className="mb-3 text-[12px] font-bold uppercase tracking-[0.22em] text-white/62">
                Agenda
              </p>
              <h2 className="text-[clamp(2.4rem,5vw,4.2rem)] font-black leading-[0.95] text-white">
                Eventos
              </h2>
            </div>

            {events.length === 0 ? (
              <div className="rounded-[18px] border border-white/12 bg-white/8 px-6 py-10 text-center">
                <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-white/62">
                  Agenda do parque
                </p>
                <h3 className="mt-3 text-[28px] font-black text-white">
                  Não há eventos atuais
                </h3>
                <p className="mx-auto mt-3 max-w-[560px] text-[15px] leading-7 text-white/72">
                  Assim que uma nova programação for publicada, ela vai aparecer
                  aqui para o cliente.
                </p>
              </div>
            ) : (
              <div className="relative">
                {events.length > 1 ? (
                  <>
                    {eventIndex > 0 ? (
                      <button
                        type="button"
                        aria-label="Evento anterior"
                        onClick={() => moveEvent(-1)}
                        className="absolute left-0 top-1/2 z-10 hidden h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[#17342d] shadow-[0_14px_30px_rgba(19,48,41,0.16)] transition hover:bg-[#17342d] hover:text-white md:flex"
                      >
                        <ChevronIcon direction="left" />
                      </button>
                    ) : null}
                    {eventIndex < events.length - 1 ? (
                      <button
                        type="button"
                        aria-label="Próximo evento"
                        onClick={() => moveEvent(1)}
                        className="absolute right-0 top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full bg-white text-[#17342d] shadow-[0_14px_30px_rgba(19,48,41,0.16)] transition hover:bg-[#17342d] hover:text-white md:flex"
                      >
                        <ChevronIcon direction="right" />
                      </button>
                    ) : null}
                  </>
                ) : null}

                <div
                  ref={eventsRef}
                  onPointerDown={handleCarouselPointerDown}
                  onPointerMove={handleCarouselPointerMove}
                  onPointerUp={handleCarouselPointerEnd}
                  onPointerCancel={handleCarouselPointerEnd}
                  onClickCapture={(event) => {
                    if (carouselClickSuppressedRef.current !== event.currentTarget) {
                      return;
                    }

                    event.preventDefault();
                    event.stopPropagation();
                    carouselClickSuppressedRef.current = null;
                  }}
                  onScroll={(event) =>
                    setEventIndex(resolveNearestIndex(event.currentTarget))
                  }
                  style={{ touchAction: "pan-y" }}
                  className="-mx-5 flex cursor-grab select-none snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-5 [scrollbar-width:none] active:cursor-grabbing md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden"
                >
                  {events.map((event) => (
                    <article
                      key={event.title}
                      className="grid min-w-[86vw] snap-center items-stretch overflow-hidden rounded-[18px] bg-[#efeded] shadow-[0_24px_54px_rgba(5,18,14,0.24)] md:min-h-[380px] md:min-w-[920px] md:grid-cols-[0.98fr_1fr] lg:min-w-[1120px]"
                    >
                      <Link
                        href={event.href}
                        className="block h-full overflow-hidden bg-white"
                        aria-label={event.title}
                        onPointerDown={(pointerEvent) =>
                          pointerEvent.stopPropagation()
                        }
                      >
                        <img
                          src={event.imageSrc}
                          alt={event.title}
                          className="block h-[260px] w-full object-cover object-center transition-transform duration-500 hover:scale-[1.03] md:h-full md:min-h-[380px]"
                          loading="lazy"
                          draggable={false}
                        />
                      </Link>

                      <div className="flex flex-col justify-center px-6 py-8 text-left md:px-10">
                        <h3 className="mb-5 text-[clamp(2rem,4vw,2.8rem)] font-black leading-[0.95] text-[#071514]">
                          {event.title}
                        </h3>
                        <p className="mb-7 text-[1rem] leading-8 text-[#4b6570]">
                          {event.description}
                        </p>
                        <Link
                          href={event.href}
                          className="inline-flex min-h-[52px] w-fit items-center justify-center rounded-full bg-[#1a6b3a] px-8 text-[0.95rem] font-black text-white shadow-[0_16px_28px_rgba(26,107,58,0.24)] transition hover:-translate-y-0.5 hover:bg-[#145630]"
                          onPointerDown={(pointerEvent) =>
                            pointerEvent.stopPropagation()
                          }
                        >
                          {event.buttonLabel}
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
