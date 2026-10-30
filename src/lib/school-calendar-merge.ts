import type { CalendarMonth } from "./operational-calendar-contracts";
import type { SchoolTripSummary } from "./b2b-school-calendar";
export function mergeSchoolCalendarDays(days:CalendarMonth['days'], trips:SchoolTripSummary[]):CalendarMonth['days'] {
  const merged=new Map(days.map(day=>[day.date,{...day,schoolTrips:[] as SchoolTripSummary[]}]));
  for(const trip of trips){
    let day=merged.get(trip.date);
    if(!day){day={date:trip.date,b2bOnly:true,schoolTrips:[],
      rule:{agendaId:0,date:trip.date,type:'dayuse',status:'abe',validity:'day',configured:false,passportIds:[],addonIds:[],eventId:null,eventTitle:null},
      summary:{people:0,purchases:0,addons:0,revenueCents:0,siteCents:0,boxOfficeCents:0,rescheduled:0,passports:[],addonItems:[]}};merged.set(trip.date,day);}
    day.schoolTrips.push(trip);
  }
  return [...merged.values()].sort((a,b)=>a.date.localeCompare(b.date));
}
