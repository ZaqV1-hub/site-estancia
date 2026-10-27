import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderToStaticMarkup } from "react-dom/server";

const redirect = vi.fn();
const requirePainelSession = vi.fn();
const loadPainelHomePageData = vi.fn();

vi.mock("next/navigation", () => ({
  redirect,
}));

vi.mock("@/lib/painel-session", () => ({
  requirePainelSession,
}));

vi.mock("@/lib/painel-home", () => ({
  loadPainelHomePageData,
}));

describe("/painel root route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([1, 2])("redirects manager and employee role %s to the calendar", async (roleId) => {
    requirePainelSession.mockResolvedValue({
      actorName: "Operador Teste",
      actorCpf: "52998224725",
      role: "operator",
      permissions: ["ops.read", "ops.vouchers", "ops.purchases", "ops.cash"],
      legacyRoleId: roleId,
      legacyRoleName: "Funcionario",
      legacyResources: ["vis_agenda", "vis_bilhet", "vis_compra"],
    });
    const page = (await import("@/app/painel/(protected)/page")).default;
    await page();

    expect(requirePainelSession).toHaveBeenCalledWith("/painel");
    expect(loadPainelHomePageData).not.toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith("/painel/agenda");
  });

  it("redirects box office users directly to the bilheteria module", async () => {
    requirePainelSession.mockResolvedValue({
      actorName: "Caixa Teste",
      actorCpf: "52998224725",
      role: "operator",
      permissions: ["ops.read", "ops.vouchers", "ops.purchases", "ops.cash"],
      legacyRoleId: 3,
      legacyRoleName: "Bilheteria",
      legacyResources: ["vis_bilhet"],
    });

    const page = (await import("@/app/painel/(protected)/page")).default;
    await page();

    expect(redirect).toHaveBeenCalledWith("/painel/bilheteria");
    expect(loadPainelHomePageData).not.toHaveBeenCalled();
  });
  it("shows an explicit empty state when no allowed module remains",async()=>{
    requirePainelSession.mockResolvedValue({legacyRoleId:2,legacyResources:[]});
    const page=(await import("@/app/painel/(protected)/page")).default;
    const html=renderToStaticMarkup(await page());
    expect(redirect).not.toHaveBeenCalled();
    expect(html).toContain("Nenhum módulo disponível");
  });
  it("uses an allowed module instead of looping when agenda access is revoked",async()=>{
    requirePainelSession.mockResolvedValue({legacyRoleId:2,legacyResources:["vis_compra"]});
    const page=(await import("@/app/painel/(protected)/page")).default;
    await page();
    expect(redirect).toHaveBeenCalledWith("/painel/compras");
  });
});
