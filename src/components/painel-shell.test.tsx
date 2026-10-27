import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PainelShell } from "./painel-shell";
import { getLegacyPanelResources } from "@/lib/painel-access";

vi.mock("next/navigation", () => ({ usePathname: () => "/painel/agenda", useRouter: () => ({ back: vi.fn(), push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }) }));
describe("calendar panel shell", () => {
  it("lets employees reach the calendar and removes the duplicate overview", () => {
    const html = renderToStaticMarkup(<PainelShell actorName="Operadora" actorCpf={null} role="operator" permissions={[]} legacyRoleId={2} legacyResources={getLegacyPanelResources(2)}>Conteúdo</PainelShell>);
    expect(html).toContain('href="/painel/agenda"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("Encerrar sessão");
    expect(html).toContain("Abrir menu");
    expect(html).not.toContain("Visão geral");
    const navigation = html.match(/<nav[^>]*>([\s\S]*?)<\/nav>/)?.[1] ?? "";
    expect(navigation.indexOf('href="/painel/agenda"')).toBeLessThan(navigation.indexOf('href="/painel/site"'));
    expect(navigation).toContain("Início");
  });
  it("preserves ticket-only navigation restrictions", () => {
    const html = renderToStaticMarkup(<PainelShell actorName="Bilheteiro" actorCpf={null} role="operator" permissions={[]} legacyRoleId={3} legacyResources={getLegacyPanelResources(3)}>Conteúdo</PainelShell>);
    expect(html).toContain('href="/painel/bilheteria"');
    expect(html).not.toContain('href="/painel/agenda"');
    expect(html).not.toContain('href="/painel/compras"');
  });
});
