export const schoolTripLocalHref=(trip:{agendaId:number;clientId:number})=>`/painel/agenda/escolares/${trip.agendaId}/${trip.clientId}`;
export const schoolTripB2BHref=(trip:{agendaId:number;clientId:number})=>`https://estancia.ecologicodasaguas.brevia.company/painel/clientes/detalhe-passeio/idagenda/${trip.agendaId}/idcliente/${trip.clientId}`;
