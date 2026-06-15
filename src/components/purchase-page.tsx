"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { IngressoShell } from "@/components/ingresso-shell";
import {
  FlowIcon,
  FlowStepper,
  IconBubble,
  PrimaryFlowButton,
} from "@/components/order-flow-ui";
import type { B2cProduct } from "@/lib/b2c-catalog-defaults";
import type { AuthUser } from "@/lib/auth-contracts";
import type {
  CreatePurchaseResponse,
  PurchaseAgendaDetail,
} from "@/lib/purchase-contracts";

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
  const addonQuantity = lines
    .filter((line) => line.type === "addon")
    .reduce((total, line) => total + line.quantity, 0);
  const totalValue = normalizeMoney(
    lines.reduce((total, line) => total + Number(line.totalValue), 0),
  );

  return { lines, passportQuantity, addonQuantity, totalValue };
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
      className={`relative overflow-hidden rounded-[18px] border bg-white p-4 text-left shadow-[0_18px_42px_rgba(18,52,45,0.08)] transition ${
        selected ? "border-[#18ac26]" : "border-[#dfe8dc]"
      }`}
    >
      {selected ? (
        <span className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full bg-[#20aa1f] text-[24px] font-black text-white">
          ✓
        </span>
      ) : null}
      <div className="grid gap-5 sm:grid-cols-[minmax(180px,0.85fr)_1fr] xl:block">
        <div className="relative h-[180px] overflow-hidden rounded-[8px] bg-[#eef3e8] sm:h-full sm:min-h-[190px] xl:h-[150px] xl:min-h-0">
          <Image
            src={product.imageSrc}
            alt={product.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 45vw, 280px"
          />
        </div>

        <div className="flex min-h-[220px] flex-col xl:min-h-[260px] xl:pt-4">
          <h3 className="text-[24px] font-black leading-tight text-[#073f35] xl:text-[25px]">
            {product.title}
          </h3>
          <p className="mt-2 text-[18px] font-medium leading-7 text-[#626469] xl:min-h-[56px]">
            {product.subtitle}
          </p>
          <strong className="mt-4 block text-[30px] font-black text-[#073f35]">
            {formatCurrency(product.fixedPrice)}
          </strong>

          <div className="mt-auto flex items-center gap-4 pt-5">
            <button
              type="button"
              aria-label={`Remover ${product.title}`}
              onClick={() => onStep(-1)}
              className="grid h-14 w-14 place-items-center rounded-[8px] border border-[#d7e3d2] bg-white text-[26px] font-black text-[#073f35] hover:border-[#20aa1f]"
            >
              -
            </button>
            <span className="grid h-14 min-w-16 place-items-center rounded-[8px] border border-[#d7e3d2] bg-white px-5 text-[24px] font-black text-[#073f35]">
              {quantity}
            </span>
            <button
              type="button"
              aria-label={`Adicionar ${product.title}`}
              onClick={() => onStep(1)}
              className="grid h-14 w-14 place-items-center rounded-[8px] bg-[#11883b] text-[30px] font-black text-white shadow-[0_14px_30px_rgba(17,136,59,0.18)] hover:bg-[#0c6e30]"
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
      left: direction === "next" ? 330 : -330,
      behavior: "smooth",
    });
  }

  function renderProducts(currentProducts: B2cProduct[], title: string) {
    return (
      <div>
        <div className="mb-7 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-[38px] font-black leading-tight text-[#073f35] sm:text-[48px]">
              {title}
            </h1>
            <p className="mt-3 text-[20px] leading-8 text-[#626469]">
              Selecione os itens que deseja incluir na sua visita.
            </p>
          </div>
          <Link
            href="/agenda"
            className="hidden min-h-14 items-center gap-3 rounded-full border border-[#d8dfd7] bg-white px-6 text-[16px] font-black text-[#073f35] shadow-[0_10px_24px_rgba(18,52,45,0.06)] hover:border-[#20aa1f] lg:inline-flex"
          >
            <FlowIcon name="calendar" className="h-5 w-5" />
            Alterar data
          </Link>
        </div>

        <div className="relative">
          <button
            type="button"
            aria-label="Ver item anterior"
            onClick={() => scrollProducts("prev")}
            className="absolute -left-16 top-1/2 z-10 hidden h-14 w-14 -translate-y-1/2 place-items-center rounded-full border border-[#d8dfd7] bg-white text-[32px] font-black leading-none text-[#073f35] shadow-[0_14px_30px_rgba(18,52,45,0.1)] xl:grid"
          >
            ‹
          </button>
          <div
            ref={carouselRef}
            className="grid gap-5 xl:flex xl:snap-x xl:snap-mandatory xl:overflow-x-auto xl:pb-6 xl:pr-8 xl:[scrollbar-width:none] xl:[&::-webkit-scrollbar]:hidden"
          >
            {currentProducts.map((product) => (
              <div
                key={product.id}
                className="xl:w-[286px] xl:min-w-[286px] xl:snap-start"
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
            className="absolute -right-5 top-1/2 z-10 hidden h-14 w-14 -translate-y-1/2 place-items-center rounded-full border border-[#d8dfd7] bg-white text-[32px] font-black leading-none text-[#073f35] shadow-[0_14px_30px_rgba(18,52,45,0.1)] xl:grid"
          >
            ›
          </button>
        </div>

        {currentProducts.length > 3 ? (
          <p className="mt-2 hidden items-center justify-center gap-3 text-[15px] text-[#626469] xl:flex">
            <span>☝</span>
            Arraste ou use as setas para ver mais opções.
          </p>
        ) : null}
      </div>
    );
  }

  function renderCartSummary(compact = false) {
    return (
      <>
        <div className={compact ? "space-y-4" : "mt-6 space-y-5"}>
          {cart?.lines.length ? (
            cart.lines.map((line) => (
              <div
                key={line.productId}
                className={`flex items-center justify-between gap-4 ${
                  compact ? "" : "border-b border-[#dfe8dc] pb-5"
                }`}
              >
                {!compact && line.imageSrc ? (
                  <div className="relative h-20 w-20 overflow-hidden rounded-[8px] bg-[#eef3e8]">
                    <Image src={line.imageSrc} alt={line.title} fill className="object-cover" sizes="80px" />
                  </div>
                ) : null}
                <div className="min-w-0 flex-1">
                  <strong className="block truncate text-[16px] font-black text-[#073f35]">
                    {compact ? `${line.quantity}x ${line.title}` : line.title}
                  </strong>
                  {!compact ? (
                    <span className="mt-1 block text-[15px] text-[#626469]">
                      x{line.quantity}
                    </span>
                  ) : null}
                </div>
                <strong className="whitespace-nowrap text-[17px] font-black text-[#073f35]">
                  {formatCurrency(line.totalValue)}
                </strong>
              </div>
            ))
          ) : (
            <p className="text-[16px] font-semibold text-[#626469]">
              Nenhum produto selecionado.
            </p>
          )}
        </div>
        <div className="mt-6 flex items-center justify-between border-t border-[#dfe8dc] pt-6 text-[#073f35]">
          <span className="text-[22px] font-black">Subtotal</span>
          <strong className="text-[24px] font-black">
            {formatCurrency(totalValue)}
          </strong>
        </div>
      </>
    );
  }

  return (
    <IngressoShell active="buy" user={user} variant="checkout">
      <div className="min-h-[calc(100vh-78px)] pb-36 text-[#073f35] lg:pb-12">
        <div className="mx-auto w-[min(1450px,calc(100%-32px))] py-8 lg:py-9">
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
            <div className="mt-8 rounded-[18px] border border-[#efc3c3] bg-[#fff3f1] px-4 py-3 text-left text-sm font-semibold text-[#9f3f36]">
              {error}
            </div>
          ) : null}

          {step !== "review" ? (
            <div className="mt-9 grid gap-8 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
              <section>
                <div className="mb-7 inline-flex items-center gap-4 rounded-[18px] border border-[#dce8d8] bg-white px-5 py-4 shadow-[0_14px_28px_rgba(18,52,45,0.05)] lg:hidden">
                  <IconBubble name="calendar" className="h-12 w-12" />
                  <div>
                    <p className="text-[12px] font-black uppercase tracking-[0.2em] text-[#087842]">
                      Data da visita
                    </p>
                    <strong className="block text-[20px] font-black text-[#073f35]">
                      {dateLabel}
                    </strong>
                  </div>
                </div>
                {step === "passports"
                  ? renderProducts(passports, "Escolha seus passaportes")
                  : renderProducts(addons, "Escolha seus adicionais")}
              </section>

              <aside className="hidden h-fit rounded-[18px] border border-[#dfe8dc] bg-white p-7 text-left shadow-[0_22px_55px_rgba(18,52,45,0.08)] xl:block">
                <h2 className="text-[31px] font-black text-[#073f35]">
                  Carrinho
                </h2>
                <p className="mt-4 flex items-center gap-3 border-b border-[#dfe8dc] pb-6 text-[17px] text-[#626469]">
                  <IconBubble name="bag" className="h-9 w-9" />
                  {totalQuantity} {totalQuantity === 1 ? "item selecionado" : "itens selecionados"}
                </p>
                {renderCartSummary()}
                <PrimaryFlowButton
                  onClick={() => goTo(step === "passports" ? "addons" : "review")}
                  className="mt-7"
                >
                  {step === "passports"
                    ? "Continuar para adicionais"
                    : "Continuar para pagamento"}
                </PrimaryFlowButton>
                <p className="mt-6 flex items-center justify-center gap-2 text-[14px] text-[#626469]">
                  <FlowIcon name="lock" className="h-4 w-4 text-[#20aa1f]" />
                  Seus dados estão protegidos.
                </p>
              </aside>
            </div>
          ) : (
            <div className="mt-9 grid gap-8 xl:grid-cols-[minmax(0,1fr)_390px] xl:items-start">
              <section className="text-left">
                <div className="mb-8 flex flex-wrap items-center gap-4">
                  <IconBubble name="calendar" className="h-14 w-14" />
                  <div>
                    <p className="text-[17px] font-bold text-[#626469]">
                      Data selecionada
                    </p>
                    <strong className="text-[23px] font-black text-[#073f35]">
                      {dateLabel}
                    </strong>
                  </div>
                  <Link
                    href="/agenda"
                    className="text-[15px] font-black text-[#2d6d43] underline underline-offset-4"
                  >
                    Alterar data
                  </Link>
                </div>
                <h1 className="text-[42px] font-black leading-tight text-[#073f35] sm:text-[52px]">
                  Resumo da compra
                </h1>
                <p className="mt-2 text-[21px] text-[#626469]">
                  Revise os dados antes de concluir.
                </p>

                <div className="mt-7 grid gap-6 lg:grid-cols-2">
                  <section className="rounded-[18px] border border-[#dfe8dc] bg-white p-7 shadow-[0_18px_42px_rgba(18,52,45,0.08)]">
                    <div className="flex items-start gap-5">
                      <IconBubble name="cart" />
                      <div className="flex-1">
                        <h2 className="text-[26px] font-black text-[#073f35]">
                          Seu carrinho
                        </h2>
                        {renderCartSummary(true)}
                        <div className="mt-6 flex items-center justify-between border-t border-[#dfe8dc] pt-6">
                          <span className="text-[24px] font-black text-[#073f35]">
                            Total
                          </span>
                          <strong className="text-[27px] font-black text-[#073f35]">
                            {formatCurrency(totalValue)}
                          </strong>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-[18px] border border-[#dfe8dc] bg-white p-7 shadow-[0_18px_42px_rgba(18,52,45,0.08)]">
                    <div className="flex items-start gap-5">
                      <IconBubble name="user" />
                      <div className="flex-1">
                        <h2 className="text-[26px] font-black text-[#073f35]">
                          Seus dados
                        </h2>
                        <dl className="mt-5 space-y-4 text-[17px]">
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
                            <dd className="mt-1 text-[#26292d]">
                              {user.cpfMasked}
                            </dd>
                          </div>
                        </dl>
                      </div>
                    </div>
                  </section>
                </div>

                <section className="mt-6 rounded-[18px] border border-[#dfe8dc] bg-white p-7 shadow-[0_18px_42px_rgba(18,52,45,0.08)]">
                  <div className="flex items-start gap-5">
                    <IconBubble name="shield" />
                    <div>
                      <h2 className="text-[26px] font-black text-[#073f35]">
                        Pagamento
                      </h2>
                      <p className="mt-4 flex items-start gap-3 text-[18px] leading-8 text-[#626469]">
                        <span className="mt-1 grid h-6 w-6 place-items-center rounded-full bg-[#20aa1f] text-[15px] font-black text-white">
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

              <aside className="hidden h-fit rounded-[18px] border border-[#dfe8dc] bg-white p-8 text-left shadow-[0_22px_55px_rgba(18,52,45,0.08)] xl:block">
                <h2 className="text-[26px] font-black text-[#073f35]">
                  Resumo da compra
                </h2>
                {renderCartSummary(true)}
                <div className="mt-8 flex items-center justify-between border-t border-[#dfe8dc] pt-7">
                  <span className="text-[25px] font-black text-[#073f35]">
                    Total
                  </span>
                  <strong className="text-[30px] font-black text-[#073f35]">
                    {formatCurrency(totalValue)}
                  </strong>
                </div>
                <PrimaryFlowButton
                  onClick={() => void handleSubmit()}
                  disabled={pending}
                  className="mt-7"
                >
                  {pending ? "Preparando..." : "Finalizar e comprar"}
                </PrimaryFlowButton>
                <p className="mt-6 flex items-center justify-center gap-2 text-[15px] text-[#626469]">
                  <FlowIcon name="lock" className="h-4 w-4" />
                  Ambiente 100% seguro
                </p>
              </aside>
            </div>
          )}
        </div>

        <div className="fixed inset-x-0 bottom-0 z-40 rounded-t-[28px] border border-[#e2e8df] bg-white/96 px-6 pb-[calc(env(safe-area-inset-bottom)+18px)] pt-5 text-left shadow-[0_-18px_46px_rgba(18,52,45,0.13)] backdrop-blur xl:hidden">
          {step === "review" ? (
            <div className="grid grid-cols-[1fr_1.35fr] items-center gap-5">
              <div>
                <p className="text-[17px] font-bold text-[#626469]">
                  Total da compra
                </p>
                <strong className="block text-[35px] font-black text-[#073f35]">
                  {formatCurrency(totalValue)}
                </strong>
              </div>
              <PrimaryFlowButton onClick={() => void handleSubmit()} disabled={pending}>
                {pending ? "Preparando..." : "Finalizar e comprar"}
              </PrimaryFlowButton>
            </div>
          ) : (
            <div className="grid grid-cols-[1fr_1.45fr] items-center gap-5">
              <div className="flex items-center gap-4">
                <IconBubble name="bag" className="h-14 w-14" />
                <div>
                  <p className="text-[17px] text-[#626469]">
                    {totalQuantity} {totalQuantity === 1 ? "item selecionado" : "itens selecionados"}
                  </p>
                  <p className="mt-2 text-[18px] text-[#626469]">
                    Subtotal{" "}
                    <strong className="ml-2 text-[27px] font-black text-[#073f35]">
                      {formatCurrency(totalValue)}
                    </strong>
                  </p>
                </div>
              </div>
              <PrimaryFlowButton onClick={() => goTo(step === "passports" ? "addons" : "review")}>
                {step === "passports"
                  ? "Continuar para adicionais"
                  : "Continuar para pagamento"}
              </PrimaryFlowButton>
            </div>
          )}
        </div>
      </div>
    </IngressoShell>
  );
}
