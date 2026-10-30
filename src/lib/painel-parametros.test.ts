import { beforeEach, describe, expect, it, vi } from "vitest";
import { listPainelParametros, savePainelParametros } from "@/lib/painel-parametros";

import { listOpsAdminParameters, updateOpsAdminParameters, type OpsAdminParameterValue } from "@/lib/ops-admin-parameters";

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
    {
      group: "segadm",
      id: "codcash",
      label: "Senha cashback",
      description: "Senha administrativa usada para registrar pagamentos de cashback.",
      defaultValue: "",
      input: "password",
      required: false,
      value: "597924",
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
      {
        key: "segadm",
        label: "Segurança Administrativa",
        items: [
          expect.objectContaining({
            id: "codcash",
            value: "597924",
          }),
        ],
      },
    ]);
  });
});

const encodedMessage = "O c&oacute;digo de indica&ccedil;&atilde;o ##cod## do(a) ##rep## est&aacute; v&aacute;lido";
const displayMessage = "O código de indicação ##cod## do(a) ##rep## está válido";
const legacyParameter: OpsAdminParameterValue = {
  group: "msgper", id: "codval", label: "Código válido", description: "Mensagem",
  defaultValue: encodedMessage, input: "textarea", required: true,
  value: encodedMessage, persisted: true,
};

beforeEach(() => vi.clearAllMocks());

describe("mensagens de parâmetros com entidades legadas", () => {
  it("exibe acentos como texto e preserva placeholders e senha", async () => {
    vi.mocked(listOpsAdminParameters).mockReset().mockResolvedValueOnce([
      legacyParameter,
      { ...legacyParameter, group: "segadm", id: "codcash", input: "password", value: "&aacute;senha" },
    ]);
    const groups = await listPainelParametros();
    expect(groups[0].items[0].value).toBe(displayMessage);
    expect(groups[1].items[0].value).toBe("&aacute;senha");
    expect(updateOpsAdminParameters).not.toHaveBeenCalled();
  });

  it("preserva o valor persistido quando a mensagem exibida não foi editada", async () => {
    vi.mocked(listOpsAdminParameters).mockReset().mockResolvedValueOnce([legacyParameter]);
    await savePainelParametros({ parameters: [{ group: "msgper", id: "codval", value: displayMessage }] });
    expect(updateOpsAdminParameters).toHaveBeenCalledWith({
      actor: undefined,
      parameters: [{ group: "msgper", id: "codval", value: encodedMessage }],
    });
  });

  it("encaminha Unicode editado e senha sem transformação", async () => {
    vi.mocked(listOpsAdminParameters).mockReset().mockResolvedValueOnce([legacyParameter]);
    const parameters = [
      { group: "msgper", id: "codval", value: "Indicação de ##rep##: código ##cod## atualizado" },
      { group: "segadm", id: "codcash", value: "&aacute;senha" },
    ];
    await savePainelParametros({ parameters });
    expect(updateOpsAdminParameters).toHaveBeenCalledWith({ actor: undefined, parameters });
  });

  it.each(["Código já válido ##cod##", "&desconhecida; <b>##rep##</b> &amp;", "&constructor; &Constructor; &#225;"])(
    "preserva Unicode e entidades fora dos acentos: %s", async (value) => {
      vi.mocked(listOpsAdminParameters).mockReset().mockResolvedValueOnce([{ ...legacyParameter, value }]);
      const groups = await listPainelParametros();
      expect(groups[0].items[0].value).toBe(value);
    },
  );
});
