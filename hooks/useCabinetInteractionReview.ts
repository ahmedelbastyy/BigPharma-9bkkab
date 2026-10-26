import { useState,useCallback,useMemo,useRef,useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useMedications } from '@/hooks/useMedications';
import { fetchRxcheckCabinet,checkRxcheckPairs } from '@/services/rxcheckService';
import { selectedRxPairs,failedRxPair,type RxPairResult,type RxCabinet } from '@/services/rxcheckContract';
export function useCabinetInteractionReview() {
 const {user}=useAuth(),{medications}=useMedications();
 const [records,setRecords]=useState<RxPairResult[]>([]),[cabinet,setCabinet]=useState<RxCabinet|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[progress,setProgress]=useState(''),[reviewed,setReviewed]=useState<Array<{label:string;status:string}>>([]);
 const abort=useRef<AbortController|null>(null),epoch=useRef(0),lock=useRef(false);
 const signature=JSON.stringify(medications.map(m=>[m.id,m.rxcui,m.name,m.genericName,m.strength,m.form,m.status,m.paused,m.deletedAt]));
 useEffect(()=>{epoch.current++;abort.current?.abort();lock.current=false;setBusy(false);setCabinet(null);setRecords([]);setReviewed([]);setProgress('');setError('');return()=>{epoch.current++;abort.current?.abort();};},[user?.id,signature]);
 const check=useCallback(async()=>{
  if(!user||lock.current)return;lock.current=true;const generation=++epoch.current,controller=new AbortController();abort.current=controller;
  const current=()=>!controller.signal.aborted&&epoch.current===generation;
  setBusy(true);setError('');setRecords([]);setReviewed([]);setProgress('Verifying active medication identities…');
  try {
   const c=await fetchRxcheckCabinet(controller.signal);if(!current())return;setCabinet(c);
   if(!c.configured)throw new Error('RxCheck is unavailable. No interaction requests were sent.');
   const products=c.products,plans:Array<{ids:string[];label:string;tasks:ReturnType<typeof selectedRxPairs>}>=[],tasks=new Map<string,boolean>();
   for(let a=0;a<products.length;a++)for(let b=a+1;b<products.length;b++){
    const first=products[a],second=products[b],ids=[first.id,second.id],label=`${first.displayName} + ${second.displayName}`;
    const entries=first.resolution==='resolved'&&second.resolution==='resolved'?selectedRxPairs(c.drugs,ids):[];
    entries.forEach(p=>tasks.set(p.id,true));plans.push({ids,label,tasks:entries});
   }
   if(!plans.length)throw new Error('At least two active medications are required.');
   if(tasks.size>45)throw new Error('More than 45 unique ingredient pairs. Use the two-medication check or ask your pharmacist for a complete review.');
   const retained=cabinet?.fingerprint===c.fingerprint?records.filter(r=>['found','no-record'].includes(r.outcome)&&tasks.has(r.id)):[];
   const collected=new Map<string,RxPairResult>(retained.map(r=>[r.id,r])),rows:Array<{label:string;status:string}>=[];let stopped=false;
   for(const plan of plans){
    if(!current())return;
    const productsForPair=plan.ids.map(id=>c.products.find(p=>p.id===id)!);
    if(productsForPair.some(p=>p.resolution==='unresolved')){rows.push({label:plan.label,status:'Medication could not be identified · confirm the drug'});setReviewed([...rows]);continue;}
    if(!plan.tasks.length){rows.push({label:plan.label,status:'Shared ingredient only · duplicate therapy is not assessed'});setReviewed([...rows]);continue;}
    const pending=plan.tasks.filter(p=>!collected.has(p.id));
    for(let offset=0;offset<pending.length;offset+=2){
     if(!current())return;const chunk=pending.slice(offset,offset+2);setProgress(`${collected.size} of ${tasks.size} unique ingredient pairs reviewed`);
     if(stopped){chunk.forEach(p=>collected.set(p.id,failedRxPair(p.first,p.second,'NOT_ATTEMPTED','Not attempted after a service or quota failure.')));continue;}
     try{const response=await checkRxcheckPairs(c.fingerprint,chunk.map(p=>p.id),plan.ids,controller.signal);if(!current())return;response.results.forEach(r=>collected.set(r.id,r));stopped=response.stop;}
     catch(e){if(!current())return;const message=e instanceof Error?e.message:'Service unavailable. Retry the review.';chunk.forEach(p=>collected.set(p.id,failedRxPair(p.first,p.second,'REQUEST_FAILED',message)));stopped=true;}
     setRecords([...collected.values()]);
    }
    const findings=plan.tasks.map(p=>collected.get(p.id));
    rows.push({label:plan.label,status:findings.some(r=>r?.outcome==='found')?'Interaction record found':findings.every(r=>r?.outcome==='no-record')?'No matching record · not evidence of safety':'Incomplete review · retry required'});setReviewed([...rows]);
   }
   if(current()){setRecords([...collected.values()]);const completed=[...collected.values()].filter(r=>['found','no-record'].includes(r.outcome)).length;setProgress(`${completed} of ${tasks.size} unique ingredient pairs completed · ${rows.length} medication pairs reviewed`);}
  }catch(e){if(current())setError(e instanceof Error?e.message:'Review unavailable. Retry.');}
  finally{if(current()){lock.current=false;setBusy(false);}}
 },[user?.id,signature,cabinet,records]);
 const unresolved=useMemo(()=>cabinet?.products.filter(p=>p.resolution==='unresolved')||[],[cabinet]);
 return {records,reviewed,unresolved,busy,error,progress,check};
}
