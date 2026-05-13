/* eslint-disable @next/next/no-img-element */

"use client";

import { useEffect } from "react";
import type { PainelBilheteriaVoucherPrintModel } from "@/lib/painel-bilheteria";
import {
  formatPainelBilheteriaCpf,
  formatPainelBilheteriaDate,
  formatPainelBilheteriaMoney,
} from "@/lib/painel-bilheteria-format";

type Props = {
  vouchers: PainelBilheteriaVoucherPrintModel[];
};

function useAutoPrint() {
  useEffect(() => {
    const onAfterPrint = () => window.close();
    const timer = window.setTimeout(() => window.print(), 500);

    window.addEventListener("afterprint", onAfterPrint);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("afterprint", onAfterPrint);
    };
  }, []);
}

function PainelBilheteriaPrintTicketItem({
  voucher,
}: {
  voucher: PainelBilheteriaVoucherPrintModel;
}) {
  return (
    <article className="border border-[#cfdbe4] bg-white px-4 py-3 text-center shadow-[0_8px_24px_rgba(31,67,98,0.12)] print:border-0 print:shadow-none">
      <img
        src="/brand/rincao-logo.png"
        alt="Clube Rincao"
        className="mx-auto h-10 w-auto object-contain"
      />
      <h1 className="mt-3 text-xl font-bold text-[#1b3447]">
        Ingresso {voucher.typeLabel}
      </h1>
      <h2 className="mt-1 text-2xl font-bold text-[#1b3447]">
        {voucher.voucherCode}
      </h2>

      {voucher.qrCodeUrl ? (
        <img
          src={voucher.qrCodeUrl}
          alt={`QR do voucher ${voucher.voucherId}`}
          className="mx-auto mt-3 h-[120px] w-[120px] object-contain"
        />
      ) : (
        <p className="mt-3 text-sm font-semibold text-[#9f3d2f]">
          QR Code indisponivel
        </p>
      )}

      <div className="mt-3 space-y-1 text-[13px] font-bold text-[#2c3f4d]">
        <p>CPF: {formatPainelBilheteriaCpf(voucher.cpf)}</p>
        <p>ID da compra: {voucher.purchaseId}</p>
        <p>Origem: {voucher.purchaseLocation}</p>
        <p>Compra: {formatPainelBilheteriaDate(voucher.purchaseDate)}</p>
        <p>Visita: {formatPainelBilheteriaDate(voucher.visitDate)}</p>
        <p>Valor: {formatPainelBilheteriaMoney(voucher.price)}</p>
        <p>Validade: {formatPainelBilheteriaDate(voucher.validUntil)}</p>
      </div>
    </article>
  );
}

export function PainelBilheteriaPrintTicket({ vouchers }: Props) {
  useAutoPrint();

  return (
    <>
      <style jsx global>{`
        @page {
          size: 80mm auto;
          margin: 0;
        }

        @media print {
          body {
            margin: 0;
            background: #ffffff;
          }
        }
      `}</style>

      <main className="min-h-screen bg-[#f4f4f4] px-3 py-4 print:bg-white print:px-0 print:py-0">
        <div className="mx-auto flex w-[80mm] flex-col gap-3">
          {vouchers.map((voucher) => (
            <PainelBilheteriaPrintTicketItem
              key={voucher.voucherId}
              voucher={voucher}
            />
          ))}
        </div>
      </main>
    </>
  );
}
