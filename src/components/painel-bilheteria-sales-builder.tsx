"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { PublicAgendaEvent } from "@/lib/agenda-contracts";
import type { OpsCourtesyAuthor, OpsDiscount } from "@/lib/ops-reference-data";
import {
  PAINEL_BILHETERIA_SALE_DRAFT_KEY,
  type PainelBilheteriaSaleDraft,
  type PainelBilheteriaSaleDraftCourtesy,
  type PainelBilheteriaSaleDraftItem,
} from "@/lib/painel-bilheteria-sales";

type ReferenceDataResponse = {
  ok: boolean;
  data?: {
    discounts: OpsDiscount[];
    courtesyAuthors: OpsCourtesyAuthor[];
  };
  error?: {
    message?: string;
  };
};

type PublicAgendaResponse = {
  ok: boolean;
  data?: {
    events: PublicAgendaEvent[];
  };
  error?: {
    message?: string;
  };
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function parseMoney(value: string | null | undefined) {
  const raw = String(value ?? "").trim().replace(/^R\$\s*/i, "");
  const normalized =
    raw.includes(",") && raw.includes(".")
      ? raw.replace(/\./g, "").replace(",", ".")
      : raw.includes(",")
        ? raw.replace(",", ".")
        : raw;
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function buildPeriod() {
  const now = new Date();

  return {
    month: String(now.getMonth() + 1),
    year: String(now.getFullYear()),
  };
}

function discountUnitPrice(
  basePrice: number,
  discountId: string,
  discounts: OpsDiscount[],
) {
  const discount = discounts.find((item) => String(item.id) === discountId.trim());

  if (!discount) {
    return basePrice;
  }

  const value = parseMoney(discount.value);

  if (discount.applicationType === "percentual") {
    return Math.max(0, money(basePrice - basePrice * (value / 100)));
  }

  if (discount.applicationType === "valor_fixo") {
    return Math.max(0, money(basePrice - Math.min(basePrice, value)));
  }

  return basePrice;
}

export function PainelBilheteriaSalesBuilder() {
  const router = useRouter();
  const initialPeriod = buildPeriod();
  const [month, setMonth] = useState(initialPeriod.month);
  const [year, setYear] = useState(initialPeriod.year);
  const [agendas, setAgendas] = useState<PublicAgendaEvent[]>([]);
  const [agendaId, setAgendaId] = useState("");
  const [cpf, setCpf] = useState("");
  const [adultQuantity, setAdultQuantity] = useState("1");
  const [adultDiscountId, setAdultDiscountId] = useState("");
  const [childQuantity, setChildQuantity] = useState("0");
  const [childDiscountId, setChildDiscountId] = useState("");
  const [exemptQuantity, setExemptQuantity] = useState("0");
  const [courtesyAuthorId, setCourtesyAuthorId] = useState("");
  const [courtesyQuantity, setCourtesyQuantity] = useState("0");
  const [courtesyIdentification, setCourtesyIdentification] = useState("");
  const [courtesyNote, setCourtesyNote] = useState("");
  const [reason, setReason] = useState("Venda presencial na bilheteria");
  const [discounts, setDiscounts] = useState<OpsDiscount[]>([]);
  const [courtesyAuthors, setCourtesyAuthors] = useState<OpsCourtesyAuthor[]>([]);
  const [loadingReference, setLoadingReference] = useState(true);
  const [loadingAgenda, setLoadingAgenda] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadReferenceData() {
      setLoadingReference(true);

      try {
        const response = await fetch("/api/painel/bilheteria/reference-data");
        const payload =
          (await response.json().catch(() => null)) as ReferenceDataResponse | null;

        if (!active) {
          return;
        }

        if (!response.ok || !payload?.ok || !payload.data) {
          setErrorMessage(
            payload?.error?.message ||
              "Nao foi possivel carregar os descontos e autorizadores.",
          );
          return;
        }

        const data = payload.data;
        setDiscounts(data.discounts);
        setCourtesyAuthors(data.courtesyAuthors);
      } finally {
        if (active) {
          setLoadingReference(false);
        }
      }
    }

    void loadReferenceData();

    return () => {
      active = false;
    };
  }, []);

  async function handleLoadAgendas() {
    setLoadingAgenda(true);
    setErrorMessage(null);

    try {
      const response = await fetch(
        `/api/agenda/publica?mes=${encodeURIComponent(month)}&ano=${encodeURIComponent(year)}`,
      );
      const payload =
        (await response.json().catch(() => null)) as PublicAgendaResponse | null;

      if (!response.ok || !payload?.ok || !payload.data) {
        setErrorMessage(
          payload?.error?.message || "Nao foi possivel carregar a agenda da bilheteria.",
        );
        return;
      }

      const data = payload.data;
      setAgendas(data.events);
      setAgendaId((current) => current || String(data.events[0]?.id ?? ""));
    } finally {
      setLoadingAgenda(false);
    }
  }

  const selectedAgenda = useMemo(
    () => agendas.find((agenda) => String(agenda.id) === agendaId.trim()) ?? null,
    [agendaId, agendas],
  );
  const adultBasePrice = parseMoney(selectedAgenda?.priceTable.gateNormal);
  const childBasePrice = parseMoney(selectedAgenda?.priceTable.gateChild);
  const adultQuantityNumber = Math.max(0, Math.trunc(Number(adultQuantity) || 0));
  const childQuantityNumber = Math.max(0, Math.trunc(Number(childQuantity) || 0));
  const exemptQuantityNumber = Math.max(0, Math.trunc(Number(exemptQuantity) || 0));
  const courtesyQuantityNumber = Math.max(
    0,
    Math.trunc(Number(courtesyQuantity) || 0),
  );
  const adultUnitPrice = discountUnitPrice(adultBasePrice, adultDiscountId, discounts);
  const childUnitPrice = discountUnitPrice(childBasePrice, childDiscountId, discounts);
  const saleItems: PainelBilheteriaSaleDraftItem[] = (() => {
    const items: PainelBilheteriaSaleDraftItem[] = [];

    if (adultQuantityNumber > 0) {
      items.push({
        type: "norma",
        quantity: adultQuantityNumber,
        discountId: adultDiscountId ? Number(adultDiscountId) : null,
        label: "Adulto",
        unitValue: adultUnitPrice.toFixed(2),
        totalValue: money(adultUnitPrice * adultQuantityNumber).toFixed(2),
      });
    }

    if (childQuantityNumber > 0) {
      items.push({
        type: "infan",
        quantity: childQuantityNumber,
        discountId: childDiscountId ? Number(childDiscountId) : null,
        label: "Crianca",
        unitValue: childUnitPrice.toFixed(2),
        totalValue: money(childUnitPrice * childQuantityNumber).toFixed(2),
      });
    }

    if (exemptQuantityNumber > 0) {
      items.push({
        type: "isent",
        quantity: exemptQuantityNumber,
        discountId: null,
        label: "Isento",
        unitValue: "0.00",
        totalValue: "0.00",
      });
    }

    return items;
  })();
  const courtesyDrafts: PainelBilheteriaSaleDraftCourtesy[] =
    courtesyQuantityNumber > 0 && Number(courtesyAuthorId) > 0
      ? [
          {
            authorId: Number(courtesyAuthorId),
            authorName:
              courtesyAuthors.find((item) => item.id === Number(courtesyAuthorId))
                ?.name ?? "Autorizador",
            quantity: courtesyQuantityNumber,
            identification: courtesyIdentification.trim(),
            note: courtesyNote.trim(),
          },
        ]
      : [];
  const saleTotal = saleItems.reduce(
    (total, item) => total + parseMoney(item.totalValue),
    0,
  );
  const canProceed =
    selectedAgenda != null && (saleItems.length > 0 || courtesyDrafts.length > 0);

  function handleProceed() {
    if (!selectedAgenda || !canProceed) {
      setErrorMessage("Selecione a agenda e monte ao menos um ingresso ou cortesia.");
      return;
    }

    const draft: PainelBilheteriaSaleDraft = {
      agendaId: selectedAgenda.id,
      agendaLabel: `${selectedAgenda.date} · #${selectedAgenda.id}`,
      cpf: cpf.trim(),
      items: saleItems,
      courtesies: courtesyDrafts,
      totalValue: saleTotal.toFixed(2),
      reason: reason.trim() || "Venda presencial na bilheteria",
      createdAt: new Date().toISOString(),
    };

    sessionStorage.setItem(PAINEL_BILHETERIA_SALE_DRAFT_KEY, JSON.stringify(draft));
    router.push("/painel/bilheteria/finalizar");
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-start">
      <div className="grid gap-5">
        <article className="rounded-[6px] border border-[#d3dde6] bg-white p-5 shadow-[0_8px_22px_rgba(18,73,127,0.08)]">
          <div className="flex flex-wrap items-end gap-3">
            <label className="grid gap-2 text-sm font-semibold text-[#46627f]">
              Mês
              <input
                value={month}
                onChange={(event) => setMonth(event.target.value)}
                className="min-h-[44px] border border-[#b8d0e6] px-4 py-2.5 text-sm text-[#1f3650]"
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-[#46627f]">
              Ano
              <input
                value={year}
                onChange={(event) => setYear(event.target.value)}
                className="min-h-[44px] border border-[#b8d0e6] px-4 py-2.5 text-sm text-[#1f3650]"
              />
            </label>
            <button
              type="button"
              onClick={() => void handleLoadAgendas()}
              className="rounded-[4px] bg-[linear-gradient(180deg,#3e9ce1_0%,#245f88_100%)] px-5 py-3 text-sm font-bold text-white shadow-[0_3px_0_rgba(0,0,0,0.18)]"
            >
              {loadingAgenda ? "Carregando..." : "Carregar agenda"}
            </button>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-[#46627f]">
              Data da agenda
              <select
                value={agendaId}
                onChange={(event) => setAgendaId(event.target.value)}
                className="min-h-[44px] border border-[#b8d0e6] px-4 py-2.5 text-sm text-[#1f3650]"
              >
                <option value="">Selecione</option>
                {agendas.map((agenda) => (
                  <option key={agenda.id} value={agenda.id}>
                    {agenda.date} - #{agenda.id} -{" "}
                    {agenda.type === "promo" ? "Promocional" : "Padrao"}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-semibold text-[#46627f]">
              CPF opcional
              <input
                value={cpf}
                onChange={(event) => setCpf(event.target.value)}
                placeholder="52998224725"
                className="min-h-[44px] border border-[#b8d0e6] px-4 py-2.5 text-sm text-[#1f3650]"
              />
            </label>
          </div>
        </article>

        <article className="rounded-[6px] border border-[#d3dde6] bg-white p-5 shadow-[0_8px_22px_rgba(18,73,127,0.08)]">
          <h2 className="legacy-condensed text-3xl text-[#2d4f73]">Ingressos</h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <label className="grid gap-2 text-sm font-semibold text-[#46627f]">
              Adultos
              <input
                value={adultQuantity}
                onChange={(event) => setAdultQuantity(event.target.value)}
                className="min-h-[44px] border border-[#b8d0e6] px-4 py-2.5 text-sm text-[#1f3650]"
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-[#46627f]">
              Desconto adulto
              <select
                value={adultDiscountId}
                onChange={(event) => setAdultDiscountId(event.target.value)}
                className="min-h-[44px] border border-[#b8d0e6] px-4 py-2.5 text-sm text-[#1f3650]"
              >
                <option value="">Sem desconto</option>
                {discounts.map((discount) => (
                  <option key={discount.id} value={discount.id}>
                    {discount.name} - {discount.value}
                  </option>
                ))}
              </select>
            </label>
            <div className="border border-[#d9e6f2] bg-[#f8fbfe] px-4 py-3 text-sm text-[#46627f]">
              Base adulto
              <div className="mt-1 text-lg font-semibold text-[#184b78]">
                {formatMoney(adultBasePrice)}
              </div>
            </div>

            <label className="grid gap-2 text-sm font-semibold text-[#46627f]">
              Crianças
              <input
                value={childQuantity}
                onChange={(event) => setChildQuantity(event.target.value)}
                className="min-h-[44px] border border-[#b8d0e6] px-4 py-2.5 text-sm text-[#1f3650]"
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-[#46627f]">
              Desconto criança
              <select
                value={childDiscountId}
                onChange={(event) => setChildDiscountId(event.target.value)}
                className="min-h-[44px] border border-[#b8d0e6] px-4 py-2.5 text-sm text-[#1f3650]"
              >
                <option value="">Sem desconto</option>
                {discounts.map((discount) => (
                  <option key={discount.id} value={discount.id}>
                    {discount.name} - {discount.value}
                  </option>
                ))}
              </select>
            </label>
            <div className="border border-[#d9e6f2] bg-[#f8fbfe] px-4 py-3 text-sm text-[#46627f]">
              Base criança
              <div className="mt-1 text-lg font-semibold text-[#184b78]">
                {formatMoney(childBasePrice)}
              </div>
            </div>

            <label className="grid gap-2 text-sm font-semibold text-[#46627f] lg:col-span-2">
              Isentos
              <input
                value={exemptQuantity}
                onChange={(event) => setExemptQuantity(event.target.value)}
                className="min-h-[44px] border border-[#b8d0e6] px-4 py-2.5 text-sm text-[#1f3650]"
              />
            </label>
          </div>
        </article>

        <article className="rounded-[6px] border border-[#d3dde6] bg-white p-5 shadow-[0_8px_22px_rgba(18,73,127,0.08)]">
          <h2 className="legacy-condensed text-3xl text-[#2d4f73]">Cortesias</h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-[#46627f]">
              Autorizador
              <select
                value={courtesyAuthorId}
                onChange={(event) => setCourtesyAuthorId(event.target.value)}
                className="min-h-[44px] border border-[#b8d0e6] px-4 py-2.5 text-sm text-[#1f3650]"
                disabled={loadingReference}
              >
                <option value="">Sem cortesia</option>
                {courtesyAuthors.map((author) => (
                  <option key={author.id} value={author.id}>
                    {author.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-semibold text-[#46627f]">
              Quantidade
              <input
                value={courtesyQuantity}
                onChange={(event) => setCourtesyQuantity(event.target.value)}
                className="min-h-[44px] border border-[#b8d0e6] px-4 py-2.5 text-sm text-[#1f3650]"
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-[#46627f]">
              Identificação
              <input
                value={courtesyIdentification}
                onChange={(event) => setCourtesyIdentification(event.target.value)}
                className="min-h-[44px] border border-[#b8d0e6] px-4 py-2.5 text-sm text-[#1f3650]"
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-[#46627f]">
              Observação
              <input
                value={courtesyNote}
                onChange={(event) => setCourtesyNote(event.target.value)}
                className="min-h-[44px] border border-[#b8d0e6] px-4 py-2.5 text-sm text-[#1f3650]"
              />
            </label>
          </div>
        </article>
      </div>

      <aside className="xl:sticky xl:top-6">
        <article className="rounded-[6px] border border-[#4f88b0] bg-[linear-gradient(180deg,#3e9ce1_0%,#245f88_100%)] p-6 text-white shadow-[0_12px_24px_rgba(20,63,102,0.22)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
                Resumo da venda
              </div>
              <h2 className="mt-2 text-2xl font-semibold">Bilheteria</h2>
            </div>
              <div className="rounded-[4px] bg-white/12 px-3 py-2 text-xs uppercase tracking-[0.18em] text-white/80">
              {selectedAgenda ? "Agenda pronta" : "Selecione a agenda"}
            </div>
          </div>

          <div className="mt-5 space-y-3 text-sm text-white/85">
            <div>
              <div className="font-semibold text-white">Agenda</div>
              <div>{selectedAgenda ? `${selectedAgenda.date} · #${selectedAgenda.id}` : "-"}</div>
            </div>
            <div>
              <div className="font-semibold text-white">Itens</div>
              {saleItems.length > 0 ? (
                <ul className="mt-2 space-y-2">
                  {saleItems.map((item) => (
                    <li key={`${item.type}-${item.discountId ?? "none"}`}>
                      {item.label} x{item.quantity} · {formatMoney(parseMoney(item.totalValue))}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="mt-2 text-white/70">Nenhum ingresso configurado.</div>
              )}
            </div>
            <div>
              <div className="font-semibold text-white">Cortesias</div>
              {courtesyDrafts.length > 0 ? (
                <ul className="mt-2 space-y-2">
                  {courtesyDrafts.map((courtesy) => (
                    <li key={`${courtesy.authorId}-${courtesy.identification || courtesy.note}`}>
                      {courtesy.authorName} · {courtesy.quantity} cortesia(s)
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="mt-2 text-white/70">Sem cortesia nesta venda.</div>
              )}
            </div>
          </div>

          <label className="mt-5 grid gap-2 text-sm font-semibold text-white">
            Motivo/observação
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              className="border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/60"
            />
          </label>

          <div className="mt-5 border border-white/15 bg-white/10 px-4 py-4">
            <div className="text-xs uppercase tracking-[0.16em] text-white/75">
              Total calculado
            </div>
            <div className="mt-2 text-4xl font-light text-white">
              {formatMoney(saleTotal)}
            </div>
          </div>

          {errorMessage ? (
            <div className="mt-4 border border-[#f2d6d6] bg-[#fff1f1] px-4 py-3 text-sm text-[#8b2d2d]">
              {errorMessage}
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleProceed}
            disabled={!canProceed || loadingReference}
            className="mt-5 inline-flex w-full items-center justify-center rounded-[4px] bg-white px-5 py-4 text-base font-bold text-[#1f507d] shadow-[0_3px_0_rgba(0,0,0,0.16)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Finalizar Compra
          </button>
        </article>
      </aside>
    </section>
  );
}
