import type { PublicAgendaEvent } from "@/lib/agenda-contracts";

export function parseSelectedAgendaId(value: string | null | undefined) {
  const agendaId = Number(value);

  if (!Number.isInteger(agendaId) || agendaId <= 0) {
    return null;
  }

  return agendaId;
}

export function resolveSelectedAgendaId(
  events: PublicAgendaEvent[],
  value: string | null | undefined,
) {
  const requestedAgendaId = parseSelectedAgendaId(value);

  if (!requestedAgendaId) {
    return null;
  }

  return events.some((event) => event.id === requestedAgendaId)
    ? requestedAgendaId
    : null;
}

export function buildPublicAgendaSelectionHref(
  month: number,
  year: number,
  agendaId: number,
) {
  return `/agenda?mes=${month}&ano=${year}&agendaId=${agendaId}`;
}
