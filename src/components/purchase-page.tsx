"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { IngressoShell } from "@/components/ingresso-shell";
import {
  buildB2cCartSummary,
  getB2cProductUnitPrice,
  listB2cAddons,
  listB2cPassports,
  type B2cProduct,
} from "@/lib/b2c-catalog";
import type { AuthUser } from "@/lib/auth-contracts";
import type {
  CreatePurchaseResponse,
  PurchaseAgendaDetail,
} from "@/lib/purchase-contracts";

type PurchasePageProps = {
  agenda: PurchaseAgendaDetail;
  user: AuthUser;
};

type PurchaseStep = "passports" | "addons" | "review";
type Quantities = Record<string, number>;

const stepOrder: PurchaseStep[] = ["passports", "addons", "review"];

const stepLabels: Record<PurchaseStep, string> = {
  passports: "1. Passaportes",
  addons: "2. Adicionais",
  review: "3. Pagamento",
};

function formatCurrency(value: number | string) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value));
}
function formatLongDate(date: string) {
  const parsed = new Date(`${date}T12:00:00`);

  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parsed);
}

async function readResponseBody<T>(response: Response) {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function StepNav({
  currentStep,
  setStep,
}: {
  currentStep: PurchaseStep;
  setStep: (step: PurchaseStep) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {stepOrder.map((step) => {
        const isActive = step === currentStep;

        return (
          <button
            key={step}
            type="button"
            onClick={() => setStep(step)}
            className={`min-h-11 rounded-full border px-5 text-[14px] font-bold uppercase tracking-[0.02em] transition md:text-[16px] ${
              isActive
                ? "border-[#27a51d] bg-[#27a51d] text-white shadow-[0_10px_24px_rgba(39,165,29,0.24)]"
                : "border-[#d8e4d3] bg-white text-[#305037] hover:border-[#9dca8b] hover:bg-[#f2f8ee]"
            }`}
          >
            {stepLabels[step]}
          </button>
        );
      })}
    </div>
  );
}
function ProductCard({
  product,
  price,
  quantity,
  onStep,
}: {
  product: B2cProduct;
  price: string;
  quantity: number;
  onStep: (delta: number) => void;
}) {
  return (
    <article className="overflow-hidden rounded-[8px] border border-[#dce8d8] bg-white text-left shadow-[0_14px_32px_rgba(24,67,34,0.08)]">
      <div className="relative h-[185px] bg-[#eef3e8]">
        <Image
          src={product.imageSrc}
          alt={product.title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
      </div>

      <div className="flex min-h-[220px] flex-col px-4 py-4">
        <h3 className="text-[22px] font-black leading-7 text-[#17351f]">
          {product.title}
        </h3>
        <p className="mt-1 min-h-[42px] text-[15px] font-semibold leading-5 text-[#4f6953]">
          {product.subtitle}
        </p>
        <strong className="mt-auto text-[27px] font-black text-[#17351f]">
          {formatCurrency(price)}
        </strong>

        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            aria-label={`Remover ${product.title}`}
            onClick={() => onStep(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-[8px] border border-[#d7e3d2] bg-[#f7fbf5] text-[22px] font-black text-[#17351f] hover:border-[#9dca8b]"
          >
            -
          </button>
          <span className="flex h-10 min-w-12 items-center justify-center rounded-[8px] border border-[#d7e3d2] px-4 text-[18px] font-black text-[#17351f]">
            {quantity}
          </span>
          <button
            type="button"
            aria-label={`Adicionar ${product.title}`}
            onClick={() => onStep(1)}
            className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-[#2b8c46] text-[22px] font-black text-white hover:bg-[#1f6b36]"
          >
            +
          </button>
        </div>
      </div>
    </article>
  );
}

export function PurchasePage({ agenda, user }: PurchasePageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const passports = listB2cPassports();
  const addons = listB2cAddons();
  const [step, setStep] = useState<PurchaseStep>("passports");
  const [quantities, setQuantities] = useState<Quantities>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      return buildB2cCartSummary(lineItems);
    } catch {
      return null;
    }
  }, [lineItems]);
  const passportQuantity = cart?.passportQuantity ?? 0;
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

  function renderProducts(products: B2cProduct[]) {
    return (
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            price={getB2cProductUnitPrice(product.id) ?? "0.00"}
            quantity={quantities[product.id] ?? 0}
            onStep={(delta) => setProductQuantity(product.id, delta)}
          />
        ))}
      </div>
    );
  }

  return (
    <IngressoShell active="buy" user={user}>
      <div className="estancia-shell min-h-screen">
        <div className="mx-auto w-full max-w-[1240px] px-4 pb-14 pt-8 md:px-6">
          <StepNav currentStep={step} setStep={goTo} />

          <div className="mt-7 flex flex-wrap items-center justify-between gap-4 text-left">
            <div>
              <p className="text-[14px] font-bold uppercase tracking-[0.14em] text-[#27731d]">
                {formatLongDate(agenda.date)}
              </p>
              <h1 className="mt-2 text-[34px] font-black uppercase leading-tight text-[#080808] md:text-[43px]">
                {step === "passports"
                  ? "Escolha seus passaportes"
                  : step === "addons"
                    ? "Escolha seus adicionais"
                    : "Resumo da compra"}
              </h1>
            </div>
            <Link
              href="/agenda"
              className="rounded-full border border-[#d2d2d2] bg-white px-5 py-3 text-[14px] font-bold uppercase text-[#111] hover:border-[#27a51d]"
            >
              Alterar data
            </Link>
          </div>

          {error ? (
            <div className="mt-5 rounded-[8px] border border-[#efc3c3] bg-[#fff3f1] px-4 py-3 text-left text-sm font-semibold text-[#9f3f36]">
              {error}
            </div>
          ) : null}

          <div className="mt-7 grid gap-5 lg:grid-cols-[minmax(0,1fr)_290px]">
            <section>
              {step === "passports" ? renderProducts(passports) : null}
              {step === "addons" ? renderProducts(addons) : null}
              {step === "review" ? (
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  <div className="rounded-[8px] border border-[#dce8d8] bg-white p-6 text-left shadow-[0_14px_32px_rgba(24,67,34,0.08)]">
                    <h2 className="text-[27px] font-black text-[#17351f]">
                      Carrinho
                    </h2>
                    <div className="mt-4 space-y-4">
                      {cart?.lines.map((line) => (
                        <div
                          key={line.productId}
                          className="flex items-start justify-between gap-4 border-b border-[#e1ebdd] pb-4"
                        >
                          <div>
                            <strong className="block text-[20px] leading-6 text-[#17351f]">
                              {line.quantity}x {line.title}
                            </strong>
                            <span className="text-[14px] font-semibold text-[#4f6953]">
                              {formatCurrency(line.unitPrice)} por unidade
                            </span>
                          </div>
                          <strong className="text-[20px] font-black text-[#17351f]">
                            {formatCurrency(line.totalValue)}
                          </strong>
                        </div>
                      ))}
                    </div>
                    <div className="mt-5 flex items-center justify-between text-[25px] font-black text-[#17351f]">
                      <span>Total</span>
                      <span>{formatCurrency(totalValue)}</span>
                    </div>
                  </div>

                  <div className="rounded-[8px] border border-[#dce8d8] bg-white p-6 text-left shadow-[0_14px_32px_rgba(24,67,34,0.08)]">
                    <h2 className="text-[27px] font-black text-[#17351f]">
                      Seus dados
                    </h2>
                    <div className="mt-4 space-y-3 text-[16px] font-semibold text-[#17351f]">
                      <p className="rounded-[18px] border border-[#d7e3d2] px-4 py-3">
                        {user.name}
                      </p>
                      {user.email ? (
                        <p className="rounded-[18px] border border-[#d7e3d2] px-4 py-3">
                          {user.email}
                        </p>
                      ) : null}
                      <p className="rounded-[18px] border border-[#d7e3d2] px-4 py-3">
                        CPF {user.cpfMasked}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </section>

            <aside className="h-fit rounded-[8px] border border-[#dce8d8] bg-white p-5 text-left shadow-[0_14px_32px_rgba(24,67,34,0.08)]">
              <h2 className="text-[25px] font-black text-[#17351f]">
                Carrinho
              </h2>
              <div className="mt-3 space-y-3">
                {cart?.lines.length ? (
                  cart.lines.map((line) => (
                    <div
                      key={line.productId}
                      className="flex items-start justify-between gap-3 border-b border-[#e1ebdd] pb-3 text-[15px] text-[#17351f]"
                    >
                      <span>
                        {line.title}
                        <strong className="ml-2">x{line.quantity}</strong>
                      </span>
                      <strong>{formatCurrency(line.totalValue)}</strong>
                    </div>
                  ))
                ) : (
                  <p className="text-[14px] font-semibold text-[#5c745f]">
                    Nenhum produto selecionado.
                  </p>
                )}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-[#d7e3d2] pt-4 text-[18px] font-black text-[#17351f]">
                <span>Subtotal</span>
                <span>{formatCurrency(totalValue)}</span>
              </div>

              {step === "passports" ? (
                <button
                  type="button"
                  onClick={() => goTo("addons")}
                  className="mt-5 min-h-12 w-full rounded-full bg-[#27a51d] px-5 text-[15px] font-black uppercase text-white hover:bg-[#1f8818]"
                >
                  {"Avan\u00e7ar para adicionais"}
                </button>
              ) : null}
              {step === "addons" ? (
                <button
                  type="button"
                  onClick={() => goTo("review")}
                  className="mt-5 min-h-12 w-full rounded-full bg-[#27a51d] px-5 text-[15px] font-black uppercase text-white hover:bg-[#1f8818]"
                >
                  {"Avan\u00e7ar para pagamento"}
                </button>
              ) : null}
              {step === "review" ? (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={pending}
                  className="mt-5 min-h-12 w-full rounded-full bg-[#27a51d] px-5 text-[15px] font-black uppercase text-white hover:bg-[#1f8818] disabled:cursor-not-allowed disabled:bg-[#8ac785]"
                >
                  {pending ? "Preparando..." : "Finalizar e comprar"}
                </button>
              ) : null}
            </aside>
          </div>
        </div>
      </div>
    </IngressoShell>
  );
}
