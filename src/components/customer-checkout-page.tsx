"use client";

import Script from "next/script";
import { useEffect, useMemo, useRef, useState } from "react";
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
};

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

export function CustomerCheckoutPage({
  mode,
  purchase,
  user,
  customer,
  returnUrl,
}: CustomerCheckoutPageProps) {
  const [jqueryReady, setJqueryReady] = useState(false);
  const [checkoutScriptReady, setCheckoutScriptReady] = useState(false);
  const [widgetError, setWidgetError] = useState<string | null>(null);
  const openedRef = useRef(false);

  const totalLabel = useMemo(
    () => formatCurrency(purchase.totalValue),
    [purchase.totalValue],
  );

  useEffect(() => {
    if (mode !== "widget" || !jqueryReady || !checkoutScriptReady || openedRef.current) {
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
          "Nao foi possivel carregar o checkout seguro. Atualize a pagina e tente novamente.",
        );
      }, 0);
      console.error("checkout-widget-missing");
      return;
    }

    const checkout = checkoutFactory({
      checkoutUrl: "/api/checkout/checkout-link",
      statusUrl: "/api/checkout/status",
      retornoUrl: returnUrl,
      container: "#cieloCheckoutInline",
      continueShoppingUrl: "/meus-ingressos",
      maxInstallments: 12,
      minInstallmentValue: 1,
      threeDs: {
        enabled: true,
        tokenUrl: "/api/checkout/cielo3ds-token",
      },
    });

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
  ]);

  return (
    <IngressoShell active="buy" user={user}>
      <div className="mx-auto w-full max-w-[1180px] px-4 pt-8 md:px-6">
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

        <section className="rounded-[30px] border border-[#d8e6f0] bg-white p-6 shadow-[0_18px_48px_rgba(17,66,97,0.11)] md:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="legacy-rounded text-[12px] uppercase tracking-[0.28em] text-[#7a93a7]">
                Etapa final
              </p>
              <h1 className="legacy-rounded mt-3 text-[30px] leading-tight text-[#1c5a80] md:text-[38px]">
                Checkout de pagamento
              </h1>
              <p className="mt-3 max-w-[760px] text-[15px] leading-8 text-[#5f768a]">
                Revise o pedido e conclua o pagamento para liberar os vouchers
                desta compra.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-[22px] border border-[#d9e5ee] bg-[#f8fbfe] px-4 py-3">
                <p className="legacy-rounded text-[11px] uppercase tracking-[0.18em] text-[#7a93a7]">
                  Pedido
                </p>
                <p className="mt-2 text-[20px] text-[#1c5a80]">#{purchase.id}</p>
              </div>
              <div className="rounded-[22px] border border-[#d9e5ee] bg-[#f8fbfe] px-4 py-3">
                <p className="legacy-rounded text-[11px] uppercase tracking-[0.18em] text-[#7a93a7]">
                  Total
                </p>
                <p className="mt-2 text-[20px] text-[#1c5a80]">{totalLabel}</p>
              </div>
              <div className="rounded-[22px] border border-[#d9e5ee] bg-[#f8fbfe] px-4 py-3">
                <p className="legacy-rounded text-[11px] uppercase tracking-[0.18em] text-[#7a93a7]">
                  Ingressos
                </p>
                <p className="mt-2 text-[20px] text-[#1c5a80]">
                  {purchase.voucherCount}
                </p>
              </div>
              <div className="rounded-[22px] border border-[#d9e5ee] bg-[#f8fbfe] px-4 py-3">
                <p className="legacy-rounded text-[11px] uppercase tracking-[0.18em] text-[#7a93a7]">
                  Status
                </p>
                <p className="mt-2 text-[16px] text-[#1c5a80]">
                  {purchaseStatusCopy(purchase.status)}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <section className="order-2 rounded-[30px] border border-[#d8e6f0] bg-white p-5 shadow-[0_18px_48px_rgba(17,66,97,0.11)] md:p-7 lg:order-1">
              <div className="border-b border-[#e6eef5] pb-5">
                <h2 className="legacy-rounded text-[26px] leading-tight text-[#1c5a80]">
                  {mode === "widget"
                    ? "Pagamento seguro"
                    : "Checkout indisponivel"}
                </h2>
                <p className="mt-2 text-[15px] leading-8 text-[#5f768a]">
                  {mode === "widget"
                    ? "O pagamento e processado pela Cielo nesta mesma etapa."
                    : "O pagamento nao esta disponivel neste ambiente porque a stack nativa do checkout nao esta configurada."}
                </p>
              </div>

              {mode === "widget" ? (
                <div className="mt-5">
                  {widgetError ? (
                    <div className="mb-5 rounded-[20px] border border-[#efc3c3] bg-[#fff3f1] px-4 py-3 text-sm text-[#9f3f36]">
                      {widgetError}
                    </div>
                  ) : null}

                  <div
                    id="cieloCheckoutInline"
                    className="min-h-[620px] overflow-hidden rounded-[24px] border border-[#d8e6f0] bg-[#f8fbfe] p-3 md:p-5"
                  >
                    <div className="flex min-h-[560px] items-center justify-center text-center text-sm text-[#5f768a]">
                      Preparando checkout seguro...
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-5 rounded-[24px] border border-[#efc3c3] bg-[#fff3f1] p-5 text-[15px] leading-8 text-[#9f3f36]">
                  O pagamento nao esta disponivel para esta compra no momento.
                  Nenhuma forma de pagamento sera exibida ate que as credenciais
                  nativas do checkout estejam configuradas.
                </div>
              )}
            </section>

            <aside className="order-1 h-fit rounded-[30px] border border-[#d8e6f0] bg-[#f8fbfe] p-5 shadow-[0_18px_48px_rgba(17,66,97,0.08)] md:p-6 lg:sticky lg:top-6 lg:order-2">
              <h2 className="legacy-rounded text-[24px] text-[#1c5a80]">
                Resumo da compra
              </h2>
              <div className="mt-5 space-y-4">
                <div className="rounded-[22px] border border-[#d9e5ee] bg-white p-4">
                  <p className="legacy-rounded text-[12px] uppercase tracking-[0.18em] text-[#7a93a7]">
                    Pedido
                  </p>
                  <p className="mt-2 text-[22px] text-[#1c5a80]">#{purchase.id}</p>
                </div>

                <div className="rounded-[22px] border border-[#d9e5ee] bg-white p-4">
                  <p className="legacy-rounded text-[12px] uppercase tracking-[0.18em] text-[#7a93a7]">
                    Total a pagar
                  </p>
                  <p className="mt-2 text-[30px] leading-none text-[#1c5a80]">
                    {totalLabel}
                  </p>
                </div>

                <div className="rounded-[22px] border border-[#d9e5ee] bg-white p-4">
                  <dl className="space-y-3 text-[14px] text-[#5f768a]">
                    <div className="flex items-start justify-between gap-4">
                      <dt>Ingressos</dt>
                      <dd className="text-right text-[#1c5a80]">
                        {purchase.voucherCount}
                      </dd>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <dt>Status atual</dt>
                      <dd className="text-right text-[#1c5a80]">
                        {purchaseStatusCopy(purchase.status)}
                      </dd>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <dt>Comprador</dt>
                      <dd className="max-w-[180px] text-right text-[#1c5a80]">
                        {customer.name}
                      </dd>
                    </div>
                    {customer.email ? (
                      <div className="flex items-start justify-between gap-4">
                        <dt>E-mail</dt>
                        <dd className="max-w-[180px] text-right text-[#1c5a80]">
                          {customer.email}
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                </div>

                <div className="rounded-[22px] border border-[#d9e5ee] bg-white p-4 text-[14px] leading-7 text-[#5f768a]">
                  <p className="legacy-rounded text-[12px] uppercase tracking-[0.18em] text-[#7a93a7]">
                    Liberacao
                  </p>
                  <p className="mt-2">
                    Assim que o pagamento for confirmado, os vouchers continuam
                    disponiveis em Meus Ingressos.
                  </p>
                </div>

                <a
                  href="/meus-ingressos"
                  className="legacy-rounded inline-flex min-h-[48px] w-full items-center justify-center rounded-[999px] border border-[#c9d7e3] bg-white px-5 py-3 text-[15px] text-[#2b5976] transition hover:border-[#3498db] hover:text-[#1c5a80]"
                >
                  Voltar para Meus Ingressos
                </a>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </IngressoShell>
  );
}
