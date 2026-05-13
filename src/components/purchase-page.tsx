"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { IngressoShell } from "@/components/ingresso-shell";
import type { AuthUser } from "@/lib/auth-contracts";
import type {
  CreatePurchaseResponse,
  PurchaseAgendaDetail,
} from "@/lib/purchase-contracts";

type PurchasePageProps = {
  agenda: PurchaseAgendaDetail;
  user: AuthUser;
};

type Quantities = {
  discountedNormal: number;
  discountedChild: number;
  normal: number;
  child: number;
  exempt: number;
};

type QuantityKey = keyof Quantities;

function formatPrice(value: string) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatLegacyLongDate(date: string) {
  const parsed = new Date(`${date}T12:00:00`);

  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parsed);
}

function parseQuantity(value: string) {
  const numericValue = Number(value);

  if (!Number.isInteger(numericValue) || numericValue < 0) {
    return 0;
  }

  return numericValue;
}

function pluralize(
  count: number,
  singular: string,
  plural = `${singular}s`,
) {
  return `${count} ${count === 1 ? singular : plural}`;
}

async function readResponseBody<T>(response: Response) {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export function PurchasePage({ agenda, user }: PurchasePageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [codindica, setCodindica] = useState("");
  const [showStandardSection, setShowStandardSection] = useState(
    agenda.pricing.mode === "dia" || agenda.pricing.discountedRemaining <= 0,
  );
  const [quantities, setQuantities] = useState<Quantities>({
    discountedNormal: 0,
    discountedChild: 0,
    normal: 0,
    child: 0,
    exempt: 0,
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const discountedNormal = Number(agenda.pricing.discountedNormal);
  const discountedChild = Number(agenda.pricing.discountedChild);
  const standardNormal = Number(agenda.pricing.standardNormal);
  const standardChild = Number(agenda.pricing.standardChild);
  const hasDiscountPricing = agenda.pricing.mode !== "dia";
  const hasCodindica = codindica.trim().length > 0;
  const discountedTotal =
    quantities.discountedNormal + quantities.discountedChild;
  const totalPaidTickets =
    discountedTotal + quantities.normal + quantities.child;
  const totalValue =
    quantities.discountedNormal * discountedNormal +
    quantities.discountedChild * discountedChild +
    quantities.normal * standardNormal +
    quantities.child * standardChild;

  const cartRows = useMemo(
    () => [
      {
        key: "discountedNormal",
        visible: quantities.discountedNormal > 0,
        description: `${pluralize(quantities.discountedNormal, "ingresso")} a partir de 10 anos com desconto`,
        value: quantities.discountedNormal * discountedNormal,
      },
      {
        key: "discountedChild",
        visible: quantities.discountedChild > 0,
        description: `${pluralize(quantities.discountedChild, "ingresso")} de 4 a 9 anos com desconto`,
        value: quantities.discountedChild * discountedChild,
      },
      {
        key: "normal",
        visible: quantities.normal > 0,
        description: `${pluralize(quantities.normal, "ingresso")} a partir de 10 anos`,
        value: quantities.normal * standardNormal,
      },
      {
        key: "child",
        visible: quantities.child > 0,
        description: `${pluralize(quantities.child, "ingresso")} de 4 a 9 anos`,
        value: quantities.child * standardChild,
      },
      {
        key: "exempt",
        visible: quantities.exempt > 0,
        description: `${pluralize(quantities.exempt, "ingresso")} de 0 a 3 anos (isento)`,
        value: 0,
      },
    ].filter((item) => item.visible),
    [
      discountedChild,
      discountedNormal,
      quantities.child,
      quantities.discountedChild,
      quantities.discountedNormal,
      quantities.exempt,
      quantities.normal,
      standardChild,
      standardNormal,
    ],
  );

  function setQuantity(key: QuantityKey, nextValue: number) {
    setQuantities((current) => ({
      ...current,
      [key]: Math.max(nextValue, 0),
    }));
  }

  function stepQuantity(key: QuantityKey, delta: number) {
    setQuantities((current) => ({
      ...current,
      [key]: Math.max(current[key] + delta, 0),
    }));
  }

  function updateQuantity(key: QuantityKey, value: string) {
    setQuantity(key, parseQuantity(value));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (totalPaidTickets <= 0) {
      setError("Selecione pelo menos um ingresso pago para continuar.");
      return;
    }

    if (discountedTotal > agenda.pricing.discountedRemaining) {
      setError("A quantidade com desconto excede o limite disponivel.");
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
          codindica,
          quantities,
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
            : "Nao foi possivel iniciar a compra agora.",
        );
        return;
      }

      router.replace(payload.data.checkoutRedirect);
      router.refresh();
    } catch (requestError) {
      console.error("purchase-submit-failed", requestError);
      setError("Nao foi possivel iniciar a compra agora.");
    } finally {
      setPending(false);
    }
  }

  function renderCounter(
    key: QuantityKey,
    price: string,
    subtitle: string,
    originalPrice?: string,
  ) {
    return (
      <div className="grid items-center gap-3 border-b border-[#d7e3ec] py-4 last:border-b-0 md:grid-cols-[1fr_110px_170px]">
        <div>
          <strong className="block text-[21px] leading-7 text-[#1d5b80]">
            {price}
          </strong>
          <span className="text-[14px] leading-6 text-[#587184]">{subtitle}</span>
        </div>
        {originalPrice ? (
          <div className="text-center text-[14px] text-[#6e8798]">
            <strong className="block text-[18px] text-[#7d8fa0] line-through">
              {originalPrice}
            </strong>
            valor do dia
          </div>
        ) : (
          <div className="hidden md:block" />
        )}
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => stepQuantity(key, -1)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#b9cfe0] bg-white text-[20px] text-[#1d5b80] transition hover:border-[#3498db]"
          >
            -
          </button>
          <input
            type="text"
            inputMode="numeric"
            value={quantities[key]}
            onChange={(event) => updateQuantity(key, event.target.value)}
            className="h-10 w-16 rounded-full border border-[#b9cfe0] bg-white text-center text-[18px] text-[#1d5b80] outline-none focus:border-[#3498db]"
          />
          <button
            type="button"
            onClick={() => stepQuantity(key, 1)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#b9cfe0] bg-white text-[20px] text-[#1d5b80] transition hover:border-[#3498db]"
          >
            +
          </button>
        </div>
      </div>
    );
  }

  return (
    <IngressoShell active="buy" user={user}>
      <div className="mx-auto w-full max-w-[1180px] px-4 pb-12 pt-8 md:px-6">
        <h1 className="legacy-rounded text-center text-[25px] text-[#3393d6] sm:text-[34px]">
          Escolha a quantidade de ingressos
        </h1>

        {error ? (
          <div className="mx-auto mt-5 max-w-[1100px] rounded-[12px] border border-[#efc3c3] bg-[#fff3f1] px-4 py-3 text-sm text-[#9f3f36]">
            {error}
          </div>
        ) : null}

        <form className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]" onSubmit={handleSubmit}>
          <div className="space-y-5">
            {hasDiscountPricing ? (
              <div className="rounded-[26px] border border-[#d0e0eb] bg-white shadow-[0_16px_40px_rgba(17,66,97,0.09)]">
                <div className="rounded-t-[26px] bg-[#edf6fd] px-6 py-5 text-[#1c5a80]">
                  <p className="text-[16px] leading-7">
                    Ola, identificamos que voce e{" "}
                    <strong>{agenda.pricing.label}</strong>.
                  </p>
                  <p className="mt-1 text-[15px] leading-7 text-[#5d778b]">
                    Voce possui direito a{" "}
                    <strong>{agenda.pricing.discountedRemaining}</strong>{" "}
                    ingresso
                    {agenda.pricing.discountedRemaining === 1 ? "" : "s"} com
                    desconto nesta data.
                  </p>
                </div>

                <div className="px-6 pb-6 pt-2">
                  <div className="mb-4 hidden items-center text-[12px] uppercase tracking-[0.12em] text-[#6f8598] md:grid md:grid-cols-[1fr_110px_170px]">
                    <strong>Valores por pessoa ({agenda.pricing.label})</strong>
                    <strong className="text-center">Valor do dia</strong>
                    <strong className="text-right">Quantidade</strong>
                  </div>

                  {renderCounter(
                    "discountedNormal",
                    `R$ ${formatPrice(agenda.pricing.discountedNormal)}`,
                    "a partir de 10 anos",
                    `R$ ${formatPrice(agenda.pricing.standardNormal)}`,
                  )}
                  {renderCounter(
                    "discountedChild",
                    `R$ ${formatPrice(agenda.pricing.discountedChild)}`,
                    "de 4 a 9 anos",
                    `R$ ${formatPrice(agenda.pricing.standardChild)}`,
                  )}
                  {renderCounter("exempt", "Isento", "de 0 a 3 anos")}
                </div>
              </div>
            ) : null}

            {hasDiscountPricing ? (
              <button
                type="button"
                onClick={() => setShowStandardSection(true)}
                className="inline-flex rounded-full border border-[#bfd4e5] bg-white px-5 py-3 text-[15px] text-[#1c5a80] shadow-[0_10px_24px_rgba(17,66,97,0.08)] hover:border-[#3498db]"
              >
                Comprar ingresso com valor normal
              </button>
            ) : null}

            {showStandardSection ? (
              <div className="rounded-[26px] border border-[#d0e0eb] bg-white shadow-[0_16px_40px_rgba(17,66,97,0.09)]">
                <div className="px-6 py-5">
                  <div className="mb-4 hidden items-center text-[12px] uppercase tracking-[0.12em] text-[#6f8598] md:grid md:grid-cols-[1fr_110px_170px]">
                    <strong>Valores por pessoa (R$)</strong>
                    <strong className="text-center">
                      {hasDiscountPricing ? " " : ""}
                    </strong>
                    <strong className="text-right">Quantidade</strong>
                  </div>

                  {renderCounter(
                    "normal",
                    `R$ ${formatPrice(agenda.pricing.standardNormal)}`,
                    "a partir de 10 anos",
                  )}
                  {renderCounter(
                    "child",
                    `R$ ${formatPrice(agenda.pricing.standardChild)}`,
                    "de 4 a 9 anos",
                  )}
                  {!hasDiscountPricing ? (
                    renderCounter("exempt", "Isento", "de 0 a 3 anos")
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          <aside className="h-fit rounded-[26px] border border-[#d0e0eb] bg-white shadow-[0_16px_40px_rgba(17,66,97,0.09)]">
            <div className="rounded-t-[26px] bg-[#2f79ad] px-5 py-5 text-white">
              <div className="flex items-center justify-between gap-3">
                <strong className="legacy-rounded text-[18px]">
                  {formatLegacyLongDate(agenda.date)}
                </strong>
                <Link href="/agenda" className="text-[13px] underline">
                  alterar dia
                </Link>
              </div>
            </div>

            <div className="px-5 py-5">
              <div className="space-y-3 text-[14px] text-[#4f6779]">
                {cartRows.length > 0 ? (
                  cartRows.map((row) => (
                    <div
                      key={row.key}
                      className="flex items-start justify-between gap-4 border-b border-[#edf3f7] pb-3"
                    >
                      <span>{row.description}</span>
                      <strong className="text-[#1c5a80]">
                        {formatCurrency(row.value)}
                      </strong>
                    </div>
                  ))
                ) : (
                  <div className="text-[#70879a]">Nenhum ingresso selecionado.</div>
                )}
              </div>

              <div className="mt-5 rounded-[20px] border border-[#d8e6f0] bg-[#f8fbfe] p-4">
                <p className="legacy-rounded text-[15px] text-[#1c5a80]">
                  Caso voce possua um Codigo de Indicacao
                </p>
                <p className="mt-2 text-[13px] leading-6 text-[#60768a]">
                  {hasDiscountPricing
                    ? "Esta conta ja possui tarifa especial ativa nesta data, entao o codigo nao pode ser aplicado."
                    : "O valor final sera recalculado quando a compra for criada."}
                </p>
                <input
                  type="text"
                  inputMode="text"
                  maxLength={6}
                  value={codindica}
                  onChange={(event) =>
                    setCodindica(event.target.value.toUpperCase())
                  }
                  disabled={hasDiscountPricing || pending}
                  placeholder="Digite aqui"
                  className="mt-3 w-full rounded-full border border-[#c9d7e3] bg-white px-4 py-3 text-[15px] text-[#214d6b] outline-none placeholder:text-[#90a4b6] focus:border-[#3498db] disabled:cursor-not-allowed disabled:bg-[#eef3f7]"
                />
              </div>

              <div className="mt-5 rounded-[20px] bg-[#edf6fd] p-4 text-[#33556d]">
                <div className="flex items-center justify-between gap-4 text-sm leading-6">
                  <span>Total de ingressos pagos</span>
                  <strong className="legacy-rounded text-[18px] text-[#1c5a80]">
                    {totalPaidTickets}
                  </strong>
                </div>
                <div className="mt-2 flex items-center justify-between gap-4 text-sm leading-6">
                  <span>{hasCodindica ? "Total estimado" : "Total a pagar"}</span>
                  <strong className="legacy-rounded text-[18px] text-[#1c5a80]">
                    {formatCurrency(totalValue)}
                  </strong>
                </div>
              </div>

              <button
                type="submit"
                disabled={pending}
                className="legacy-rounded mt-5 inline-flex min-h-[48px] w-full items-center justify-center rounded-full bg-[#3394d6] px-5 py-3 text-[16px] text-white shadow-[2px_2px_4px_rgba(0,0,0,0.2)] transition hover:bg-[#246b99] disabled:cursor-not-allowed disabled:bg-[#8abfe7]"
              >
                {pending ? "Preparando..." : "Comprar Ingressos"}
              </button>
            </div>
          </aside>
        </form>

        <div className="mt-8 rounded-[26px] border border-[#d0e0eb] bg-white shadow-[0_16px_40px_rgba(17,66,97,0.09)]">
          <div className="px-6 py-6">
            <strong className="block text-[18px] text-[#1c5a80]">
              Informacoes:
            </strong>
            <div className="mt-3 space-y-2 text-[15px] leading-8 text-[#50697c]">
              {agenda.information.length > 0 ? (
                agenda.information.map((item) => (
                  <p key={item}>› {item}</p>
                ))
              ) : (
                <p>› Sem informacoes</p>
              )}
            </div>

            <div className="mt-8 grid gap-6 border-t border-[#e8f0f5] pt-6 md:grid-cols-2">
              <div>
                <strong className="block text-[18px] text-[#1c5a80]">
                  Pague com:
                </strong>
                <p className="mt-2 text-[15px] leading-7 text-[#50697c]">
                  Pagamento processado pela Cielo
                </p>
                <Link
                  href="/agenda"
                  className="legacy-rounded mt-3 inline-flex rounded-full bg-[#3394d6] px-5 py-3 text-[15px] text-white shadow-[2px_2px_4px_rgba(0,0,0,0.2)] transition hover:bg-[#246b99]"
                >
                  Comprar Ingressos
                </Link>
              </div>

              <div>
                <strong className="block text-[18px] text-[#1c5a80]">
                  Agende sua visita
                </strong>
                <p className="mt-2 text-[15px] leading-7 text-[#50697c]">
                  Caso prefira, voce pode agendar o dia da sua visita, escolher
                  os ingressos e pagar na bilheteria do parque.
                </p>
                <Link
                  href={`/agendar/${agenda.legacyEncodedId}`}
                  className="legacy-rounded mt-3 inline-flex rounded-full bg-[#3394d6] px-5 py-3 text-[15px] text-white shadow-[2px_2px_4px_rgba(0,0,0,0.2)] transition hover:bg-[#246b99]"
                >
                  Agendar visita
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </IngressoShell>
  );
}
