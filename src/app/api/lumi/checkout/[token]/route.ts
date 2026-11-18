import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { loadCheckout, checkoutHeaders } from "@/lib/lumi-checkout";
import { checkoutHtml } from "@/lib/lumi-checkout-html";
import { checkoutBase } from "@/lib/lumi-checkout-security";
export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!await loadCheckout(token)) return new Response("Link indisponível", { status: 404, headers: checkoutHeaders });
  const logo = await readFile(join(process.cwd(), "public/brand/estancia-logo-dark.png"));
  const html = checkoutHtml.replaceAll("__TOKEN__", token).replace("__BASE__", new URL(checkoutBase(token)).pathname).replace("__LOGO__", "data:image/png;base64," + logo.toString("base64"));
  return new Response(html, { headers: { ...checkoutHeaders, "Content-Type": "text/html; charset=utf-8",
    "Content-Security-Policy": "default-src 'self'; script-src 'self' https://mpi.braspag.com.br https://mpisandbox.braspag.com.br https://*.cardinalcommerce.com https://*.cardinaltrusted.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://mpi.braspag.com.br https://mpisandbox.braspag.com.br https://*.cardinalcommerce.com https://*.cardinaltrusted.com; frame-src https:; frame-ancestors 'none'; base-uri 'none'; form-action 'self' https:" } });
}
