"use client";

import Script from "next/script";
import { useEffect, useMemo, useRef, useState } from "react";
import { EstanciaLogo } from "@/components/estancia-logo";
import { IngressoShell } from "@/components/ingresso-shell";
import type { AuthUser } from "@/lib/auth-contracts";
import type { CheckoutMode } from "@/lib/checkout-mode";
import type { UserVoucherPurchase } from "@/lib/voucher-contracts";

type CustomerCheckoutPageProps = {
  mode: CheckoutMode;
  purchase: UserVoucherPurchase;
  user: AuthUser;
  customer: {
    name: string;
    email: string | null;
    cpf: string;
    phone: string | null;
  };
  returnUrl: string;
  threeDsEnabled: boolean;
};

type MockPaymentType = "CreditCard" | "DebitCard" | "Pix";

const mockPaymentOptions: Array<{
  value: MockPaymentType;
  label: string;
}> = [
  {
    value: "CreditCard",
    label: "Cartão de Crédito",
  },
  {
    value: "DebitCard",
    label: "Cartão de Débito",
  },
  {
    value: "Pix",
    label: "Pix",
  },
];

function formatCurrency(value: string | null) {
  const numericValue = Number(value ?? 0);

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(numericValue);
}

function purchaseStatusCopy(status: UserVoucherPurchase["status"]) {
  if (status === "conc") {
    return "Compra confirmada";
  }

  if (status === "canc") {
    return "Compra cancelada";
  }

  return "Aguardando pagamento";
}

function paymentMethodLabel(type: MockPaymentType) {
  return (
    mockPaymentOptions.find((option) => option.value === type)?.label ?? "Pix"
  );
}

function PaymentIcon({ type }: { type: MockPaymentType }) {
  if (type === "Pix") {
    return (
      <span className="relative h-11 w-11 rotate-45 rounded-[10px] bg-[#22c55e] shadow-[inset_0_0_0_6px_rgba(255,255,255,0.24)]">
        <span className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-[4px] bg-white" />
      </span>
    );
  }

  return (
    <span className="grid h-11 w-14 overflow-hidden rounded-[12px] bg-[#7592ff] shadow-[inset_0_0_0_5px_rgba(255,255,255,0.2)]">
      <span className="mx-3 mt-3 h-2 rounded-full bg-white" />
      <span className="mx-3 mb-3 mt-1 h-1 rounded-full bg-white/70" />
    </span>
  );
}

function PixPreview({
  purchaseId,
  totalLabel,
}: {
  purchaseId: number;
  totalLabel: string;
}) {
  return (
    <div className="mt-8 grid gap-6 rounded-[24px] border border-[#dbe8d4] bg-[#f8fcf5] p-5 lg:grid-cols-[240px_minmax(0,1fr)]">
      <div className="mx-auto grid h-[220px] w-[220px] grid-cols-5 gap-1 rounded-[18px] border border-[#dbe8d4] bg-white p-5 shadow-[0_18px_38px_rgba(24,67,34,0.08)]">
        {Array.from({ length: 25 }).map((_, index) => (
          <span
            key={index}
            className={`rounded-[3px] ${
              [0, 1, 2, 5, 10, 12, 14, 16, 18, 20, 22, 23, 24].includes(index)
                ? "bg-[#17351f]"
                : index % 3 === 0
                  ? "bg-[#2b8c46]"
                  : "bg-[#edf5ea]"
            }`}
          />
        ))}
      </div>
      <div className="flex flex-col justify-center text-left">
        <p className="text-[12px] font-black uppercase tracking-[0.2em] text-[#6e9464]">
          Pix
        </p>
        <h3 className="mt-2 text-[30px] font-black text-[#17351f]">{totalLabel}</h3>
        <div className="mt-5 rounded-[18px] border border-[#dbe8d4] bg-white px-4 py-4 text-sm font-semibold text-[#36523c]">
          PIX-ESTANCIA-{purchaseId}-{totalLabel.replace(/\D/g, "")}
        </div>
      </div>
    </div>
  );
}

function CardForm({ title }: { title: string }) {
  return (
    <div className="mt-8">
      <div className="text-center">
        <h3 className="text-[26px] font-black text-[#111827]">{title}</h3>
      </div>
      <div className="mt-6 border-t border-[#d9dfd4] pt-6">
        <div className="grid gap-5">
          <label className="grid gap-2 text-[12px] font-bold uppercase tracking-[0.14em] text-[#6f7c89]">
            Número do cartão
            <input
              className="min-h-[54px] rounded-[12px] border border-[#d6dce7] bg-white px-4 text-[18px] text-[#111827] outline-none shadow-[0_8px_18px_rgba(15,23,42,0.08)] transition focus:border-[#2b8c46]"
              inputMode="numeric"
              placeholder="0000 0000 0000 0000"
            />
          </label>
          <label className="grid gap-2 text-[12px] font-bold uppercase tracking-[0.14em] text-[#6f7c89]">
            Bandeira
            <select className="min-h-[54px] rounded-[12px] border border-[#d6dce7] bg-white px-4 text-[16px] text-[#111827] outline-none transition focus:border-[#2b8c46]">
              <option>Visa</option>
              <option>Mastercard</option>
              <option>Elo</option>
              <option>American Express</option>
            </select>
          </label>
          <label className="grid gap-2 text-[12px] font-bold uppercase tracking-[0.14em] text-[#6f7c89]">
            Nome do dono do cartão
            <input
              className="min-h-[54px] rounded-[12px] border border-[#d6dce7] bg-white px-4 text-[16px] uppercase text-[#111827] outline-none shadow-[0_8px_18px_rgba(15,23,42,0.08)] transition focus:border-[#2b8c46]"
              placeholder="Ex: CARLOS A F DE OLIVEIRA"
            />
          </label>
          <div className="grid gap-5 md:grid-cols-[1fr_1fr]">
            <label className="grid gap-2 text-[12px] font-bold uppercase tracking-[0.14em] text-[#6f7c89]">
              Data de validade
              <div className="grid grid-cols-2 gap-3">
                <input
                  className="min-h-[54px] rounded-[12px] border border-[#d6dce7] bg-white px-4 text-[16px] text-[#111827] outline-none shadow-[0_8px_18px_rgba(15,23,42,0.08)] transition focus:border-[#2b8c46]"
                  inputMode="numeric"
                  placeholder="MM"
                />
                <input
                  className="min-h-[54px] rounded-[12px] border border-[#d6dce7] bg-white px-4 text-[16px] text-[#111827] outline-none shadow-[0_8px_18px_rgba(15,23,42,0.08)] transition focus:border-[#2b8c46]"
                  inputMode="numeric"
                  placeholder="AAAA"
                />
              </div>
            </label>
            <label className="grid gap-2 text-[12px] font-bold uppercase tracking-[0.14em] text-[#6f7c89]">
              Código de segurança
              <input
                className="min-h-[54px] rounded-[12px] border border-[#d6dce7] bg-white px-4 text-[16px] text-[#111827] outline-none shadow-[0_8px_18px_rgba(15,23,42,0.08)] transition focus:border-[#2b8c46]"
                inputMode="numeric"
                placeholder="CVV"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CustomerCheckoutPage({
  mode,
  purchase,
  user,
  customer,
  returnUrl,
  threeDsEnabled,
}: CustomerCheckoutPageProps) {
  const [jqueryReady, setJqueryReady] = useState(false);
  const [checkoutScriptReady, setCheckoutScriptReady] = useState(false);
  const [widgetError, setWidgetError] = useState<string | null>(null);
  const [mockPaymentType, setMockPaymentType] =
    useState<MockPaymentType>("CreditCard");
  const [mockSubmitting, setMockSubmitting] = useState(false);
  const [mockError, setMockError] = useState<string | null>(null);
  const openedRef = useRef(false);

  const totalLabel = useMemo(
    () => formatCurrency(purchase.totalValue),
    [purchase.totalValue],
  );
  const selectedPaymentLabel = paymentMethodLabel(mockPaymentType);

  useEffect(() => {
    if (
      mode !== "widget" ||
      !jqueryReady ||
      !checkoutScriptReady ||
      openedRef.current
    ) {
      return;
    }

    const checkoutFactory = (
      window as typeof window & {
        CieloCheckout?: (config: Record<string, unknown>) => {
          open: (payload: Record<string, unknown>) => void;
        };
      }
    ).CieloCheckout;

    if (!checkoutFactory) {
      window.setTimeout(() => {
        setWidgetError(
          "Não foi possível carregar o checkout seguro. Atualize a página e tente novamente.",
        );
      }, 0);
      return;
    }

    const isLocalhost = ["localhost", "127.0.0.1", "::1"].includes(
      window.location.hostname,
    );
    const widgetThreeDsEnabled = threeDsEnabled && !isLocalhost;
    const checkoutConfig: Record<string, unknown> = {
      checkoutUrl: "/api/checkout/checkout-link",
      statusUrl: "/api/checkout/status",
      retornoUrl: returnUrl,
      container: "#cieloCheckoutInline",
      continueShoppingUrl: "/meus-ingressos",
      logoUrl: "/brand/estancia-logo-dark.png",
      paymentMethods: widgetThreeDsEnabled
        ? ["CreditCard", "DebitCard", "Pix"]
        : ["CreditCard", "Pix"],
      maxInstallments: 12,
      minInstallmentValue: 1,
    };

    if (widgetThreeDsEnabled) {
      checkoutConfig.threeDs = {
        enabled: true,
        tokenUrl: "/api/checkout/cielo3ds-token",
      };
    }

    const checkout = checkoutFactory(checkoutConfig);

    openedRef.current = true;
    checkout.open({
      idcompra: purchase.id,
      valor: purchase.totalValue ?? "0.00",
      nome: customer.name,
      email: customer.email ?? "",
      telefone: customer.phone ?? "",
      document: customer.cpf,
    });
  }, [
    checkoutScriptReady,
    customer.cpf,
    customer.email,
    customer.name,
    customer.phone,
    jqueryReady,
    mode,
    purchase.id,
    purchase.totalValue,
    returnUrl,
    threeDsEnabled,
  ]);

  async function handleMockPayment() {
    setMockSubmitting(true);
    setMockError(null);

    try {
      const response = await fetch("/api/checkout/mock/confirm", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          purchaseId: purchase.id,
          paymentType: mockPaymentType,
          cpf: customer.cpf,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
        }),
      });
      const body = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            error?: {
              message?: string;
            };
          }
        | null;

      if (!response.ok || !body?.ok) {
        throw new Error(
          body?.error?.message ?? "Não foi possível confirmar o pagamento.",
        );
      }

      window.location.assign(`${returnUrl}?mock=1`);
    } catch (error) {
      setMockError(
        error instanceof Error
          ? error.message
          : "Não foi possível confirmar o pagamento.",
      );
    } finally {
      setMockSubmitting(false);
    }
  }

  return (
    <IngressoShell active="buy" user={user}>
      <div className="mx-auto w-full max-w-[1180px] px-4 pb-12 pt-8 md:px-8">
        {mode === "widget" ? (
          <>
            <Script
              src="/vendor/checkout/jquery-1.7.2.min.js"
              strategy="afterInteractive"
              onLoad={() => setJqueryReady(true)}
            />
            {jqueryReady ? (
              <Script
                src="/vendor/checkout/cielo-checkout.js"
                strategy="afterInteractive"
                onLoad={() => setCheckoutScriptReady(true)}
              />
            ) : null}
          </>
        ) : null}

        {mode === "widget" ? (
          <section>
            {widgetError ? (
              <div className="mb-5 rounded-[18px] border border-[#efc3c3] bg-[#fff3f1] px-4 py-3 text-sm text-[#9f3f36]">
                {widgetError}
              </div>
            ) : null}

            <div id="cieloCheckoutInline" className="min-h-[620px]">
              <div className="flex min-h-[520px] items-center justify-center text-center text-sm text-[#4f6953]">
                Carregando pagamento...
              </div>
            </div>
          </section>
        ) : (
          <section className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_340px]">
            <section className="rounded-[28px] border border-[#e4e8e2] bg-white p-6 shadow-[0_22px_55px_rgba(15,23,42,0.08)] md:p-8">
              <div className="flex flex-col gap-5 border-b border-[#d9dfd4] pb-7 md:flex-row md:items-center">
                <div className="w-[120px] shrink-0">
                  <EstanciaLogo href={null} className="h-auto w-full" />
                </div>
                <div>
                  <h1 className="text-[26px] font-semibold text-[#111827]">
                    Checkout de Pagamento - Estância
                  </h1>
                  <p className="mt-1 text-[16px] text-[#546274]">
                    ID da compra:{" "}
                    <strong className="text-[#2d3748]">{purchase.id}</strong>
                  </p>
                </div>
              </div>

              {mode === "mock" ? (
                <>
                  <div className="mt-8 text-center">
                    <p className="text-[18px] font-semibold text-[#111827]">
                      Escolha a forma de pagamento:
                    </p>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    {mockPaymentOptions.map((option) => {
                      const active = mockPaymentType === option.value;

                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setMockPaymentType(option.value)}
                          className={`flex min-h-[90px] items-center gap-4 rounded-full border px-6 text-left transition ${
                            active
                              ? "border-[#6f7dff] bg-[#eef1ff] shadow-[0_18px_36px_rgba(109,125,255,0.2)]"
                              : "border-[#d7d9e5] bg-[#f7f7fb] hover:border-[#9ca3c9]"
                          }`}
                        >
                          <PaymentIcon type={option.value} />
                          <span className="text-[16px] font-black uppercase text-[#111827]">
                            {option.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <p className="mt-3 text-center text-[13px] text-[#8791a5]">
                    *Campo obrigatório
                  </p>

                  {mockPaymentType === "Pix" ? (
                    <PixPreview purchaseId={purchase.id} totalLabel={totalLabel} />
                  ) : (
                    <CardForm title={selectedPaymentLabel} />
                  )}

                  {mockError ? (
                    <div className="mt-5 rounded-[18px] border border-[#efc3c3] bg-[#fff3f1] px-4 py-3 text-sm text-[#9f3f36]">
                      {mockError}
                    </div>
                  ) : null}
                </>
              ) : (
                <>
                  <div className="mt-8 border-b border-[#ead5d1] pb-5">
                    <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#b46d5f]">
                      Indisponível
                    </p>
                    <h2 className="mt-2 text-[28px] font-black text-[#4b231f]">
                      Checkout indisponível
                    </h2>
                    <p className="mt-2 text-[15px] leading-7 text-[#7e4b42]">
                      O pagamento não está disponível neste ambiente.
                    </p>
                  </div>

                  <div className="mt-5 rounded-[24px] border border-[#efc3c3] bg-[#fff3f1] p-5 text-[15px] leading-8 text-[#9f3f36]">
                    O pagamento não está disponível para esta compra no momento.
                  </div>
                </>
              )}
            </section>

            <aside className="h-fit rounded-[28px] bg-[#f1f1f6] p-6 shadow-[0_22px_55px_rgba(15,23,42,0.08)]">
              <h2 className="text-[20px] font-bold text-[#111827]">
                Resumo do pedido
              </h2>
              <dl className="mt-5 divide-y divide-[#d9d9e5] text-[16px] text-[#596579]">
                <div className="flex items-center justify-between gap-5 py-3">
                  <dt>Valor</dt>
                  <dd className="font-black text-[#111827]">{totalLabel}</dd>
                </div>
                <div className="flex items-center justify-between gap-5 py-3">
                  <dt>Método de pagamento</dt>
                  <dd className="max-w-[145px] text-right font-black text-[#111827]">
                    {mode === "mock" ? selectedPaymentLabel : "-"}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-5 py-3">
                  <dt>Pedido</dt>
                  <dd className="font-black text-[#111827]">#{purchase.id}</dd>
                </div>
                <div className="flex items-center justify-between gap-5 py-3">
                  <dt>Itens</dt>
                  <dd className="font-black text-[#111827]">
                    {purchase.voucherCount}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-5 py-3">
                  <dt>Status</dt>
                  <dd className="max-w-[150px] text-right font-black text-[#111827]">
                    {purchaseStatusCopy(purchase.status)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-5 py-3">
                  <dt>Valor total</dt>
                  <dd className="font-black text-[#111827]">{totalLabel}</dd>
                </div>
              </dl>

              {mode === "mock" ? (
                <button
                  type="button"
                  onClick={() => void handleMockPayment()}
                  disabled={mockSubmitting}
                  className="mt-7 flex min-h-[58px] w-full items-center justify-center rounded-full bg-[#5464ff] px-6 text-[16px] font-black text-white shadow-[0_18px_34px_rgba(84,100,255,0.28)] transition hover:bg-[#4150df] disabled:cursor-wait disabled:bg-[#9aa2f2]"
                >
                  {mockSubmitting ? "Processando..." : "Continuar pagamento"}
                </button>
              ) : null}
              <a
                href="/meus-ingressos"
                className="mt-4 flex min-h-[54px] w-full items-center justify-center rounded-full bg-[#d7d7df] px-6 text-[16px] font-bold text-[#33384a] transition hover:bg-[#c9c9d4]"
              >
                Continuar comprando
              </a>
            </aside>
          </section>
        )}
      </div>
    </IngressoShell>
  );
}
