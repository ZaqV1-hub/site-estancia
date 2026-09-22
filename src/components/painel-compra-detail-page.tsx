import Link from "next/link";
import { PainelCompraDetailActions } from "@/components/painel-compra-detail-actions";
import {
  formatPainelBilheteriaCpf as formatCpf,
} from "@/lib/painel-bilheteria-format";
import type { PainelPurchaseDetail } from "@/lib/painel-compras";

type PainelCompraDetailPageProps = {
  detail: PainelPurchaseDetail;
  actorName: string | null;
  actorCpf: string | null;
  canManageHistory: boolean;
};

type PurchaseItemSummary = {
  key: string;
  label: string;
  categoryLabel: string;
  visitDate: string | null;
  schoolName: string | null;
  className: string | null;
  periodName: string | null;
  quantity: number;
  unitValue: string;
  totalValue: string;
};

function parseMoneyLabel(value: string) {
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatMoneyLabel(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function resolveVoucherCategoryLabel(voucher: PainelPurchaseDetail["vouchers"][number]) {
  switch (voucher.voucherType) {
    case "espec":
      return "Adicional";
    case "escol":
      return "Passeio escolar";
    case "infan":
      return "Passaporte infantil";
    case "isent":
      return "Isento";
    case "corte":
      return "Cortesia";
    default:
      return "Passaporte";
  }
}

function summarizePurchaseItems(vouchers: PainelPurchaseDetail["vouchers"]) {
  const grouped = new Map<string, PurchaseItemSummary>();

  for (const voucher of vouchers) {
    const key = [
      voucher.voucherTypeLabel,
      voucher.voucherType,
      voucher.visitDate ?? "",
      voucher.schoolName ?? "",
      voucher.className ?? "",
      voucher.periodName ?? "",
      voucher.unitValue,
    ].join("|");
    const current = grouped.get(key);

    if (current) {
      current.quantity += 1;
      current.totalValue = formatMoneyLabel(
        parseMoneyLabel(current.unitValue) * current.quantity,
      );
      continue;
    }

    grouped.set(key, {
      key,
      label: voucher.voucherTypeLabel,
      categoryLabel: resolveVoucherCategoryLabel(voucher),
      visitDate: voucher.visitDate,
      schoolName: voucher.schoolName,
      className: voucher.className,
      periodName: voucher.periodName,
      quantity: 1,
      unitValue: voucher.unitValue,
      totalValue: voucher.unitValue,
    });
  }

  return Array.from(grouped.values());
}

export function PainelCompraDetailPage({
  detail,
  actorName,
  actorCpf,
  canManageHistory,
}: PainelCompraDetailPageProps) {
  const items = summarizePurchaseItems(detail.vouchers);

  return (
    <section className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="rounded-[6px] bg-white px-4 py-6 shadow-[0_10px_28px_rgba(26,61,94,0.08)] md:px-8">
        <div className="border-b border-[#d8d8d8] pb-3 text-sm text-[#909090]">
          <Link className="text-[#1d68a2] underline" href="/painel">
            Home
          </Link>{" "}
          <span className="mx-2 text-[#b8b8b8]">&gt;</span>
          <Link className="text-[#1d68a2] underline" href="/painel/compras">
            Lista de compras / reservas
          </Link>{" "}
          <span className="mx-2 text-[#b8b8b8]">&gt;</span>
          <span>{detail.purchaseId}</span>
        </div>

        <h1 className="mt-6 text-[28px] font-semibold text-[#205a7f]">
          Dados da Compra / Reserva
        </h1>

        <div className="mt-4 overflow-x-auto border border-[#cfcfcf]">
          <table className="min-w-full border-collapse text-[15px]">
            <tbody>
              <tr className="bg-[#5f84a3] text-left text-white">
                <th className="border border-[#6f8ea8] px-4 py-3 font-normal" colSpan={2}>
                  Data
                </th>
                <th className="border border-[#6f8ea8] px-4 py-3 font-normal">Tipo</th>
                <th className="border border-[#6f8ea8] px-4 py-3 font-normal">Status</th>
              </tr>
              <tr>
                <td className="border border-[#d7d7d7] px-4 py-3" colSpan={2}>
                  {detail.purchaseDate ?? "-"}
                </td>
                <td className="border border-[#d7d7d7] px-4 py-3">{detail.typeLabel}</td>
                <td className="border border-[#d7d7d7] px-4 py-3">{detail.statusLabel}</td>
              </tr>
              <tr className="bg-[#5f84a3] text-left text-white">
                <th className="border border-[#6f8ea8] px-4 py-3 font-normal">Pagamento</th>
                <th className="border border-[#6f8ea8] px-4 py-3 font-normal">Forma Pag.</th>
                <th className="border border-[#6f8ea8] px-4 py-3 font-normal">Data de pagamento</th>
                <th className="border border-[#6f8ea8] px-4 py-3 font-normal">Hora de pagamento</th>
              </tr>
              <tr>
                <td className="border border-[#d7d7d7] px-4 py-3">{detail.paymentLabel}</td>
                <td className="border border-[#d7d7d7] px-4 py-3">{detail.paymentMethodLabel}</td>
                <td className="border border-[#d7d7d7] px-4 py-3">{detail.paymentDate ?? "-"}</td>
                <td className="border border-[#d7d7d7] px-4 py-3">{detail.paymentTime ?? "-"}</td>
              </tr>
              {detail.referralCode ? (
                <>
                  <tr className="bg-[#5f84a3] text-left text-white">
                    <th className="border border-[#6f8ea8] px-4 py-3 font-normal">Valor</th>
                    <th className="border border-[#6f8ea8] px-4 py-3 font-normal">
                      Código de Indicação
                    </th>
                    <th className="border border-[#6f8ea8] px-4 py-3 font-normal">CPF</th>
                    <th className="border border-[#6f8ea8] px-4 py-3 font-normal">Usuário</th>
                  </tr>
                  <tr>
                    <td className="border border-[#d7d7d7] px-4 py-3">{detail.totalValue}</td>
                    <td className="border border-[#d7d7d7] px-4 py-3">{detail.referralCode}</td>
                    <td className="border border-[#d7d7d7] px-4 py-3">{formatCpf(detail.cpf)}</td>
                    <td className="border border-[#d7d7d7] px-4 py-3">{detail.userName ?? "-"}</td>
                  </tr>
                </>
              ) : (
                <>
                  <tr className="bg-[#5f84a3] text-left text-white">
                    <th className="border border-[#6f8ea8] px-4 py-3 font-normal" colSpan={2}>
                      Valor
                    </th>
                    <th className="border border-[#6f8ea8] px-4 py-3 font-normal">CPF</th>
                    <th className="border border-[#6f8ea8] px-4 py-3 font-normal">Usuário</th>
                  </tr>
                  <tr>
                    <td className="border border-[#d7d7d7] px-4 py-3" colSpan={2}>
                      {detail.totalValue}
                    </td>
                    <td className="border border-[#d7d7d7] px-4 py-3">{formatCpf(detail.cpf)}</td>
                    <td className="border border-[#d7d7d7] px-4 py-3">{detail.userName ?? "-"}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>

        <h2 className="mt-8 text-[28px] font-semibold text-[#205a7f]">Itens da compra</h2>
        {items.length === 0 ? (
          <p className="mt-4 text-[17px] text-[#5a5a5a]">Nenhum item encontrado.</p>
        ) : (
          <div className="mt-4 overflow-x-auto border border-[#cfcfcf]">
            <table className="min-w-full border-collapse text-[15px]">
              <thead className="bg-[#5f84a3] text-left text-white">
                <tr>
                  <th className="border border-[#6f8ea8] px-4 py-3 font-normal">Item</th>
                  <th className="border border-[#6f8ea8] px-4 py-3 font-normal">Categoria</th>
                  <th className="border border-[#6f8ea8] px-4 py-3 font-normal">Visita</th>
                  <th className="border border-[#6f8ea8] px-4 py-3 font-normal text-center">
                    Quantidade
                  </th>
                  <th className="border border-[#6f8ea8] px-4 py-3 font-normal">Valor unit.</th>
                  <th className="border border-[#6f8ea8] px-4 py-3 font-normal">Valor total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr
                    className={index % 2 === 1 ? "bg-[#fafafa]" : "bg-white"}
                    key={item.key}
                  >
                    <td className="border border-[#d7d7d7] px-4 py-3">
                      <div className="font-semibold text-[#17351f]">{item.label}</div>
                      {item.schoolName ? (
                        <div className="mt-1 text-sm text-[#5a5a5a]">
                          {item.schoolName}
                          {item.className ? ` | ${item.className}` : ""}
                          {item.periodName ? ` | ${item.periodName}` : ""}
                        </div>
                      ) : null}
                    </td>
                    <td className="border border-[#d7d7d7] px-4 py-3">{item.categoryLabel}</td>
                    <td className="border border-[#d7d7d7] px-4 py-3">{item.visitDate ?? "-"}</td>
                    <td className="border border-[#d7d7d7] px-4 py-3 text-center">
                      {item.quantity}
                    </td>
                    <td className="border border-[#d7d7d7] px-4 py-3">{item.unitValue}</td>
                    <td className="border border-[#d7d7d7] px-4 py-3 font-semibold text-[#17351f]">
                      {item.totalValue}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {detail.gatewayPaymentId ? (
          <>
            <h2 className="mt-8 text-[28px] font-semibold text-[#205a7f]">Pagamento</h2>
            <div className="mt-4 overflow-x-auto border border-[#cfcfcf]">
              <table className="min-w-full border-collapse text-[15px]">
                <thead className="bg-[#5f84a3] text-left text-white">
                  <tr>
                    <th className="border border-[#6f8ea8] px-4 py-3 font-normal">
                      ID Pagamento
                    </th>
                    <th className="border border-[#6f8ea8] px-4 py-3 font-normal">Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-[#d7d7d7] px-4 py-3">
                      {detail.gatewayPaymentId}
                    </td>
                    <td className="border border-[#d7d7d7] px-4 py-3">
                      {detail.gatewayStatusCode
                        ? `Cielo ${detail.gatewayStatusCode} - ${detail.gatewayStatusLabel}`
                        : "-"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        ) : null}

        <h2 className="mt-8 text-[28px] font-semibold text-[#205a7f]">Vouchers</h2>
        {detail.vouchers.length === 0 ? (
          <p className="mt-4 text-[17px] text-[#5a5a5a]">Nenhum voucher encontrado.</p>
        ) : (
          <div className="mt-4 overflow-x-auto border border-[#cfcfcf]">
            <table className="min-w-full border-collapse text-[15px]">
              <thead className="bg-[#5f84a3] text-left text-white">
                <tr>
                  <th className="border border-[#6f8ea8] px-4 py-3 font-normal">ID</th>
                  <th className="border border-[#6f8ea8] px-4 py-3 font-normal">Voucher</th>
                  <th className="border border-[#6f8ea8] px-4 py-3 font-normal">Data da visita</th>
                  <th className="border border-[#6f8ea8] px-4 py-3 font-normal">Tipo</th>
                  <th className="border border-[#6f8ea8] px-4 py-3 font-normal">Escola</th>
                  <th className="border border-[#6f8ea8] px-4 py-3 font-normal">Turma</th>
                  <th className="border border-[#6f8ea8] px-4 py-3 font-normal">Período</th>
                  <th className="border border-[#6f8ea8] px-4 py-3 font-normal">Valor</th>
                  <th className="border border-[#6f8ea8] px-4 py-3 font-normal">Usado?</th>
                  <th className="border border-[#6f8ea8] px-4 py-3 font-normal">Data de uso</th>
                  <th className="border border-[#6f8ea8] px-4 py-3 font-normal">Hora de uso</th>
                </tr>
              </thead>
              <tbody>
                {detail.vouchers.map((voucher, index) => (
                  <tr
                    className={index % 2 === 1 ? "bg-[#fafafa]" : "bg-white"}
                    key={voucher.voucherId}
                  >
                    <td className="border border-[#d7d7d7] px-4 py-3">{voucher.voucherId}</td>
                    <td className="border border-[#d7d7d7] px-4 py-3">
                      <span className="inline-block min-w-[120px] bg-[#eaeaea] px-3 py-1 text-center font-mono text-sm">
                        {voucher.voucherNumber ?? "-"}
                      </span>
                    </td>
                    <td className="border border-[#d7d7d7] px-4 py-3">{voucher.visitDate ?? "-"}</td>
                    <td className="border border-[#d7d7d7] px-4 py-3">{voucher.voucherTypeLabel}</td>
                    <td className="border border-[#d7d7d7] px-4 py-3">
                      {voucher.schoolName && voucher.schoolTripHref ? (
                        <Link className="text-[#1868d6] underline" href={voucher.schoolTripHref}>
                          {voucher.schoolName}
                        </Link>
                      ) : (
                        voucher.schoolName ?? "-"
                      )}
                    </td>
                    <td className="border border-[#d7d7d7] px-4 py-3">{voucher.className ?? "-"}</td>
                    <td className="border border-[#d7d7d7] px-4 py-3">{voucher.periodName ?? "-"}</td>
                    <td className="border border-[#d7d7d7] px-4 py-3">{voucher.unitValue}</td>
                    <td className="border border-[#d7d7d7] px-4 py-3">{voucher.usedLabel}</td>
                    <td className="border border-[#d7d7d7] px-4 py-3">{voucher.usedDate ?? "-"}</td>
                    <td className="border border-[#d7d7d7] px-4 py-3">{voucher.usedTime ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <aside className="grid content-start gap-5">
        <div className="rounded-[6px] border border-[#d4dde5] bg-white p-5 shadow-[0_10px_28px_rgba(26,61,94,0.08)]">
          <h2 className="text-lg font-semibold text-[#205a7f]">Ações</h2>
          <ul className="mt-4 grid gap-3 text-sm">
            <li>
              <Link className="text-[#1d68a2] underline" href="/painel/compras">
                Lista de compras / reservas
              </Link>
            </li>
          </ul>
        </div>
        <PainelCompraDetailActions
          actorCpf={actorCpf}
          actorName={actorName}
          canManageHistory={canManageHistory}
          purchaseId={detail.purchaseId}
          voucherIds={detail.vouchers.map((voucher) => voucher.voucherId)}
        />
      </aside>
    </section>
  );
}
