import { describe, expect, it, vi } from "vitest";
import { listPainelParametros } from "@/lib/painel-parametros";

vi.mock("@/lib/ops-admin-parameters", () => ({
  listOpsAdminParameters: vi.fn(async () => [
    {
      group: "msgper",
      id: "codval",
      label: "Codigo valido",
      description: "Mensagem exibida quando um codigo de indicacao valido e aplicado.",
      defaultValue: "padrao",
      input: "textarea",
      required: true,
      value: "valor atual",
      persisted: true,
    },
  ]),
  updateOpsAdminParameters: vi.fn(),
  asOpsAdminParametersError: vi.fn((error: unknown) => error),
}));

describe("painel-parametros", () => {
  it("agrupa os parametros do legado por grupo", async () => {
    const result = await listPainelParametros();

    expect(result).toEqual([
      {
        key: "msgper",
        label: "Mensagem Personalizada",
        items: [
          expect.objectContaining({
            id: "codval",
            value: "valor atual",
          }),
        ],
      },
    ]);
  });
});
