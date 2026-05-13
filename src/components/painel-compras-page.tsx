import { Buffer } from "node:buffer";
import Link from "next/link";
import type { PainelPurchaseListResult } from "@/lib/painel-compras";

type PainelComprasPageProps = {
  actorName: string | null;
  actorCpf: string | null;
  result: PainelPurchaseListResult;
};

const typeOptions = [
  { value: "bilhe", label: "Bilheteria" },
  { value: "reser", label: "Reserva" },
  { value: "ponli", label: "Compra" },
];

const purchaseStatusOptions = [
  { value: "pend", label: "Em processamento" },
  { value: "conc", label: "Concluida" },
  { value: "canc", label: "Cancelada" },
];

const gatewayPaymentMethodOptions = [
  { value: "1", label: "Cartao de credito" },
  { value: "2", label: "Boleto" },
  { value: "11", label: "Pix" },
];

const ticketPaymentMethodOptions = [
  { value: "dinhe", label: "Dinheiro" },
  { value: "debit", label: "Debito" },
  { value: "credi", label: "Credito" },
  { value: "chequ", label: "Cheque" },
  { value: "tranb", label: "Trans. Bancaria" },
  { value: "corte", label: "Cortesia" },
  { value: "pix", label: "PIX" },
];

const gatewayStatusOptions = [
  { value: "1", label: "Aguardando pagamento" },
  { value: "2", label: "Em analise" },
  { value: "3", label: "Paga" },
  { value: "4", label: "Disponivel" },
  { value: "5", label: "Em disputa" },
  { value: "6", label: "Devolvida" },
  { value: "7", label: "Cancelada" },
  { value: "8", label: "Chargeback debitado" },
  { value: "9", label: "Em contestacao" },
];

function buildComprasHref(
  filters: PainelPurchaseListResult["filters"],
  page: number,
) {
  const params = new URLSearchParams();

  if (filters.dateFrom) {
    params.set("dtcompra[de]", filters.dateFrom);
  }

  if (filters.dateTo) {
    params.set("dtcompra[ate]", filters.dateTo);
  }

  if (filters.purchaseId) {
    params.set("idcompra", filters.purchaseId);
  }

  if (filters.type) {
    params.set("tpcompra", filters.type);
  }

  if (filters.purchaseStatus) {
    params.set("stcompra", filters.purchaseStatus);
  }

  if (filters.gatewayPaymentMethod) {
    params.set("paymentmethodtype", filters.gatewayPaymentMethod);
  }

  if (filters.ticketPaymentMethod) {
    params.set("formapag", filters.ticketPaymentMethod);
  }

  if (filters.gatewayStatus) {
    params.set("status", filters.gatewayStatus);
  }

  if (filters.cpf) {
    params.set("cpf", filters.cpf);
  }

  if (filters.userName) {
    params.set("nmusuario", filters.userName);
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  const query = params.toString();
  return query ? `/painel/compras?${query}` : "/painel/compras";
}

function renderSelect(
  name: string,
  value: string | null,
  options: ReadonlyArray<{ value: string; label: string }>,
) {
  return (
    <select
      className="w-full border border-[#c8c8c8] bg-white px-3 py-2 text-sm text-[#444]"
      defaultValue={value ?? "-1"}
      name={name}
    >
      <option value="-1">Todos</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function hasActiveFilters(filters: PainelPurchaseListResult["filters"]) {
  return Object.values(filters).some((value) => value != null && value !== "");
}

function buildLegacyUserHref(cpf: string) {
  return `/ingresso/painel/usuario-site/detalhe/cpf/${Buffer.from(
    cpf,
    "utf8",
  ).toString("base64")}`;
}

export function PainelComprasPage({
  actorName,
  actorCpf,
  result,
}: PainelComprasPageProps) {
  const previousHref =
    result.page > 1 ? buildComprasHref(result.filters, result.page - 1) : null;
  const nextHref =
    result.page < result.totalPages
      ? buildComprasHref(result.filters, result.page + 1)
      : null;
  const canRefreshPurchases = actorCpf === "00000000191";
  const filtersActive = hasActiveFilters(result.filters);

  return (
    <section className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="rounded-[6px] bg-white px-4 py-6 shadow-[0_10px_28px_rgba(26,61,94,0.08)] md:px-8">
        <div className="border-b border-[#d8d8d8] pb-3 text-sm text-[#909090]">
          <Link className="text-[#1d68a2] underline" href="/painel">
            Home
          </Link>{" "}
          <span className="mx-2 text-[#b8b8b8]">&gt;</span>
          <span>Lista de compras / reservas</span>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[28px] font-semibold text-[#205a7f]">
              Lista de compras / reservas
            </h1>
            <p className="mt-1 text-sm text-[#6e7d89]">
              Operador: {actorName || actorCpf || "Sessao operacional"}
            </p>
          </div>
          <div className="text-sm text-[#5a5a5a]">
            Pagina {result.page} de {result.totalPages}
          </div>
        </div>

        <div className="mt-6">
          {result.items.length === 0 ? (
            <p className="text-[17px] text-[#5a5a5a]">Nenhuma compra encontrada.</p>
          ) : (
            <>
              <p className="mb-4 text-[17px] text-[#5a5a5a]">
                Mostrando <strong>{result.items.length}</strong> de{" "}
                <strong>{result.total}</strong>
              </p>
              <div className="overflow-x-auto border border-[#cfcfcf]">
                <table className="min-w-full border-collapse text-[15px]">
                  <thead className="bg-[#5f84a3] text-left text-white">
                    <tr>
                      <th className="border border-[#6f8ea8] px-4 py-3 font-normal">ID</th>
                      <th className="border border-[#6f8ea8] px-4 py-3 font-normal">Data compra</th>
                      <th className="border border-[#6f8ea8] px-4 py-3 font-normal">Tipo</th>
                      <th className="border border-[#6f8ea8] px-4 py-3 font-normal">Status</th>
                      <th className="border border-[#6f8ea8] px-4 py-3 font-normal">Forma Pag.</th>
                      <th className="border border-[#6f8ea8] px-4 py-3 font-normal">Pagamento</th>
                      <th className="border border-[#6f8ea8] px-4 py-3 font-normal">CPF</th>
                      <th className="border border-[#6f8ea8] px-4 py-3 font-normal">Usuario</th>
                      <th className="border border-[#6f8ea8] px-4 py-3 font-normal">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.items.map((item, index) => (
                      <tr
                        className={index % 2 === 1 ? "bg-[#fafafa]" : "bg-white"}
                        key={item.purchaseId}
                      >
                        <td className="border border-[#d7d7d7] px-4 py-3 align-top">
                          <Link
                            className="text-[#1868d6] underline"
                            href={`/painel/compras/${item.purchaseId}`}
                          >
                            {item.purchaseId}
                          </Link>
                        </td>
                        <td className="border border-[#d7d7d7] px-4 py-3 align-top">
                          {item.purchaseDate ?? "-"}
                        </td>
                        <td className="border border-[#d7d7d7] px-4 py-3 align-top">
                          {item.typeLabel}
                        </td>
                        <td className="border border-[#d7d7d7] px-4 py-3 align-top">
                          {item.statusLabel}
                        </td>
                        <td className="border border-[#d7d7d7] px-4 py-3 align-top">
                          {item.paymentMethodLabel}
                        </td>
                        <td className="border border-[#d7d7d7] px-4 py-3 align-top">
                          {item.paymentLabel}
                        </td>
                        <td className="border border-[#d7d7d7] px-4 py-3 align-top">
                          {item.cpf ?? "-"}
                        </td>
                        <td className="border border-[#d7d7d7] px-4 py-3 align-top">
                          {item.userName && item.cpf ? (
                            <a
                              className="text-[#1868d6] underline"
                              href={buildLegacyUserHref(item.cpf)}
                            >
                              {item.userName}
                            </a>
                          ) : (
                            item.userName ?? "-"
                          )}
                        </td>
                        <td className="border border-[#d7d7d7] px-4 py-3 align-top">
                          {item.totalValue}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {result.totalPages > 1 ? (
          <div className="mt-5 flex flex-wrap justify-end gap-3">
            {previousHref ? (
              <Link
                className="rounded-full border border-[#c9d8e3] px-4 py-2 text-sm font-semibold text-[#205a7f] hover:bg-[#edf5fa]"
                href={previousHref}
              >
                Pagina anterior
              </Link>
            ) : null}
            {nextHref ? (
              <Link
                className="rounded-full border border-[#c9d8e3] px-4 py-2 text-sm font-semibold text-[#205a7f] hover:bg-[#edf5fa]"
                href={nextHref}
              >
                Proxima pagina
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>

      <aside className="grid content-start gap-5">
        <div className="rounded-[6px] border border-[#d4dde5] bg-white p-5 shadow-[0_10px_28px_rgba(26,61,94,0.08)]">
          <h2 className="text-lg font-semibold text-[#205a7f]">Acoes</h2>
          <ul className="mt-4 grid gap-3 text-sm">
            <li>
              <a
                className="text-[#1d68a2] underline"
                href={buildComprasHref(result.filters, 1).replace(
                  "/painel/compras",
                  "/api/painel/compras/export",
                )}
              >
                Exportar (.xls)
              </a>
            </li>
            <li className="text-[#8b98a3]">
              <span className="font-medium">Lista de vouchers</span>
              <p className="mt-1 text-xs">
                Disponivel na proxima fase da migracao.
              </p>
            </li>
            {canRefreshPurchases ? (
              <li className="text-[#8b98a3]">
                <span className="font-medium">Atualizar compras</span>
                <p className="mt-1 text-xs">
                  Acao liberada junto da fase de sincronizacao.
                </p>
              </li>
            ) : null}
          </ul>
        </div>

        <div className="rounded-[6px] border border-[#d4dde5] bg-white p-5 shadow-[0_10px_28px_rgba(26,61,94,0.08)]">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-[#205a7f]">Filtrar</h2>
            {filtersActive ? (
              <Link className="text-sm text-[#1d68a2] underline" href="/painel/compras">
                Remover Filtros
              </Link>
            ) : null}
          </div>
          <form action="/painel/compras" className="mt-4 grid gap-4" method="get">
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              <label className="grid gap-2 text-sm text-[#555]">
                <span>Compra de</span>
                <input
                  className="border border-[#c8c8c8] px-3 py-2 text-sm text-[#444]"
                  defaultValue={result.filters.dateFrom ?? ""}
                  maxLength={10}
                  name="dtcompra[de]"
                  type="text"
                />
              </label>
              <label className="grid gap-2 text-sm text-[#555]">
                <span>ate</span>
                <input
                  className="border border-[#c8c8c8] px-3 py-2 text-sm text-[#444]"
                  defaultValue={result.filters.dateTo ?? ""}
                  maxLength={10}
                  name="dtcompra[ate]"
                  type="text"
                />
              </label>
            </div>

            <label className="grid gap-2 text-sm text-[#555]">
              <span>ID</span>
              <input
                className="border border-[#c8c8c8] px-3 py-2 text-sm text-[#444]"
                defaultValue={result.filters.purchaseId ?? ""}
                min={0}
                name="idcompra"
                type="number"
              />
            </label>

            <label className="grid gap-2 text-sm text-[#555]">
              <span>Tipo</span>
              {renderSelect("tpcompra", result.filters.type, typeOptions)}
            </label>

            <label className="grid gap-2 text-sm text-[#555]">
              <span>Status</span>
              {renderSelect(
                "stcompra",
                result.filters.purchaseStatus,
                purchaseStatusOptions,
              )}
            </label>

            <label className="grid gap-2 text-sm text-[#555]">
              <span>Forma Pgto. (Cielo)</span>
              {renderSelect(
                "paymentmethodtype",
                result.filters.gatewayPaymentMethod,
                gatewayPaymentMethodOptions,
              )}
            </label>

            <label className="grid gap-2 text-sm text-[#555]">
              <span>Forma Pgto. Bilheteria</span>
              {renderSelect(
                "formapag",
                result.filters.ticketPaymentMethod,
                ticketPaymentMethodOptions,
              )}
            </label>

            <label className="grid gap-2 text-sm text-[#555]">
              <span>Pagamento</span>
              {renderSelect("status", result.filters.gatewayStatus, gatewayStatusOptions)}
            </label>

            <label className="grid gap-2 text-sm text-[#555]">
              <span>CPF</span>
              <input
                className="border border-[#c8c8c8] px-3 py-2 text-sm text-[#444]"
                defaultValue={result.filters.cpf ?? ""}
                name="cpf"
                type="text"
              />
            </label>

            <label className="grid gap-2 text-sm text-[#555]">
              <span>Usuario</span>
              <input
                className="border border-[#c8c8c8] px-3 py-2 text-sm text-[#444]"
                defaultValue={result.filters.userName ?? ""}
                name="nmusuario"
                type="text"
              />
            </label>

            <button
              className="inline-flex items-center justify-center rounded-[4px] bg-[#205a7f] px-4 py-2 text-sm font-semibold text-white"
              type="submit"
            >
              Filtrar
            </button>
          </form>
        </div>
      </aside>
    </section>
  );
}
