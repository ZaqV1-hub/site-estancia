import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PainelBilheteriaPageHeader } from "@/components/painel-bilheteria-page-header";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

describe("PainelBilheteriaPageHeader", () => {
  it("renders the full legacy action surface for managers", () => {
    const html = renderToStaticMarkup(
      React.createElement(PainelBilheteriaPageHeader, {
        current: "overview",
        isManager: true,
        title: "Bilheteria",
        description: "Descricao",
      }),
    );

    expect(html).toContain("Vendas");
    expect(html).toContain("Fechamento de Caixa");
    expect(html).toContain("Fundo de Caixa");
    expect(html).toContain("Histórico de Vendas");
    expect(html).toContain("Consultar Ingresso");
    expect(html).not.toContain("Voltar ao Painel");
  });
});
