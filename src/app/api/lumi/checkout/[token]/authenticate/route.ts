import { checkoutPayment, checkoutHeaders } from "@/lib/lumi-checkout";
export const runtime = "nodejs";
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  try { return await checkoutPayment(request, token, "authenticate"); }
  catch { return Response.json({error:"Não foi possível continuar. Confira os dados ou volte à conversa com a Lumi."}, {status:400,headers:checkoutHeaders}); }
}
