import { FunctionsHttpError } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/template';
import type { AnakinInput,AnakinResult,AnakinStatus } from './anakinService';
export type ReferenceCapability='prices'|'interactions'|'conditions';
export interface ReferenceCapabilityStatus {provider:string;configured:boolean;contentEnabled:boolean;cacheEnabled:boolean;embedEnabled:boolean}
export interface ReferenceStatus extends AnakinStatus {capabilities:Record<ReferenceCapability,ReferenceCapabilityStatus>}
export const capabilityForAction=(action:string):ReferenceCapability|null=>action==='dc_drug_prices'?'prices':action==='dc_drug_interactions'?'interactions':action==='dc_condition_drugs'?'conditions':null;
export async function invokeMedicationReference<T>(body:Record<string,unknown>):Promise<T>{
 const {data,error}=await getSupabaseClient().functions.invoke('medication-references',{body});
 if(error){let message='The medication reference could not load.';if(error instanceof FunctionsHttpError){try{const payload=JSON.parse(await error.context.text());if(typeof payload.error==='string')message=payload.error;}catch{/* No raw response content or secrets in user errors. */}}throw new Error(message);}
 if(!data||typeof data!=='object')throw new Error('The reference returned an invalid response.');
 if(data.error)throw new Error(typeof data.error==='string'?data.error:'The reference could not finish.');return data as T;
}
export const fetchMedicationReferenceStatus=()=>invokeMedicationReference<ReferenceStatus>({op:'status'});
interface ReferenceReply {requestId?:string;status?:string;data?:unknown;action?:AnakinInput['action'];creditsUsed?:number|null;retrievedAt?:string;source?:string;sourceUrl?:string;productRxcui?:string|null;cacheAllowed?:boolean;error?:string;retryAfterMs?:number;provider?:string}
const inFlight=new Map<string,Promise<AnakinResult>>(),results=new Map<string,{until:number;result:AnakinResult}>();
function wait(ms:number,signal?:AbortSignal){return new Promise<void>((resolve,reject)=>{if(signal?.aborted){reject(new Error('Request paused. Your lookup is preserved.'));return;}const cancel=()=>{clearTimeout(timer);signal?.removeEventListener('abort',cancel);reject(new Error('Request paused. Your lookup is preserved.'));};const timer=setTimeout(()=>{signal?.removeEventListener('abort',cancel);resolve();},Math.max(2000,Math.min(30000,ms)));signal?.addEventListener('abort',cancel,{once:true});});}
function completed(reply:ReferenceReply):AnakinResult {if(reply.status!=='completed'||!reply.data||typeof reply.data!=='object'||!reply.action||!reply.retrievedAt||!reply.source||!reply.sourceUrl)throw new Error('The reference returned incomplete results.');return {action:reply.action,data:reply.data,creditsUsed:reply.creditsUsed??null,retrievedAt:reply.retrievedAt,source:reply.source,sourceUrl:reply.sourceUrl,productRxcui:reply.productRxcui??null,cacheAllowed:reply.cacheAllowed!==false};}
// Kept behind the legacy service facade so no screen needs provider-specific endpoints or task schemas.
export function runMedicationReference(input:AnakinInput,owner:string,signal?:AbortSignal,onProgress?:(text:string)=>void):Promise<AnakinResult>{
 const capability=capabilityForAction(input.action);if(!capability)return Promise.reject(new Error('Unsupported reference type.'));
 const key=JSON.stringify({owner,...input}),saved=results.get(key);if(saved&&saved.until>Date.now())return Promise.resolve(saved.result);const pending=inFlight.get(key);if(pending)return pending;
 const task=(async()=>{if(signal?.aborted)throw new Error('Request paused.');onProgress?.('Starting your lookup…');const submitted=await invokeMedicationReference<ReferenceReply>({op:'submit',capability,input:{rxcui:input.rxcui,term:input.term,page:input.page}});if(!submitted.requestId)throw new Error('The reference returned no request identifier.');if(submitted.status==='completed')return completed(submitted);if(!['processing','submitting'].includes(submitted.status||''))throw new Error(submitted.error||'The lookup could not be started.');
  const deadline=Date.now()+180000;let delay=submitted.retryAfterMs??2000;onProgress?.('Preparing results…');
  while(Date.now()<deadline){await wait(delay,signal);const state=await invokeMedicationReference<ReferenceReply>({op:'poll',capability,requestId:submitted.requestId});if(signal?.aborted)throw new Error('Request paused. Your lookup is preserved.');if(state.status==='completed')return completed(state);if(['failed','uncertain','expired'].includes(state.status||''))throw new Error(state.error||'The lookup could not finish.');if(!['processing','submitting'].includes(state.status||''))throw new Error('The reference returned an unexpected state.');delay=state.retryAfterMs??2000;}
  throw new Error('Your lookup is taking longer than expected. Retry to resume the saved job.');
 })();inFlight.set(key,task);void task.then(result=>{if(result.cacheAllowed!==false)results.set(key,{result,until:Date.now()+(capability==='prices'?86400000:7*86400000)});inFlight.delete(key);},()=>inFlight.delete(key));return task;
}
