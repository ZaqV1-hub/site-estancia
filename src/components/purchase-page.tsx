"use client";

import { IngressoShell } from "@/components/ingresso-shell";
import {
  FlowIcon,
  FlowStepper,
  IconBubble,
  PrimaryFlowButton,
} from "@/components/order-flow-ui";
import type { AuthUser } from "@/lib/auth-contracts";
import type { B2cProduct } from "@/lib/b2c-catalog-defaults";
import type {
  CreatePurchaseResponse,
  PurchaseAgendaDetail,
} from "@/lib/purchase-contracts";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type PurchasePageProps = {
  agenda: PurchaseAgendaDetail;
  user: AuthUser;
  products: B2cProduct[];
};

type PurchaseStep = "passports" | "addons" | "review";
type Quantities = Record<string, number>;

function formatCurrency(value: number | string) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value));
}

function normalizeMoney(value: number) {
  return value.toFixed(2);
}

function buildClientCartSummary(
  products: B2cProduct[],
  lineItems: { productId: string; quantity: number }[],
) {
  const lines = lineItems.map((item) => {
    const product = products.find((current) => current.id === item.productId);
    const unitPrice = product ? Number(product.fixedPrice) : 0;

    if (!product || !Number.isFinite(unitPrice)) {
      throw new Error("Produto indisponível para compra.");
    }

    return {
      productId: product.id,
      type: product.type,
      title: product.title,
      subtitle: product.subtitle,
      imageSrc: product.imageSrc,
      quantity: item.quantity,
      unitPrice: normalizeMoney(unitPrice),
      totalValue: normalizeMoney(unitPrice * item.quantity),
    };
  });

  const passportQuantity = lines
    .filter((line) => line.type === "passport")
    .reduce((total, line) => total + line.quantity, 0);
  const totalValue = normalizeMoney(
    lines.reduce((total, line) => total + Number(line.totalValue), 0),
  );

  return { lines, passportQuantity, totalValue };
}

function formatLongDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

async function readResponseBody<T>(response: Response) {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function ProductCard({
  product,
  quantity,
  onStep,
}: {
  product: B2cProduct;
  quantity: number;
  onStep: (delta: number) => void;
}) {
  const selected = quantity > 0;

  return (
    <article
      className={`relative overflow-hidden rounded-[12px] border bg-white p-2.5 shadow-[0_10px_24px_rgba(18,52,45,0.055)] transition ${
        selected ? "border-[#18ac26]" : "border-[#dfe8dc]"
      }`}
    >
      {selected ? (
        <span className="absolute right-2.5 top-2.5 z-10 grid h-7 w-7 place-items-center rounded-full bg-[#20aa1f] text-[16px] font-black text-white">
          ✓
        </span>
      ) : null}

      <div className="grid grid-cols-[92px_1fr] gap-3 sm:grid-cols-[132px_1fr] xl:grid-cols-1 xl:gap-0">
        <div className="relative h-[88px] overflow-hidden rounded-[9px] bg-[#eef3e8] sm:h-[112px] xl:h-[108px]">
          <Image
            src={product.imageSrc}
            alt={product.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 92px, (max-width: 1280px) 132px, 200px"
          />
        </div>

        <div className="flex min-h-[88px] flex-col xl:min-h-[142px] xl:pt-2.5">
          <h3 className="text-[16px] font-black leading-tight text-[#073f35] xl:text-[18px]">
            {product.title}
          </h3>
          <p className="mt-1 text-[12px] leading-4 text-[#626469] xl:min-h-[34px] xl:text-[13px]">
            {product.subtitle}
          </p>
          <strong className="mt-2 block text-[17px] font-black text-[#073f35] xl:mt-2.5 xl:text-[18px]">
            {formatCurrency(product.fixedPrice)}
          </strong>

          <div className="mt-auto flex items-center gap-1.5 pt-2.5">
            <button
              type="button"
              aria-label={`Remover ${product.title}`}
              onClick={() => onStep(-1)}
              className="grid h-8 w-8 place-items-center rounded-[7px] border border-[#d7e3d2] bg-white text-[19px] font-black text-[#073f35] hover:border-[#20aa1f] sm:h-9 sm:w-9"
            >
              -
            </button>
            <span className="grid h-8 min-w-8 place-items-center rounded-[7px] border border-[#d7e3d2] bg-white px-2.5 text-[16px] font-black text-[#073f35] sm:h-9 sm:min-w-9 sm:text-[17px]">
              {quantity}
            </span>
            <button
              type="button"
              aria-label={`Adicionar ${product.title}`}
              onClick={() => onStep(1)}
              className="grid h-8 w-8 place-items-center rounded-[7px] bg-[#11883b] text-[21px] font-black text-white shadow-[0_10px_20px_rgba(17,136,59,0.16)] hover:bg-[#0c6e30] sm:h-9 sm:w-9"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

export function PurchasePage({ agenda, user, products }: PurchasePageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const passports = products.filter((product) => product.type === "passport");
  const addons = products.filter((product) => product.type === "addon");
  const [step, setStep] = useState<PurchaseStep>("passports");
  const [quantities, setQuantities] = useState<Quantities>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCarouselPage, setActiveCarouselPage] = useState(0);
  const dateLabel = formatLongDate(agenda.date);

  const lineItems = useMemo(
    () =>
      Object.entries(quantities)
        .filter(([, quantity]) => quantity > 0)
        .map(([productId, quantity]) => ({ productId, quantity })),
    [quantities],
  );

  const cart = useMemo(() => {
    if (lineItems.length === 0) {
      return null;
    }

    try {
      return buildClientCartSummary(products, lineItems);
    } catch {
      return null;
    }
  }, [lineItems, products]);

  const passportQuantity = cart?.passportQuantity ?? 0;
  const totalQuantity =
    cart?.lines.reduce((total, line) => total + line.quantity, 0) ?? 0;
  const totalValue = cart?.totalValue ?? "0.00";
  const desktopDotCount = step === "passports" ? 3 : 1;

  useEffect(() => {
    const element = carouselRef.current;

    if (!element) {
      return;
    }

    function syncPage() {
      const width = element.clientWidth || 1;
      const ratio = element.scrollLeft / width;
      const nextPage = Math.max(
        0,
        Math.min(desktopDotCount - 1, Math.round(ratio)),
      );
      setActiveCarouselPage(nextPage);
    }

    syncPage();
    element.addEventListener("scroll", syncPage, { passive: true });

    return () => element.removeEventListener("scroll", syncPage);
  }, [desktopDotCount, step]);

  function setProductQuantity(productId: string, delta: number) {
    setQuantities((current) => ({
      ...current,
      [productId]: Math.max((current[productId] ?? 0) + delta, 0),
    }));
  }

  function goTo(nextStep: PurchaseStep) {
    if (nextStep !== "passports" && passportQuantity <= 0) {
      setError("Selecione pelo menos um passaporte para continuar.");
      setStep("passports");
      return;
    }

    setError(null);
    setStep(nextStep);
  }

  async function handleSubmit() {
    if (!cart || passportQuantity <= 0) {
      setError("Selecione pelo menos um passaporte para continuar.");
      setStep("passports");
      return;
    }

    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/me/purchases", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          agendaId: agenda.id,
          lineItems,
        }),
      });

      const payload = await readResponseBody<
        | CreatePurchaseResponse
        | {
            ok: false;
            error: {
              message: string;
            };
          }
      >(response);

      if (response.status === 401) {
        router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
        return;
      }

      if (!response.ok || !payload?.ok) {
        setError(
          payload && !payload.ok
            ? payload.error.message
            : "Não foi possível iniciar a compra agora.",
        );
        return;
      }

      router.replace(payload.data.checkoutRedirect);
      router.refresh();
    } catch (requestError) {
      console.error("purchase-submit-failed", requestError);
      setError("Não foi possível iniciar a compra agora.");
    } finally {
      setPending(false);
    }
  }

  function scrollProducts(direction: "prev" | "next") {
    const element = carouselRef.current;

    if (!element) {
      return;
    }

    element.scrollBy({
      left: direction === "next" ? 252 : -252,
      behavior: "smooth",
    });
  }

  function renderProducts(currentProducts: B2cProduct[], title: string) {
    return (
      <div>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[21px] font-black leading-[1.04] text-[#073f35] sm:text-[28px] lg:text-[32px]">
              {title}
            </h1>
            <p className="mt-2 max-w-[500px] text-[13px] leading-5 text-[#626469] lg:text-[15px]">
              Selecione os passaportes que deseja incluir na sua visita.
            </p>
          </div>
          <Link
            href="/agenda"
            className="hidden min-h-10 items-center gap-2.5 rounded-full border border-[#d8dfd7] bg-white px-3.5 text-[13px] font-black text-[#073f35] shadow-[0_8px_18px_rgba(18,52,45,0.045)] hover:border-[#20aa1f] lg:inline-flex"
          >
            <FlowIcon name="calendar" className="h-4 w-4" />
            Alterar data
          </Link>
        </div>

        <div className="relative">
          <button
            type="button"
            aria-label="Ver item anterior"
            onClick={() => scrollProducts("prev")}
            className="absolute -left-10 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-[#d8dfd7] bg-white text-[22px] font-black leading-none text-[#073f35] shadow-[0_10px_20px_rgba(18,52,45,0.07)] xl:grid"
          >
            ‹
          </button>
          <div
            ref={carouselRef}
            className="grid gap-3 md:grid-cols-2 xl:flex xl:snap-x xl:snap-mandatory xl:overflow-x-auto xl:pb-4 xl:pr-8 xl:[scrollbar-width:none] xl:[&::-webkit-scrollbar]:hidden"
          >
            {currentProducts.map((product) => (
              <div
                key={product.id}
                className="xl:w-[212px] xl:min-w-[212px] xl:snap-start"
              >
                <ProductCard
                  product={product}
                  quantity={quantities[product.id] ?? 0}
                  onStep={(delta) => setProductQuantity(product.id, delta)}
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            aria-label="Ver próximo item"
            onClick={() => scrollProducts("next")}
            className="absolute -right-2 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-[#d8dfd7] bg-white text-[22px] font-black leading-none text-[#073f35] shadow-[0_10px_20px_rgba(18,52,45,0.07)] xl:grid"
          >
            ›
          </button>
        </div>

        <div className="mt-3 hidden items-center justify-center gap-2.5 xl:flex">
          {Array.from({ length: desktopDotCount }).map((_, index) => (
            <span
              key={`carousel-dot-${index}`}
              className={`h-2.5 w-2.5 rounded-full border ${
                index === activeCarouselPage
                  ? "border-[#073f35] bg-[#073f35]"
                  : "border-[#d7ddd7] bg-white"
              }`}
            />
          ))}
        </div>

        <p className="mt-3 hidden items-center justify-center gap-2.5 text-[12px] text-[#626469] xl:flex">
          <FlowIcon name="bag" className="h-4 w-4 text-[#20aa1f]" />
          Arraste ou use as setas para ver mais opções de passaportes.
        </p>
      </div>
    );
  }

  function renderCartSummary(compact = false) {
    return (
      <>
        <div className={compact ? "space-y-2.5" : "mt-3 space-y-3"}>
          {cart?.lines.length ? (
            cart.lines.map((line) => (
              <div
                key={line.productId}
                className={`flex items-center justify-between gap-3 ${
                  compact ? "" : "border-b border-[#dfe8dc] pb-4"
                }`}
              >
                {!compact && line.imageSrc ? (
                  <div className="relative h-14 w-14 overflow-hidden rounded-[8px] bg-[#eef3e8]">
                    <Image
                      src={line.imageSrc}
                      alt={line.title}
                      fill
                      className="object-cover"
                      sizes="56px"
                    />
                  </div>
                ) : null}
                <div className="min-w-0 flex-1">
                  <strong className="block truncate text-[13px] font-black text-[#073f35] sm:text-[14px]">
                    {compact ? `${line.quantity}x ${line.title}` : line.title}
                  </strong>
                  {!compact ? (
                    <span className="mt-1 block text-[12px] text-[#626469]">
                      x{line.quantity}
                    </span>
                  ) : null}
                </div>
                <strong className="whitespace-nowrap text-[13px] font-black text-[#073f35] sm:text-[14px]">
                  {formatCurrency(line.totalValue)}
                </strong>
              </div>
            ))
          ) : (
            <p className="text-[13px] font-semibold text-[#626469]">
              Nenhum produto selecionado.
            </p>
          )}
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-[#dfe8dc] pt-3 text-[#073f35]">
          <span className="text-[15px] font-black sm:text-[16px]">Subtotal</span>
          <strong className="text-[17px] font-black sm:text-[18px]">
            {formatCurrency(totalValue)}
          </strong>
        </div>
      </>
    );
  }

  return (
    <IngressoShell active="buy" user={user} variant="checkout">
      <div className="min-h-[calc(100vh-58px)] pb-32 text-[#073f35] lg:pb-8">
        <div className="mx-auto w-[min(960px,calc(100%-18px))] py-3 sm:w-[min(960px,calc(100%-28px))] sm:py-4 lg:py-5">
          <FlowStepper
            current={
              step === "passports"
                ? "passports"
                : step === "addons"
                  ? "addons"
                  : "payment"
            }
          />

          {error ? (
            <div className="mt-5 rounded-[16px] border border-[#efc3c3] bg-[#fff3f1] px-4 py-3 text-left text-sm font-semibold text-[#9f3f36]">
              {error}
            </div>
          ) : null}

          {step !== "review" ? (
            <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_250px] xl:items-start">
              <section>
                <div className="mb-3 inline-flex items-center gap-3 rounded-[12px] border border-[#dce8d8] bg-white px-3 py-2.5 shadow-[0_10px_20px_rgba(18,52,45,0.035)] lg:hidden">
                  <IconBubble name="calendar" className="h-9 w-9" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#087842]">
                      Data da visita
                    </p>
                    <strong className="block text-[14px] font-black text-[#073f35]">
                      {dateLabel}
                    </strong>
                  </div>
                </div>
                {step === "passports"
                  ? renderProducts(passports, "Escolha seus passaportes")
                  : renderProducts(addons, "Escolha seus adicionais")}
              </section>

              <aside className="hidden h-fit rounded-[12px] border border-[#dfe8dc] bg-white p-4 text-left shadow-[0_12px_28px_rgba(18,52,45,0.055)] xl:block">
                <h2 className="text-[19px] font-black text-[#073f35]">
                  Carrinho
                </h2>
                <p className="mt-3 flex items-center gap-2.5 border-b border-[#dfe8dc] pb-3 text-[13px] text-[#626469]">
                  <IconBubble name="bag" className="h-9 w-9" />
                  {totalQuantity}{" "}
                  {totalQuantity === 1 ? "item selecionado" : "itens selecionados"}
                </p>
                {renderCartSummary()}
                <PrimaryFlowButton
                  onClick={() => goTo(step === "passports" ? "addons" : "review")}
                  className="mt-4 min-h-[42px] text-[13px] sm:text-[14px]"
                >
                  {step === "passports" ? "Ir para adicionais" : "Ir para pagamento"}
                </PrimaryFlowButton>
                <p className="mt-3 flex items-center justify-center gap-2 text-[12px] text-[#626469]">
                  <FlowIcon name="lock" className="h-4 w-4 text-[#20aa1f]" />
                  Seus dados estão protegidos.
                </p>
              </aside>
            </div>
          ) : (
            <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px] xl:items-start">
              <section className="text-left">
                <p className="mb-2 text-[10px] font-black uppercase tracking-[0.26em] text-[#087842]">
                  {dateLabel}
                </p>
                <h1 className="text-[22px] font-black leading-tight text-[#073f35] sm:text-[28px] lg:text-[32px]">
                  Resumo da compra
                </h1>
                <p className="mt-1.5 text-[13px] text-[#626469] lg:text-[15px]">
                  Revise os dados antes de concluir.
                </p>

                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  <section className="rounded-[12px] border border-[#dfe8dc] bg-white p-4 shadow-[0_10px_24px_rgba(18,52,45,0.055)]">
                    <div className="flex items-start gap-3">
                      <IconBubble name="cart" className="h-10 w-10" />
                      <div className="flex-1">
                        <h2 className="text-[18px] font-black text-[#073f35]">
                          Seu carrinho
                        </h2>
                        {renderCartSummary(true)}
                        <div className="mt-4 flex items-center justify-between border-t border-[#dfe8dc] pt-4">
                          <span className="text-[16px] font-black text-[#073f35]">
                            Total
                          </span>
                          <strong className="text-[20px] font-black text-[#073f35]">
                            {formatCurrency(totalValue)}
                          </strong>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-[12px] border border-[#dfe8dc] bg-white p-4 shadow-[0_10px_24px_rgba(18,52,45,0.055)]">
                    <div className="flex items-start gap-3">
                      <IconBubble name="user" className="h-10 w-10" />
                      <div className="flex-1">
                        <h2 className="text-[18px] font-black text-[#073f35]">
                          Seus dados
                        </h2>
                        <dl className="mt-3 space-y-2.5 text-[13px]">
                          <div className="border-b border-[#dfe8dc] pb-3">
                            <dt className="font-black text-[#626469]">Nome</dt>
                            <dd className="mt-1 text-[#26292d]">{user.name}</dd>
                          </div>
                          {user.email ? (
                            <div className="border-b border-[#dfe8dc] pb-3">
                              <dt className="font-black text-[#626469]">E-mail</dt>
                              <dd className="mt-1 break-words text-[#26292d]">
                                {user.email}
                              </dd>
                            </div>
                          ) : null}
                          <div>
                            <dt className="font-black text-[#626469]">CPF</dt>
                            <dd className="mt-1 text-[#26292d]">{user.cpfMasked}</dd>
                          </div>
                        </dl>
                      </div>
                    </div>
                  </section>
                </div>

                <section className="mt-3 rounded-[12px] border border-[#dfe8dc] bg-white p-4 shadow-[0_10px_24px_rgba(18,52,45,0.055)]">
                  <div className="flex items-start gap-3">
                    <IconBubble name="shield" className="h-10 w-10" />
                    <div>
                      <h2 className="text-[18px] font-black text-[#073f35]">
                        Pagamento
                      </h2>
                      <p className="mt-2 flex items-start gap-2.5 text-[13px] leading-5 text-[#626469]">
                        <span className="mt-1 grid h-5 w-5 place-items-center rounded-full bg-[#20aa1f] text-[13px] font-black text-white">
                          ✓
                        </span>
                        Seus dados estão seguros e criptografados. Você será
                        redirecionado para a próxima etapa para concluir o
                        pagamento.
                      </p>
                    </div>
                  </div>
                </section>
              </section>

              <aside className="hidden h-fit rounded-[12px] border border-[#dfe8dc] bg-white p-4 text-left shadow-[0_12px_28px_rgba(18,52,45,0.055)] xl:block">
                <h2 className="text-[18px] font-black text-[#073f35]">
                  Resumo da compra
                </h2>
                {renderCartSummary(true)}
                <div className="mt-5 flex items-center justify-between border-t border-[#dfe8dc] pt-5">
                  <span className="text-[18px] font-black text-[#073f35]">
                    Total
                  </span>
                  <strong className="text-[22px] font-black text-[#073f35]">
                    {formatCurrency(totalValue)}
                  </strong>
                </div>
                <PrimaryFlowButton
                  onClick={() => void handleSubmit()}
                  disabled={pending}
                  className="mt-4 min-h-[42px] text-[13px] sm:text-[14px]"
                >
                  {pending ? "Preparando..." : "Finalizar e comprar"}
                </PrimaryFlowButton>
                <p className="mt-4 flex items-center justify-center gap-2 text-[12px] text-[#626469]">
                  <FlowIcon name="lock" className="h-4 w-4" />
                  Ambiente 100% seguro
                </p>
              </aside>
            </div>
          )}
        </div>

        <div className="fixed inset-x-0 bottom-0 z-40 rounded-t-[16px] border border-[#e2e8df] bg-white/96 px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2.5 text-left shadow-[0_-10px_28px_rgba(18,52,45,0.11)] backdrop-blur xl:hidden">
          {step === "review" ? (
            <>
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] items-center gap-3">
                <div className="min-w-0">
                  <p className="text-[12px] font-bold text-[#626469]">
                    Total da compra
                  </p>
                  <strong className="mt-1 block truncate text-[18px] font-black text-[#073f35] sm:text-[22px]">
                    {formatCurrency(totalValue)}
                  </strong>
                </div>
                <PrimaryFlowButton
                  onClick={() => void handleSubmit()}
                  disabled={pending}
                  className="min-h-[42px] px-3 text-[13px] sm:text-[14px]"
                >
                  <span className="sm:hidden">
                    {pending ? "Preparando..." : "Finalizar"}
                  </span>
                  <span className="hidden sm:inline">
                    {pending ? "Preparando..." : "Finalizar e comprar"}
                  </span>
                </PrimaryFlowButton>
              </div>
              <p className="mt-2.5 flex items-center justify-center gap-2 text-[12px] text-[#626469]">
                <FlowIcon name="lock" className="h-4 w-4" />
                Ambiente 100% seguro
              </p>
            </>
          ) : (
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] items-center gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <IconBubble name="bag" className="h-9 w-9" />
                <div className="min-w-0">
                  <p className="text-[12px] text-[#626469]">
                    {totalQuantity} {totalQuantity === 1 ? "item" : "itens"}
                  </p>
                  <p className="mt-0.5 text-[12px] text-[#626469]">
                    Subtotal{" "}
                      <strong className="ml-1 text-[15px] font-black text-[#073f35] sm:text-[18px]">
                      {formatCurrency(totalValue)}
                    </strong>
                  </p>
                </div>
              </div>
              <PrimaryFlowButton
                onClick={() => goTo(step === "passports" ? "addons" : "review")}
                className="min-h-[42px] px-3 text-[13px] sm:text-[14px]"
              >
                <span className="sm:hidden">Continuar</span>
                <span className="hidden sm:inline">
                  {step === "passports" ? "Continuar para adicionais" : "Continuar para pagamento"}
                </span>
              </PrimaryFlowButton>
            </div>
          )}
        </div>
      </div>
    </IngressoShell>
  );
}
