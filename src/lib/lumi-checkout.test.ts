import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
const m = vi.hoisted(() => ({ query: vi.fn(), connect: vi.fn(), create: vi.fn(), lookup: vi.fn(), reconcile: vi.fn(), normalize: vi.fn(), release: vi.fn() }));
vi.mock("@/lib/ingresso-db", () => ({ getIngressoDbPool: () => ({ query: m.query, connect: m.connect }) }));
vi.mock("@/lib/lumi-access", () => ({ lumiEnabled: () => true }));
vi.mock("@/lib/cielo-ecommerce", () => ({ createNativeCieloCheckout: m.create, getNativeCieloCheckoutStatus: m.lookup }));
vi.mock("@/lib/payment-reconciliation", () => ({ normalizePaymentReconciliationPayload: m.normalize, reconcilePaymentFromGatewayPayload: m.reconcile }));
vi.mock("@/lib/cielo-3ds", () => ({ isCielo3dsConfigured: () => false, getCielo3dsTokenData: vi.fn() }));
import { checkoutPayment, checkoutState, loadCheckout } from "./lumi-checkout";
import { checkoutSignature } from "./lumi-checkout-security";
const token = "x".repeat(43);
let order: Record<string, unknown>;
const request = (origin = "https://checkout.example", extra = {}) => new Request("https://upstream.example/api", {method:"POST", headers:{"content-type":"application/json",origin}, body: JSON.stringify({method:"pix",security_token:checkoutSignature("csrf:"+token),...extra})});
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("LUMI_COMMERCE_SECRET", "s".repeat(40)); vi.stubEnv("LUMI_TENANT_ID", "tenant-test");
  vi.stubEnv("LUMI_CHECKOUT_PUBLIC_BASE_URL", "https://checkout.example/checkout/demo");
  order={token,purchase_id:42,cpf:"00000000000",buyer:{name:"Example",phone:"00000000000"},stcompra:"pend",expires_at:new Date(Date.now()+3600000),selection:{date:"2030-01-01",summary:{totalValue:"50.00",lines:[{title:"Example",quantity:1,unitPrice:"50.00"}]}},payment_attempt:null};
  m.connect.mockResolvedValue({query:m.query,release:m.release});
  m.query.mockImplementation(async (sql: string, args: unknown[]) => {
    if (sql.includes("try_advisory")) return {rows:[{locked:true}]};
    if (sql.startsWith("UPDATE")) { order.payment_attempt=JSON.parse(String(args[1])); return {rows:[]}; }
    if (sql.startsWith("SELECT o.*")) return {rows:[{...order}]};
    return {rows:[]};
  });
  m.normalize.mockReturnValue({purchaseId:42,grossAmount:"50.00",purchaseStatus:"pend",gatewayPaymentId:"payment-test",paymentMethodType:11});
  m.create.mockResolvedValue({status:"00",sale:{Payment:{QRCodeString:"example-pix",QRCodeBase64Image:"YWJj"}}});
  m.lookup.mockResolvedValue({status:"30"});
});
afterEach(() => vi.unstubAllEnvs());
describe("Lumi payment checkout", () => {
  it("only reads on open, masks identity and limits the tenant query", async () => {
    const data=await checkoutState(token);
    expect(data?.state).toBe("ready"); expect(JSON.stringify(data)).not.toContain("00000000000");
    expect(m.query.mock.calls[0][1]).toEqual([token,"tenant-test"]);
    expect(m.create).not.toHaveBeenCalled(); expect(m.lookup).not.toHaveBeenCalled();
    expect(await loadCheckout("invalid")).toBeNull();
  });
  it("reserves intent before payment and returns the same Pix after repeated submission", async () => {
    const first=await checkoutPayment(request(),token,"pay");
    expect((await first.json()).qr_code).toBe("example-pix");
    await checkoutPayment(request(),token,"pay");
    expect(m.create).toHaveBeenCalledTimes(1);
    expect(m.create.mock.calls[0][0]).toMatchObject({purchaseId:42,amount:50,payment:{Type:"Pix"}});
    expect(m.reconcile).toHaveBeenCalledTimes(1);
  });
  it("never retries a payment after an uncertain gateway outcome", async () => {
    m.create.mockRejectedValue(new Error("network"));
    expect((await (await checkoutPayment(request(),token,"pay")).json()).state).toBe("unknown");
    await checkoutPayment(request(),token,"pay"); await checkoutState(token);
    expect(m.create).toHaveBeenCalledTimes(1); expect(m.lookup).toHaveBeenCalledTimes(1);
  });
  it("refuses CSRF, expired orders, unavailable debit and competing writes", async () => {
    await expect(checkoutPayment(request("https://other.example"),token,"pay")).rejects.toThrow();
    await expect(checkoutPayment(request(undefined,{security_token:"invalid"}),token,"pay")).rejects.toThrow();
    await expect(checkoutPayment(request(undefined,{method:"debit"}),token,"authenticate")).rejects.toThrow();
    order.expires_at=new Date(0);
    expect((await checkoutPayment(request(),token,"pay")).status).toBe(404);
    m.query.mockResolvedValueOnce({rows:[{locked:false}]});
    expect((await checkoutPayment(request(),token,"pay")).status).toBe(409);
    expect(m.create).not.toHaveBeenCalled();
  });
  it("does not charge an order with a payment in the old checkout", async () => {
    const previous=m.query.getMockImplementation()!;
    m.query.mockImplementation(async (sql,args)=>sql.includes("FROM pagpagseguro")?{rows:[{}]}:previous(sql,args));
    await checkoutPayment(request(),token,"pay"); expect(m.create).not.toHaveBeenCalled();
  });
});
