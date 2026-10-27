import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { inflateSync } from "node:zlib";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as pdfRenderer from "@react-pdf/renderer";
import { renderPainelPurchaseSummaryPdf } from "@/lib/painel-purchase-summary-pdf";
import type { PainelPurchaseDetail } from "@/lib/painel-compras";

vi.mock("@react-pdf/renderer", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@react-pdf/renderer")>();
  return { ...actual, renderToBuffer: vi.fn().mockResolvedValue(Buffer.from("%PDF-test")) };
});

const summaryFixture: PainelPurchaseDetail = {
  purchaseId: 42, purchaseDate: "27/10/2026", type: "ponli", typeLabel: "Compra no site",
  status: "conc", statusLabel: "Concluída", userName: "Ana da Silva", cpf: "12345678901",
  paymentLabel: "Cielo - Pago", paymentMethodLabel: "Pix", paymentDate: "27/10/2026",
  paymentTime: "10:00", totalValue: "100,00", referralCode: null,
  gatewayPaymentId: "gateway-123456789", gatewayStatusCode: "2", gatewayStatusLabel: "Pago",
  vouchers: [{
    voucherId: 9, voucherNumber: "A123", voucherType: "norma", voucherTypeLabel: "Passaporte Explorador",
    visitDate: "01/11/2026", validUntil: "07/11/2026", originalDate: "31/10/2026",
    unitValue: "100,00", used: "n", usedLabel: "Não", usedDate: null, usedTime: null,
    schoolName: null, className: null, periodName: null, schoolTripHref: null,
  }],
};

function documentText(node: ReactNode): string {
  if (Array.isArray(node)) return node.map(documentText).join(" ");
  if (!isValidElement<{ children?: ReactNode }>(node)) return typeof node === "string" || typeof node === "number" ? String(node) : "";
  if (typeof node.type === "function") return documentText((node.type as (props: unknown) => ReactNode)(node.props));
  return documentText(node.props.children);
}

async function summaryText(detail: PainelPurchaseDetail) {
  // Inspect the real document's content; replace only the final binary renderer.
  await renderPainelPurchaseSummaryPdf(detail);
  return documentText(vi.mocked(pdfRenderer.renderToBuffer).mock.lastCall![0]);
}

function drawnPdfText(pdf: Buffer) {
  let text = "";
  for (const stream of pdf.toString("latin1").matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
    let content: string;
    try { content = inflateSync(Buffer.from(stream[1], "latin1")).toString("latin1"); }
    catch { continue; }
    for (const run of content.matchAll(/\[([^\]]*)\]\s*TJ/g)) {
      for (const hex of run[1].matchAll(/<([\da-f]+)>/gi)) text += Buffer.from(hex[1], "hex").toString("latin1");
    }
  }
  return text;
}

describe("purchase summary PDF", () => {
  beforeEach(() => vi.mocked(pdfRenderer.renderToBuffer).mockClear());

  it("renders an actual PDF with customer and rescheduled vouchers", async () => {
    await renderPainelPurchaseSummaryPdf(summaryFixture);
    const actual = await vi.importActual<typeof import("@react-pdf/renderer")>("@react-pdf/renderer");
    const pdf = await actual.renderToBuffer(vi.mocked(pdfRenderer.renderToBuffer).mock.lastCall![0]);
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
    expect(pdf.byteLength).toBeGreaterThan(1000);
  });

  it("includes the student and school details for school tickets", async () => {
    const text = await summaryText({ ...summaryFixture, vouchers: [{
      ...summaryFixture.vouchers[0], voucherType: "escol", voucherTypeLabel: "Passaporte Escolar",
      schoolName: "Escola Primavera", studentName: "Beatriz da Silva", className: "5º A", periodName: "Manhã",
    }] });
    expect(text).toContain("Escola Primavera");
    expect(text).toContain("Beatriz da Silva");
    expect(text).toContain("5º A");
    expect(text).toContain("Manhã");
  });

  it("keeps the full payment ID, voucher code, validity and rescheduling in Day use", async () => {
    const code = "DAYUSE-ABCDEFGHIJKLMNOPQRSTUVWXYZ-1234567890";
    const paymentId = "gateway-ABCDEFGHIJKLMNOPQRSTUVWXYZ-1234567890-ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const text = await summaryText({ ...summaryFixture, gatewayPaymentId: paymentId,
      vouchers: [{ ...summaryFixture.vouchers[0], voucherNumber: code }] });
    expect(text).toContain(paymentId);
    expect(text).toContain(code);
    expect(text).toContain("07/11/2026");
    expect(text).toContain("31/10/2026");
    expect(text).toContain("01/11/2026");
    expect(text).not.toContain("ALUNO");
    expect(text).toContain("Não substitui documento fiscal.");
  });

  it.each([
    ["pend", "Em processamento", "AGUARDANDO CONFIRMAÇÃO"],
    ["canc", "Cancelada", "INDISPONÍVEL"],
  ])("does not mark unused vouchers available for a %s purchase", async (status, statusLabel, expected) => {
    const text = await summaryText({ ...summaryFixture, status, statusLabel });
    expect(text).toContain(expected);
    expect(text).not.toContain("NÃO USADO");
  });

  it.each([
    ["canc", "Cancelada", "#9a402c"],
    ["unknown", "Status desconhecido", "#657068"],
  ])("uses the financial status color for a %s purchase", async (status, statusLabel, expectedColor) => {
    await summaryText({ ...summaryFixture, status, statusLabel });
    const colors: unknown[] = [];
    function collectStatusColors(node: ReactNode) {
      if (Array.isArray(node)) { node.forEach(collectStatusColors); return; }
      if (!isValidElement<{ children?: ReactNode; style?: { color?: string }[] }>(node)) return;
      if (typeof node.type === "function") {
        collectStatusColors((node.type as (props: unknown) => ReactNode)(node.props));
        return;
      }
      if (node.props.children === statusLabel && Array.isArray(node.props.style)) {
        colors.push(node.props.style?.at(-1)?.color);
      }
      collectStatusColors(node.props.children);
    }
    collectStatusColors(vi.mocked(pdfRenderer.renderToBuffer).mock.lastCall![0]);
    expect(colors).toContain(expectedColor);
  });

  it("distinguishes invalid vouchers and records use without counting invalid tickets as used", async () => {
    const text = await summaryText({ ...summaryFixture, vouchers: [
      { ...summaryFixture.vouchers[0], used: "s", usedLabel: "Sim", usedDate: "01/11/2026", usedTime: "09:35:12" },
      { ...summaryFixture.vouchers[0], voucherId: 10, used: "inv", usedLabel: "Não" },
    ] });
    expect(text).toContain("INVÁLIDO");
    expect(text).toContain("09:35:12");
    expect(text).toContain("1 de 2 ingressos");
    expect(text).not.toContain("Todos os ingressos");
  });

  it("reports an empty purchase without a used-ticket warning", async () => {
    const text = await summaryText({ ...summaryFixture, vouchers: [] });
    expect(text).toContain("Nenhum voucher vinculado a esta compra.");
    expect(text).not.toContain("INGRESSOS JÁ UTILIZADOS");
  });

  it("warns when every ticket has already been used", async () => {
    const text = await summaryText({ ...summaryFixture, vouchers: [{
      ...summaryFixture.vouchers[0], used: "s", usedLabel: "Sim", usedDate: "01/11/2026", usedTime: "09:35:12",
    }] });
    expect(text).toContain("INGRESSOS JÁ UTILIZADOS");
    expect(text).toContain("Todos os ingressos desta compra já foram utilizados.");
  });

  it("renders multiple pages for many school tickets with long names and codes", async () => {
    const detail = { ...summaryFixture, vouchers: Array.from({ length: 35 }, (_, index) => ({
      ...summaryFixture.vouchers[0], voucherId: index + 1, voucherType: "escol",
      voucherNumber: `ESCOLAR${String(index).padStart(3, "0")}${"ABCDEFGH".repeat(8)}`,
      schoolName: "Escola Municipal de Educação Integral Professora Maria de Lourdes da Silva",
      studentName: "Ana Beatriz de Albuquerque e Vasconcelos da Silva Santos", className: "5º ano A", periodName: "Integral",
    })) };
    const text = await summaryText(detail);
    expect(text).toContain(detail.vouchers[34].voucherNumber);
    expect(text).toContain(detail.vouchers[34].studentName);
    const actual = await vi.importActual<typeof import("@react-pdf/renderer")>("@react-pdf/renderer");
    const summary = vi.mocked(pdfRenderer.renderToBuffer).mock.lastCall![0];
    const document = (summary.type as (props: unknown) => ReactElement<pdfRenderer.DocumentProps>)(summary.props);
    type LayoutNode = { children?: LayoutNode[]; box: { top: number; height: number }; props?: { fixed?: boolean }; value?: string };
    let pages: LayoutNode[] = [];
    const pdf = await actual.renderToBuffer(cloneElement(document, { onRender(props) {
      pages = (props as unknown as { _INTERNAL__LAYOUT__DATA_: { children: LayoutNode[] } })._INTERNAL__LAYOUT__DATA_.children;
    } }));
    expect((pdf.toString("latin1").match(/\/Type \/Page\b/g) || []).length).toBeGreaterThan(1);
    function layoutText(node: LayoutNode): string { return node.value ?? node.children?.map(layoutText).join("") ?? ""; }
    expect(pages.length).toBeGreaterThan(1);
    const drawnText = drawnPdfText(pdf);
    expect(drawnText).toContain("Não substitui documento fiscal.");
    for (const [index, page] of pages.entries()) {
      const footer = page.children?.find((node) => node.props?.fixed);
      expect(footer).toBeDefined();
      expect(footer!.box.top).toBeGreaterThanOrEqual(page.box.height - 60);
      expect(footer!.box.top + footer!.box.height).toBeLessThanOrEqual(page.box.height);
      expect(layoutText(footer!)).toContain("Não substitui documento fiscal.");
      expect(layoutText(footer!)).toContain("Página");
      expect(drawnText).toContain(`Página ${index + 1} de ${pages.length}`);
    }
  });
});
