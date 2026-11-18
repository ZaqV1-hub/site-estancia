import { checkoutState, checkoutHeaders } from "@/lib/lumi-checkout";
export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const state = await checkoutState(token);
  return state ? Response.json(state, { headers: checkoutHeaders }) : Response.json({error:"Link indisponível"}, {status:404,headers:checkoutHeaders});
}
