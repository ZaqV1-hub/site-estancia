import type { CalendarPurchase } from "./operational-calendar-contracts";
export function filterCalendarPurchases(purchases:CalendarPurchase[],search:string,origin:"all"|"site"|"bilheteria") {
  const normalize=(value:string)=>value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  const query=normalize(search.trim());
  return purchases.filter(p=>(origin==="all"||p.origin===origin)&&(!query||normalize(`${p.id} ${p.customerName} ${p.customerId}`).includes(query)));
}
