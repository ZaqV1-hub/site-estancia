import type { Metadata } from "next";
import { PainelHomePage } from "@/components/painel-home-page";
import { loadPainelHomePageData } from "@/lib/painel-home";
import { requirePainelSession } from "@/lib/painel-session";

export const metadata: Metadata = {
  title: "Painel - Home | Clube Rincao",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

export default async function PainelHomeRoute() {
  await requirePainelSession("/painel");
  const data = await loadPainelHomePageData();

  return <PainelHomePage data={data} />;
}
