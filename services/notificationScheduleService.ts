import type { RecurrenceRule } from './scheduleService';
import { recurrenceMatches } from './scheduleService';
const dayMs=86400000;
const formatters=new Map<string,Intl.DateTimeFormat>();
export function zonedParts(instant:number,timezone:string){
 let formatter=formatters.get(timezone);if(!formatter){formatter=new Intl.DateTimeFormat('en-GB',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});formatters.set(timezone,formatter);}
 const parts=formatter.formatToParts(new Date(instant));
 const get=(key:string)=>Number(parts.find(p=>p.type===key)?.value||0);
 return {year:get('year'),month:get('month'),day:get('day'),hour:get('hour'),minute:get('minute')};
}
export function zonedDay(instant:number,timezone:string){const p=zonedParts(instant,timezone);return `${p.year}-${String(p.month).padStart(2,'0')}-${String(p.day).padStart(2,'0')}`;}
export function calendarDayOffset(day:string,delta:number){return new Date(Date.parse(`${day}T12:00:00Z`)+delta*dayMs).toISOString().slice(0,10);}
// Resolve wall-clock time independently for every calendar date; never add 24 elapsed hours
// to a daily dose. In a DST fold use the later occurrence (PostgreSQL's standard-time choice).
// Nonexistent DST wall times are skipped, never silently moved to an unprescribed time.
export function wallClockInstant(day:string,time:string,timezone:string):number|null {
 const [year,month,date]=day.split('-').map(Number),[hour,minute]=time.split(':').map(Number);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))return null;
 const wall=Date.UTC(year,month-1,date,hour,minute),offsets=new Set<number>();
 for(const delta of [-2,-1,0,1,2]){const probe=wall+delta*dayMs,p=zonedParts(probe,timezone);offsets.add(Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute)-probe);}
 const matches=[...offsets].map(offset=>wall-offset).filter(instant=>{const p=zonedParts(instant,timezone);return p.year===year&&p.month===month&&p.day===date&&p.hour===hour&&p.minute===minute;});
 return matches.length?Math.max(...matches):null;
}
export function upcomingScheduleDoses(rule:RecurrenceRule,now:number,lead:number,limitDays=180):number[]{
 if(rule.kind==='as-needed')return [];
 const today=zonedDay(now,rule.timezone),instants:number[]=[];
 if(rule.kind==='hourly'){
  const anchor=wallClockInstant(rule.startDate,rule.times[0],rule.timezone);if(anchor===null)return [];
  const step=Math.max(1,rule.intervalHours||1)*3600000,first=Math.max(0,Math.floor((now+lead*60000-anchor)/step)+1);
  const end=now+limitDays*dayMs;
  for(let i=first;i<first+limitDays*24;i++){const instant=anchor+i*step;if(instant>end)break;if(rule.endDate&&zonedDay(instant,rule.timezone)>rule.endDate)break;instants.push(instant);}
  return instants;
 }
 const first=rule.kind==='once'?rule.startDate:today;
 for(let offset=0;offset<(rule.kind==='once'?1:limitDays);offset++){
  const day=calendarDayOffset(first,offset);if(rule.endDate&&day>rule.endDate)break;
  if(!recurrenceMatches(rule,day))continue;
  for(const time of rule.times){const instant=wallClockInstant(day,time,rule.timezone);if(instant!==null&&instant-lead*60000>now)instants.push(instant);}
 }
 return [...new Set(instants)].sort((a,b)=>a-b);
}
