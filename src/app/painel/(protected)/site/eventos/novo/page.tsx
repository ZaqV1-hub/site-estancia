import { OperationalEventEditor } from "@/components/operational-event-editor";
import { readEstanciaContent } from "@/lib/estancia-content-store";
import { requirePainelAccess } from "@/lib/painel-session";
export const dynamic = "force-dynamic";
export default async function NewEventPage({ searchParams }: {
    searchParams: Promise<{
        dia?: string;
        from?: string;
    }>;
}) {
    await requirePainelAccess(["vis_info", "vis_param"], "/painel/site/eventos/novo");
    const params = await searchParams;
    const content = await readEstanciaContent();
    return <OperationalEventEditor products={content.products} initialDate={params.dia ?? ""} fromCalendar={params.from === "calendar"}/>;
}
