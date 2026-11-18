import { notFound, redirect } from "next/navigation";
import { checkoutOrder } from "@/lib/lumi-access";
import { checkoutBase } from "@/lib/lumi-checkout-security";
export const dynamic = "force-dynamic";
export const metadata = { title: "Pagamento · Estância", referrer: "no-referrer" as const };
export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!await checkoutOrder(token)) notFound();
  redirect(checkoutBase(token));
}
