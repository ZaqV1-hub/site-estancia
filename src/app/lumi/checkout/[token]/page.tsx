import { notFound } from "next/navigation";
import { CustomerCheckoutPage } from "@/components/customer-checkout-page";
import { checkoutOrder } from "@/lib/lumi-access";
import { getUserVoucherPurchaseById } from "@/lib/voucher-repository";
import { resolveCheckoutMode } from "@/lib/checkout-mode";
import { isCielo3dsConfigured } from "@/lib/cielo-3ds";
import { formatCpf } from "@/lib/cpf";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pagamento · Estância", referrer: "no-referrer" as const };
export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const order = await checkoutOrder(token);
  if (!order) notFound();
  const purchase = await getUserVoucherPurchaseById(order.cpf, order.purchase_id);
  if (!purchase || purchase.status === "canc") notFound();
  return <CustomerCheckoutPage mode={resolveCheckoutMode()} purchase={purchase}
    user={{ name: order.buyer.name, cpfMasked: formatCpf(order.cpf).replace(/^.{11}/, "***.***.***"), email: order.buyer.email }}
    customer={order.buyer} returnUrl={`/lumi/checkout/${token}`} threeDsEnabled={isCielo3dsConfigured()} lumiToken={token} />;
}
