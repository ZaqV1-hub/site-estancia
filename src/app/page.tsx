import { EstanciaHomePage } from "@/components/estancia-home-page";
import { getActiveHomePageContent } from "@/lib/estancia-content-store";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { heroImages, attractions, events } = await getActiveHomePageContent();

  return (
    <EstanciaHomePage
      heroImages={heroImages}
      attractions={attractions}
      events={events}
    />
  );
}
