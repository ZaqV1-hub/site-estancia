import React, { type ReactElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PainelCompraRefund, type RefundState } from "./painel-compra-refund";
import { PainelModal } from "./painel-modal";

const hooks = vi.hoisted(() => ({ values: [] as unknown[], cursor: 0, refresh: vi.fn() }));
// The repository runs Node tests without a DOM. Keep hook values between renders
// to exercise the component's handlers and request contract without a browser.
vi.mock("react", async importOriginal => ({
  ...await importOriginal<typeof import("react")>(),
  useState: (initial: unknown) => {
    const slot = hooks.cursor++;
    if (!(slot in hooks.values)) hooks.values[slot] = initial;
    return [hooks.values[slot], (value: unknown) => { hooks.values[slot] = value; }];
  },
  useRef: (initial: unknown) => {
    const slot = hooks.cursor++;
    if (!(slot in hooks.values)) hooks.values[slot] = { current: initial };
    return hooks.values[slot];
  },
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: hooks.refresh }) }));

type Element = ReactElement<Record<string, unknown>>;
function elements(node: ReactNode): Element[] {
  if (!React.isValidElement<Record<string, unknown>>(node)) return [];
  return [node, ...React.Children.toArray(node.props.children as ReactNode).flatMap(elements)];
}
function render(refundState: RefundState = null, reconciliationPending = false) {
  hooks.cursor = 0;
  const tree = PainelCompraRefund({ purchaseId: 551, totalValue: "120,00", refundState, reconciliationPending });
  const nodes = elements(tree);
  return {
    node: (type: unknown) => nodes.find(node => node.type === type)!,
    button: (label: string) => nodes.find(node => node.type === "button" && node.props.children === label),
    text: nodes.flatMap(node => React.Children.toArray(node.props.children as ReactNode).filter(child => typeof child === "string")).join(" "),
  };
}
function enterReason(reason = "Solicitado pelo comprador") {
  (render().node("textarea").props.onChange as (event: unknown) => void)({ target: { value: reason } });
}
function submit() {
  (render().node("form").props.onSubmit as (event: unknown) => void)({ preventDefault() {} });
}
const fetchMock = vi.fn();
beforeEach(() => {
  hooks.values = [];
  hooks.cursor = 0;
  hooks.refresh.mockReset();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("PainelCompraRefund", () => {
  it("allows consultation of confirmed refunds until downstream reconciliation finishes", async () => {
    fetchMock.mockResolvedValue(Response.json({ status: "confirmed", message: "Estorno confirmado.", reconciliationPending: true }));
    enterReason();
    submit();
    await vi.waitFor(() => expect(render().text).toContain("Estorno confirmado"));
    expect(render().button("Estornar valor total")).toBeUndefined();
    expect(render().button("Consultar estorno")).toBeDefined();
    fetchMock.mockResolvedValue(Response.json({ status: "confirmed", message: "Processamento concluído.", reconciliationPending: false }));
    (render().button("Consultar estorno")!.props.onClick as () => void)();
    await vi.waitFor(() => expect(render().text).toContain("Processamento concluído."));
    expect(render().button("Consultar estorno")).toBeUndefined();
  });

  it("preserves a durable financial confirmation if reconciliation lookup fails", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    (render("refunded", true).button("Consultar estorno")!.props.onClick as () => void)();
    await vi.waitFor(() => expect(render("refunded", true).button("Consultar estorno")).toBeDefined());
    expect(render("refunded", true).text).toContain("Estorno confirmado");
    expect(render("refunded", true).button("Estornar valor total")).toBeUndefined();
    expect(fetchMock.mock.calls[0][1].body).toBe(JSON.stringify({ purchaseId: 551, consult: true }));
  });

  it("requires a reason and explicit confirmation before sending the full-refund request", async () => {
    (render().button("Estornar valor total")!.props.onClick as () => void)();
    expect(render().node(PainelModal).props.open).toBe(true);
    expect(render().text).toContain("120,00");
    enterReason("   ");
    submit();
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockResolvedValue(Response.json({ status: "confirmed", message: "Pagamento estornado." }));
    enterReason("  Solicitação do cliente  ");
    submit();
    submit();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/painel/compras/estorno", expect.objectContaining({
      method: "POST", body: JSON.stringify({ purchaseId: 551, reason: "Solicitação do cliente" }),
    }));
    await vi.waitFor(() => expect(render().text).toContain("Estorno confirmado"));
    expect(render().button("Estornar valor total")).toBeUndefined();
    expect(render().button("Consultar estorno")).toBeUndefined();
    expect(hooks.refresh).toHaveBeenCalledTimes(1);
  });

  it("blocks modal cancellation while sending and never retries a failed request", async () => {
    let rejectRequest!: (reason: Error) => void;
    fetchMock.mockReturnValue(new Promise((_, reject) => { rejectRequest = reject; }));
    (render().button("Estornar valor total")!.props.onClick as () => void)();
    enterReason();
    submit();
    (render().node(PainelModal).props.onClose as () => void)();
    expect(render().node(PainelModal).props.open).toBe(true);
    rejectRequest(new Error("connection lost"));
    await vi.waitFor(() => expect(render().button("Consultar estorno")).toBeDefined());
    submit();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(render().button("Estornar valor total")).toBeUndefined();
    expect(hooks.refresh).not.toHaveBeenCalled();
    fetchMock.mockResolvedValue(Response.json({ status: "pending", message: "Aguardando confirmação." }));
    (render().button("Consultar estorno")!.props.onClick as () => void)();
    await vi.waitFor(() => expect(render().text).toContain("Aguardando confirmação."));
    expect(fetchMock.mock.calls[1][1].body).toBe(JSON.stringify({ purchaseId: 551, consult: true }));
  });

  it.each([
    { message: "Não autorizado." },
    { error: { message: "Não autorizado." } },
  ])("shows HTTP error messages without allowing another refund request: %j", async body => {
    fetchMock.mockResolvedValue(Response.json(body, { status: 403 }));
    enterReason();
    submit();
    await vi.waitFor(() => expect(render().text).toContain("Não autorizado."));
    expect(render().button("Estornar valor total")).toBeUndefined();
    expect(render().button("Consultar estorno")).toBeDefined();
  });

  it.each(["pending", "uncertain"] as const)("only consults a durable %s refund, without requesting a reason", async state => {
    fetchMock.mockResolvedValue(Response.json({ status: "denied", message: "Não aceito pela operadora." }));
    const view = render(state);
    expect(view.button("Estornar valor total")).toBeUndefined();
    (view.button("Consultar estorno")!.props.onClick as () => void)();
    await vi.waitFor(() => expect(render(state).text).toContain("Não aceito pela operadora."));
    expect(fetchMock.mock.calls[0][1].body).toBe(JSON.stringify({ purchaseId: 551, consult: true }));
    expect(render(state).button("Consultar estorno")).toBeUndefined();
  });
});
