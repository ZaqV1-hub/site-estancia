import { EstanciaHomePage } from "@/components/estancia-home-page";
import {
  getActiveAttractions,
  getActiveEvents,
  getActiveHomeImages,
} from "@/lib/estancia-content-store";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <EstanciaHomePage
      heroImages={getActiveHomeImages()}
      attractions={getActiveAttractions()}
      events={getActiveEvents()}
    />
  );
}
