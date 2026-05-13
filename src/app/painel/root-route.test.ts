import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

  it("renders the authenticated painel home instead of redirecting to login", async () => {
    requirePainelSession.mockResolvedValue({
      actorName: "Operador Teste",
      actorCpf: "52998224725",
      role: "operator",
      permissions: ["ops.read", "ops.vouchers", "ops.purchases", "ops.cash"],
      legacyRoleId: 2,
      legacyRoleName: "Funcionario",
      legacyResources: ["vis_bilhet", "vis_compra"],
    });
    loadPainelHomePageData.mockResolvedValue({
      emailErrorCount: 9,
      urls: [],
    });

    const page = (await import("@/app/painel/(protected)/page")).default;
    const element = await page();
    const html = renderToStaticMarkup(React.createElement(React.Fragment, null, element));

    expect(requirePainelSession).toHaveBeenCalledWith("/painel");
    expect(loadPainelHomePageData).toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
    expect(html).toContain("Home");
    expect(html).toContain("9 e-mail(s) com erro de envio");
  });
});
