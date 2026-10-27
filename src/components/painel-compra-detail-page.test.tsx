import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PainelCompraDetailPage } from "@/components/painel-compra-detail-page";
import type { PainelPurchaseDetail } from "@/lib/painel-compras";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const passport: PainelPurchaseDetail["vouchers"][number] = {
  voucherId: 9001, voucherNumber: "ABC-123", visitDate: "08/05/2026", validUntil: "15/05/2026",
  kind: "passport", voucherType: "norma", voucherTypeLabel: "Adulto", schoolName: null, className: null,
  periodName: null, unitValue: "40,00", used: "n", usedLabel: "Não", usedDate: null,
  usedTime: null, schoolTripHref: null,
};
const addon = { ...passport, kind: "addon" as const, voucherId: 9002, voucherNumber: "ABC-124", voucherType: "espec", voucherTypeLabel: "Almoço Caipira Buffet" };
const detail: PainelPurchaseDetail = {
  purchaseId: 551, purchaseDate: "06/05/2026", type: "ponli", typeLabel: "Compra", status: "conc",
  statusLabel: "Concluída", paymentLabel: "Cielo 3 - Paga", paymentMethodLabel: "Cartão de crédito",
  paymentDate: "07/05/2026", paymentTime: "14:32:11", totalValue: "120,00", cpf: "12345678901",
  userName: "OPERADOR", referralCode: null, gatewayPaymentId: "pay-551", gatewayStatusCode: "3",
  gatewayStatusLabel: "Paga", vouchers: [passport, addon, { ...addon, voucherId: 9003, voucherNumber: "ABC-125" }],
};
function render(value = detail) {
  return renderToStaticMarkup(<PainelCompraDetailPage detail={value} actorName="WAGNER" actorCpf="00000000191" canManageHistory />);
}

describe("PainelCompraDetailPage", () => {
  it("resume seis campos operacionais e mantém metadados e PDF no financeiro abaixo", () => {
    const html = render();
    const overview = html.match(/<dl[^>]*>(.*?)<\/dl>/)?.[1] ?? "";
    expect([...overview.matchAll(/<dt>(.*?)<\/dt>/g)].map((match) => match[1])).toEqual([
      "Comprador", "Data da visita", "Validade", "Pessoas", "Valor total", "Situação",
    ]);
    expect(overview).toContain("Disponível");
    const financial = html.split("Financeiro")[1];
    expect(financial).toContain("123.456.789-01");
    expect(financial).toContain("06/05/2026");
    expect(financial).toContain("Site");
    expect(financial).toContain("/api/painel/compras/551/resumo");
  });

  it.each([
    { name: "disponível", status: "conc", statusLabel: "Concluída", vouchers: [passport, { ...passport, voucherId: 9004, used: "s" }], label: "Disponível" },
    { name: "utilizada", status: "conc", statusLabel: "Concluída", vouchers: [{ ...passport, used: "s" }], label: "Utilizada" },
    { name: "reagendada", status: "conc", statusLabel: "Concluída", vouchers: [{ ...passport, originalDate: "01/05/2026" }], label: "Reagendada" },
    { name: "cancelada", status: "canc", statusLabel: "Cancelada", vouchers: [{ ...passport, originalDate: "01/05/2026" }], label: "Cancelada" },
    { name: "pendente", status: "pend", statusLabel: "Pendente", vouchers: [passport], label: "Pendente" },
  ])("exibe situação $name da compra sem substituir estado financeiro inativo", ({ status, statusLabel, vouchers, label }) => {
    const html = render({ ...detail, status, statusLabel, vouchers });
    const overview = html.match(/<dl[^>]*>(.*?)<\/dl>/)?.[1] ?? "";
    expect(overview).toMatch(new RegExp(`Situação<\\/dt><dd[^>]*><span[^>]*>${label}<`));
  });

  it("destaca reagendamento sob o cabeçalho com pares de datas e validade reais", () => {
    const html = render({ ...detail, vouchers: [
      { ...passport, originalDate: "01/05/2026", rescheduleReason: "Chuva" },
      { ...passport, voucherId: 9004, originalDate: "02/05/2026", visitDate: "09/05/2026", validUntil: "16/05/2026", rescheduleReason: "Pedido do cliente" },
    ] });
    const header = html.split("<dl")[0];
    expect(header).toContain("Reagendada.");
    expect(header).toContain("Visita original em 01/05/2026");
    expect(header).toContain("Nova data: 08/05/2026");
    expect(header).toContain("Validade: 15/05/2026");
    expect(header).toContain("Visita original em 02/05/2026");
    expect(header).toContain("Nova data: 09/05/2026");
    expect(header).toContain("Validade: 16/05/2026");
    expect(header).toContain("Pedido do cliente");
    expect(render().split("<dl")[0]).not.toContain("Reagendada.");
  });

  it("separa passaportes dos adicionais agregados e conta apenas entradas como pessoas", () => {
    const html = render();
    expect(html).toContain("Compra #551");
    expect(html).toMatch(/Pessoas<\/dt><dd[^>]*>1<\/dd>/);
    const passports = html.split("Vouchers de entrada")[1]?.split("</table>")[0];
    expect(passports).toContain("ABC-123");
    expect(passports).not.toContain("Almoço Caipira Buffet");
    const addons = html.split("Itens comprados junto")[1]?.split("</table>")[0];
    expect(addons).toContain("Almoço Caipira Buffet");
    expect(addons).toMatch(/>2<\/td>/);
    expect(addons).toContain("80,00");
  });

  it("omite campos escolares vazios no B2C, preservando visita, validade e ações legítimas", () => {
    const html = render();
    expect(html).not.toMatch(/>Escola<|>Turma<|>Período</);
    expect(html).toContain("08/05/2026");
    expect(html).toContain("15/05/2026");
    expect(html).toContain("Editar data / validade");
    expect(html).toContain("/api/painel/compras/551/resumo");
    expect(html).toContain("/painel/bilheteria/compras/551/imprimir");
    expect(html).toContain("Enviar por WhatsApp");
    expect(html).toContain("Gerar Resumo");
    expect(html).toContain('aria-label="Status da compra"');
    expect(html).toContain("ID Pagamento");
    expect(html).toContain("pay-551");
    expect(html).toContain("O que aconteceu com esta compra");
  });

  it("mantém passaporte especial de evento nas entradas mesmo quando usa o tipo espec", () => {
    const html = render({ ...detail, vouchers: [{ ...passport, voucherType: "espec", voucherTypeLabel: "Passaporte especial do evento" }, addon] });
    const passports = html.split("Vouchers de entrada")[1]?.split("</table>")[0];
    expect(passports).toContain("Passaporte especial do evento");
    expect(passports).not.toContain("Almoço Caipira Buffet");
    expect(html).toMatch(/Pessoas<\/dt><dd[^>]*>1<\/dd>/);
  });

  it("respeita a classificação do catálogo mesmo quando o código legado diverge", () => {
    const html = render({ ...detail, vouchers: [
      { ...passport, voucherType: "espec", voucherTypeLabel: "Ingresso VIP" },
      { ...addon, voucherType: "norma", voucherTypeLabel: "Kit lanche" },
    ] });
    const passports = html.split("Vouchers de entrada")[1]?.split("</table>")[0];
    expect(passports).toContain("Ingresso VIP");
    expect(passports).not.toContain("Kit lanche");
    const addons = html.split("Itens comprados junto")[1]?.split("</table>")[0];
    expect(addons).toContain("Kit lanche");
    expect(html).toMatch(/Pessoas<\/dt><dd[^>]*>1<\/dd>/);
  });

  it("identifica voucher invalidado sem oferecer movimento ou contá-lo como pessoa ativa", () => {
    const html = render({ ...detail, vouchers: [{ ...passport, used: "inv", usedLabel: "Inválido" }] });
    expect(html).toContain("Inválido");
    expect(html).not.toContain("Disponível");
    expect(html).not.toContain("Editar data / validade");
    expect(html).toMatch(/Pessoas<\/dt><dd[^>]*>0<\/dd>/);
  });

  it("preserva escola, turma, período e link do passeio quando há dados escolares", () => {
    const html = render({ ...detail, vouchers: [{ ...passport, voucherType: "escol", schoolName: "Colégio Estância", className: "7A", periodName: "Manhã", schoolTripHref: "/painel/clientes/passeios/2306/alunos" }] });
    expect(html).toMatch(/>Escola<|>Turma<|>Período</);
    expect(html).toContain("Colégio Estância");
    expect(html).toContain("7A");
    expect(html).toContain("Manhã");
    expect(html).toContain("/painel/clientes/passeios/2306/alunos");
  });

  it("mostra reagendamento e uso sem permitir editar voucher utilizado ou compra pendente", () => {
    const used = render({ ...detail, vouchers: [{ ...passport, originalDate: "01/05/2026", rescheduleReason: "Chuva", used: "s", usedLabel: "Sim", usedDate: "08/05/2026", usedTime: "09:12:00" }] });
    expect(used).toContain("Reagendado de 01/05/2026");
    expect(used).toContain("Chuva");
    expect(used).toContain("09:12:00");
    expect(used).toContain('class="calendar-voucher-used"');
    expect(used).not.toContain("Editar data / validade");
    const pending = render({ ...detail, status: "pend", vouchers: [passport] });
    expect(pending).not.toContain("Editar data / validade");
  });
});
