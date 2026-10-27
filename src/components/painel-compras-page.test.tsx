import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PainelComprasPage } from "@/components/painel-compras-page";

describe("PainelComprasPage", () => {
  it("renderiza filtros e coluna de data agendada", () => {
    const html = renderToStaticMarkup(
      React.createElement(PainelComprasPage, {
        actorName: "WAGNER",
        actorCpf: "00000000191",
        result: {
          total: 1,
          page: 1,
          perPage: 30,
          totalPages: 2,
          filters: {
            purchaseId: null,
            type: "ponli",
            purchaseStatus: null,
            calendar: "1",
            origin: "site",
            voucherStatus: "rescheduled",
            search: "DEV",
            paymentMethod: null,
            ticketPaymentMethod: null,
            gatewayPaymentMethod: null,
            gatewayStatus: "3",
            cpf: "12345678901",
            userName: null,
            dateFrom: "01/05/2026",
            dateTo: null,
            visitDateFrom: "08/05/2026",
            visitDateTo: null,
          },
          items: [
            {
              purchaseId: 551,
              purchaseDate: "06/05/2026",
              paymentDate: "07/05/2026",
              paymentTime: "14:32:11",
              visitDate: "08/05/2026",
              type: "bilhe",
              typeLabel: "Bilheteria",
              status: "conc",
              statusLabel: "Concluida",
              paymentMethodLabel: "PIX",
              paymentLabel: "Bilheteria",
              cpf: "12345678901",
              userName: "DEV",
              totalValue: "80,00",
              visitValue: "40,00",
              people: 2,
              originLabel: "Site",
              voucherStatus: "rescheduled",
              voucherStatusLabel: "Reagendado",
            },
          ],
        },
      }),
    );

    expect(html).toContain("Todas as compras");
    expect(html).toContain("Vouchers por data de visita");
    expect(html).toContain("/painel/compras/vouchers?dtagenda%5Bde%5D=08%2F05%2F2026");
    expect(html).toContain('aria-label="Status da compra"');
    expect(html).toContain('calendar-purchase-status-conc');
    expect(html).toContain("Reagendadas");
    expect(html).toContain("Disponíveis");
    expect(html).toContain("Utilizadas");
    expect(html).toContain('name="origin"');
    expect(html).toContain('name="voucherStatus"');
    expect(html).toContain('name="search"');
    expect(html).toContain("Comprador");
    expect(html).toContain("Data da visita");
    expect(html).toContain("Pessoas");
    expect(html).toContain("R$ 40,00");
    expect(html).toContain("Total da compra: R$ 80,00");
    expect(html).toContain("Reagendado");
    expect(html).toContain("origin=site");
    expect(html).toContain("calendar=1");
    expect(html).toContain('name="calendar"');
    expect(html).toContain('href="/painel/compras?calendar=1"');
    expect(html).toContain("voucherStatus=rescheduled");
    expect(html).toContain("search=DEV");
    expect(html).not.toMatch(/#[0-9a-f]{3,8}/i);
    expect(html).toContain("Forma de pgto");
    expect(html).toContain("Pagamento");
    expect(html).toContain(">Compra<");
    expect(html).toContain("Data da visita de");
    expect(html).toContain("Data da visita");
    expect(html).toContain("Limpar filtros");
    expect(html).toContain("Filtrar");
    expect(html).toContain("Bilheteria");
    expect(html).toContain("DEV");
    expect(html).toContain("/ingresso/painel/usuario-site/detalhe/cpf/MTIzNDU2Nzg5MDE=");
    expect(html).toContain("Ver detalhes");
    expect(html).toContain("/painel/compras/551");
    expect(html).toContain("08/05/2026");
    expect(html).toContain("Atualizacao manual em fase futura");
    expect(html).toContain("Exportar");
  });

  it("nao renderiza limpar filtros quando nao ha filtros ativos", () => {
    const html = renderToStaticMarkup(
      React.createElement(PainelComprasPage, {
        actorName: "Operador",
        actorCpf: "11111111111",
        result: {
          total: 0,
          page: 1,
          perPage: 30,
          totalPages: 1,
          filters: {
            purchaseId: null,
            type: null,
            purchaseStatus: null,
            paymentMethod: null,
            ticketPaymentMethod: null,
            gatewayPaymentMethod: null,
            gatewayStatus: null,
            cpf: null,
            userName: null,
            dateFrom: null,
            dateTo: null,
            visitDateFrom: null,
            visitDateTo: null,
          },
          items: [],
        },
      }),
    );

    expect(html).toContain("Nenhuma compra encontrada.");
    expect(html).not.toContain("Limpar filtros");
    expect(html).not.toContain("Atualizacao manual em fase futura");
  });
});
