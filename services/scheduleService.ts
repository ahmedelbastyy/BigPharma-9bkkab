export type ScheduleKind='daily'|'alternate'|'weekly'|'days'|'hourly'|'as-needed'|'custom'|'once';
export interface RecurrenceRule {kind:ScheduleKind;timezone:string;startDate:string;times:string[];weekdays:number[];intervalHours?:number;intervalDays?:number;endDate?:string}
export const scheduleOptions=['Once Daily','Twice Daily','Three Times Daily','Four Times Daily','Every Other Day','Once Weekly','Twice Weekly','Specific Days','Every X Hours','As Needed','Custom Schedule','One Time'];
export const weekdays=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
export function localDay(date=new Date()){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
export function deviceTimezone(){try{return Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC';}catch{return 'UTC';}}
export function timeLabel(time:string){const [hour,minute]=time.split(':').map(Number);return `${hour%12||12}:${String(minute||0).padStart(2,'0')} ${hour>=12?'PM':'AM'}`;}
export function doseCount(schedule:string){return ({'Once Daily':1,'Twice Daily':2,'Three Times Daily':3,'Four Times Daily':4} as Record<string,number>)[schedule]||1;}
export function buildRecurrence(schedule:string,times:string[],days:number[],startDate:string,timezone:string,hours=0,intervalDays=0,endDate=''):RecurrenceRule {
 if(!scheduleOptions.includes(schedule))throw new Error('Choose your prescribed schedule.');
 const kind:ScheduleKind=schedule==='One Time'?'once':schedule==='As Needed'?'as-needed':schedule==='Every Other Day'?'alternate':/Weekly/.test(schedule)?'weekly':schedule==='Specific Days'?'days':schedule==='Every X Hours'?'hourly':schedule==='Custom Schedule'?'custom':'daily';
 const unique=[...new Set(times.filter(Boolean))].sort();
 if(kind!=='as-needed'&&(unique.length!==times.length||!unique.length||unique.some(t=>!/^([01]\d|2[0-3]):[0-5]\d$/.test(t))))throw new Error('Choose a different valid time for each prescribed dose.');
 if(kind==='daily'&&unique.length!==doseCount(schedule))throw new Error('Choose a time for each dose.');
 if(kind==='weekly'&&days.length!==(schedule==='Once Weekly'?1:2))throw new Error('Select the prescribed weekday(s).');
 if(kind==='days'&&!days.length)throw new Error('Select at least one weekday.');
 if(kind==='hourly'&&(!Number.isInteger(hours)||hours<1||hours>24))throw new Error('Choose an interval from 1 to 24 hours.');
 if(kind==='custom'&&(!Number.isInteger(intervalDays)||intervalDays<1||intervalDays>90))throw new Error('Choose an interval from 1 to 90 days.');
 try{new Intl.DateTimeFormat('en',{timeZone:timezone}).format();}catch{throw new Error('Enter a valid timezone, such as America/New_York.');}
 if(!/^\d{4}-\d{2}-\d{2}$/.test(startDate)||!Number.isFinite(new Date(startDate+'T12:00:00Z').getTime()))throw new Error('Choose a valid schedule start date.');
 if(endDate&&(!/^\d{4}-\d{2}-\d{2}$/.test(endDate)||new Date(endDate+'T12:00:00Z').toISOString().slice(0,10)!==endDate||endDate<startDate))throw new Error('The schedule end date must be on or after its start.');
 return {kind,timezone,startDate,endDate:kind==='once'?startDate:endDate||undefined,times:kind==='as-needed'?[]:unique,weekdays:[...new Set(days)],intervalHours:kind==='hourly'?hours:undefined,intervalDays:kind==='custom'?intervalDays:undefined};
}
export function quantityUnit(form:string){if(/capsule/i.test(form))return 'capsules';if(/tablet|tab|lozenge/i.test(form))return 'tablets';if(/solution|liquid|suspension|syrup/i.test(form))return 'mL';if(/patch/i.test(form))return 'patches';if(/inhal/i.test(form))return 'puffs';if(/injection|injector/i.test(form))return 'injections';if(/cream|ointment|gel/i.test(form))return 'applications';return 'units';}
export function recurrenceMatches(rule:RecurrenceRule,date:string){const delta=Math.round((Date.parse(date+'T12:00:00Z')-Date.parse(rule.startDate+'T12:00:00Z'))/86400000);if(delta<0||rule.kind==='as-needed'||(rule.endDate&&date>rule.endDate))return false;if(rule.kind==='once')return delta===0;if(rule.kind==='alternate')return delta%2===0;if(rule.kind==='weekly'||rule.kind==='days')return rule.weekdays.includes(new Date(date+'T12:00:00Z').getUTCDay());if(rule.kind==='custom')return delta%(rule.intervalDays||1)===0;return true;}
