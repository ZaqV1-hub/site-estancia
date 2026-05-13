import type { Metadata } from "next";
import { PainelBilheteriaPageHeader } from "@/components/painel-bilheteria-page-header";
import { PainelBilheteriaWorkstation } from "@/components/painel-bilheteria-workstation";
import {
  lookupPainelBilheteriaTicketByVoucherId,
  type PainelBilheteriaTicketLookupResult,
  type PainelBilheteriaWorkstationError,
} from "@/lib/painel-bilheteria-workstation";
import { requirePainelAccess } from "@/lib/painel-session";

export const metadata: Metadata = {
  title: "Painel - Bilheteria | Estancia",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

export default async function PainelBilheteriaPage({
  searchParams,
}: {
  searchParams: Promise<{
    consult?: string;
    ingresso?: string;
  }>;
}) {
  const session = await requirePainelAccess(
    ["vis_bilhet", "vis_compra"],
    "/painel/bilheteria",
  );
  const params = await searchParams;
  let initialTicketLookupState:
    | {
        isOpen: boolean;
        lookup: string;
        result: PainelBilheteriaTicketLookupResult | null;
        error: string | null;
      }
    | undefined;

  if (params.consult === "1" || params.ingresso) {
    const lookup = String(params.ingresso ?? "").trim();
    let result: PainelBilheteriaTicketLookupResult | null = null;
    let error: string | null = null;

    if (lookup) {
      try {
        result = await lookupPainelBilheteriaTicketByVoucherId(lookup);
      } catch (cause) {
        error =
          cause &&
          typeof cause === "object" &&
          "message" in cause &&
          typeof (cause as PainelBilheteriaWorkstationError).message === "string"
            ? (cause as PainelBilheteriaWorkstationError).message
            : "Nao foi possivel consultar este ingresso agora.";
      }
    }

    initialTicketLookupState = {
      isOpen: true,
      lookup,
      result,
      error,
    };
  }

  return (
    <div className="grid gap-5">
      <PainelBilheteriaPageHeader
        current="overview"
        isManager={session.legacyRoleId === 1}
        title="Bilheteria"
        description="Posto operacional da bilheteria, com validação por voucher, consulta por cliente, leitura de passeio e consulta rápida do histórico."
        actorName={session.actorName}
      />

      <PainelBilheteriaWorkstation
        actorName={session.actorName}
        actorCpf={session.actorCpf}
        isManager={session.legacyRoleId === 1}
        initialTicketLookupState={initialTicketLookupState}
      />
    </div>
  );
}
