import type { Medication,ReminderEvent } from '@/hooks/useMedications';
import type { NotificationPreferences } from './notificationSettingsService';
import { isPrn } from './cabinetFilterService';
import { deviceTimezone,timeLabel } from './scheduleService';
import { upcomingScheduleDoses,zonedDay,zonedParts } from './notificationScheduleService';
export interface PlannedDoseNotification {key:string;medicationId:string;title:string;body?:string;date:Date;signature:string;oneShot?:boolean;repeat?:{hour:number;minute:number;weekday?:number}}
export const nativeNotificationLimit=60;
const active=(m:Medication)=>!m.paused&&!m.deletedAt&&['active','expiring'].includes(m.status);
function selectRequests(items:PlannedDoseNotification[]){
 // Reserve slots for persistent calendar repeats before filling the bounded window.
 // Otherwise an hourly prescription could starve a weekly prescription indefinitely.
 const ordered=[...items].sort((a,b)=>a.date.getTime()-b.date.getTime());
 return [...ordered.filter(x=>x.repeat),...ordered.filter(x=>!x.repeat)].slice(0,nativeNotificationLimit).sort((a,b)=>a.date.getTime()-b.date.getTime());
}
export function planDoseNotifications(medications:Medication[],reminders:ReminderEvent[],userId:string,now=Date.now(),advanceMinutes=10){
 const lead=[5,10,15,30].includes(advanceMinutes)?advanceMinutes:10,unique=new Map<string,PlannedDoseNotification>(),timezone=deviceTimezone();
 for(const med of medications){
  if(!active(med)||isPrn(med))continue;
  const rule=med.recurrence,zone=rule?.timezone||timezone;
  const archiveAt=med.outOfStockAt?Date.parse(med.outOfStockAt)+5*86400000:Infinity;
  const suppressed=new Set(reminders.filter(e=>e.medicationId===med.id&&(e.completed||e.skipped)).map(e=>e.scheduledAt?Date.parse(e.scheduledAt):Date.parse(`${e.date}T${e.time}:00`)));
  const body=(time:string)=>`${med.name} is scheduled for ${time}. Your dose is coming up in ${lead} minutes.`,title='Time for your medication';
  // Future starts/end dates, foreign zones, midnight/DST hours and elapsed-hour rules
  // need finite DATE requests; they must not be turned into boundary-free repeats.
  const repeatable=rule&&!rule.endDate&&rule.startDate<=zonedDay(now,zone)&&zone===timezone&&archiveAt===Infinity&&['daily','weekly','days'].includes(rule.kind)&&rule.times.every(t=>Number(t.split(':')[0])>=4)&&!reminders.some(e=>e.medicationId===med.id&&(e.completed||e.skipped)&&Date.parse(e.scheduledAt||`${e.date}T${e.time}:00`)>now);
  if(repeatable&&rule){
   for(const time of rule.times){
    const [h,m]=time.split(':').map(Number),total=h*60+m-lead,dayOffset=total<0?-1:0,clock=(total+1440)%1440;
    const doseDays=rule.kind==='daily'?[undefined]:rule.weekdays;
    for(const weekday of doseDays){
     const triggerWeekday=weekday===undefined?undefined:(weekday+dayOffset+7)%7+1,repeat={hour:Math.floor(clock/60),minute:clock%60,weekday:triggerWeekday};
     const key=`bigpharma-dose:${userId}:${med.id}:clock:${time}:${weekday??'daily'}`;
     const next=upcomingScheduleDoses({...rule,times:[time],weekdays:weekday===undefined?rule.weekdays:[weekday]},now,lead,8)[0];if(next===undefined)continue;
     const text=body(timeLabel(time));unique.set(key,{key,medicationId:med.id,title,body:text,date:new Date(next-lead*60000),repeat,signature:JSON.stringify([repeat,title,text,zone,rule,med.scheduleVersion||0])});
    }
   }
   continue;
  }
  const instants=rule?upcomingScheduleDoses(rule,now,lead):reminders.filter(e=>e.medicationId===med.id&&!e.completed&&!e.skipped).map(e=>Date.parse(e.scheduledAt||`${e.date}T${e.time}:00`));
  for(const instant of instants){
   const fire=instant-lead*60000;if(!Number.isFinite(fire)||fire<=now||instant>=archiveAt||suppressed.has(instant))continue;
   const parts=zonedParts(instant,zone),text=body(timeLabel(`${parts.hour}:${String(parts.minute).padStart(2,'0')}`)),key=`bigpharma-dose:${userId}:${med.id}:${instant}`;
   unique.set(key,{key,medicationId:med.id,title,body:text,date:new Date(fire),signature:JSON.stringify([fire,title,text,zone,rule,med.scheduleVersion||0])});
  }
 }
 const all=[...unique.values()],selected=selectRequests(all),bounded=selected.filter(x=>!x.repeat);
 return {notifications:selected,overflow:Math.max(0,all.length-nativeNotificationLimit),scheduledUntil:bounded[bounded.length-1]?.date.toISOString()};
}
export function planMedicationNotifications(medications:Medication[],reminders:ReminderEvent[],userId:string,prefs:NotificationPreferences,now=Date.now()){
 if(!prefs.enabled)return {notifications:[],overflow:0,scheduledUntil:undefined};
 const doses=prefs.dose_reminders?planDoseNotifications(medications,reminders,userId,now,prefs.advance_minutes):{notifications:[],overflow:0};
 const items:PlannedDoseNotification[]=[...doses.notifications],tomorrow=new Date(now);tomorrow.setHours(9,0,0,0);if(tomorrow.getTime()<=now)tomorrow.setDate(tomorrow.getDate()+1);
 for(const m of medications){
  if(m.paused||m.deletedAt||!['active','expiring','as-needed'].includes(m.status))continue;
  if(m.recurrence?.endDate&&zonedDay(tomorrow.getTime(),m.recurrence.timezone)>m.recurrence.endDate)continue;
  if(m.outOfStockAt&&tomorrow.getTime()>=Date.parse(m.outOfStockAt)+5*86400000)continue;
  const add=(kind:string,title:string,marker:string)=>items.push({key:`bigpharma-${kind}:${userId}:${m.id}`,medicationId:m.id,title,body:'Review your confirmed prescription and records in BigPharma.',date:new Date(tomorrow),signature:`condition:${marker}`,oneShot:true});
  const available=m.hasRefills===true&&(m.refillsRemaining==null||m.refillsRemaining>0),marker=`${m.inventoryAmount}:${m.hasRefills}:${m.refillsRemaining}:${m.outOfStockAt||''}`;
  if(prefs.refill_alerts&&m.inventoryAmount===0)add('refill',available?`Refill needed: ${m.name}`:`${m.name}: contact your pharmacy or prescriber about a refill`,marker);
  else if(prefs.refill_alerts&&available&&m.inventoryAmount!=null&&m.inventoryAmount>0&&m.inventoryAmount<=5&&/tablet|capsule/i.test(m.quantityUnit||m.form))add('refill',`Refill soon: ${m.name}`,marker);
  else if(prefs.low_inventory_alerts&&m.inventoryAmount!=null&&m.inventoryAmount>0&&m.inventoryAmount<=5&&/tablet|capsule/i.test(m.quantityUnit||m.form))add('low',m.hasRefills===false||m.refillsRemaining===0?`${m.name} is running low: contact your pharmacy or prescriber`:`Low inventory: ${m.name}`,String(m.inventoryAmount));
  if(prefs.expiration_alerts&&m.expirationDate){const expiry=Date.parse(m.expirationDate+'T23:59:59'),remaining=expiry-now;if(Number.isFinite(expiry)&&remaining>=0&&remaining<=14*86400000)add('expiration',`${m.name} expires ${m.expirationDate}`,m.expirationDate);}
 }
 const selected=selectRequests(items),bounded=selected.filter(x=>!x.repeat);
 return {notifications:selected,overflow:doses.overflow+Math.max(0,items.length-nativeNotificationLimit),scheduledUntil:bounded[bounded.length-1]?.date.toISOString()};
}
