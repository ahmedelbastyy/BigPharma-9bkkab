import { FunctionsHttpError } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/template';
import type { AnakinAction } from '@/constants/anakin';
import { capabilityForAction,fetchMedicationReferenceStatus,runMedicationReference,type ReferenceCapabilityStatus,type ReferenceCapability } from './medicationReferenceService';
export interface AnakinAuthorization {approved:boolean;cache_approved:boolean;test_allowed?:boolean;authorized_actions?:string[]|null;evidence_url:string|null;scope_notes:string|null;valid_until:string|null}
export interface AnakinStatus{testAllowed?:boolean;authorization?:AnakinAuthorization;capabilities?:Record<ReferenceCapability,ReferenceCapabilityStatus>;embedEnabled?:boolean;cacheEnabled?:boolean;configured:boolean;connectionStatus:string;verifiedAt:string|null;contentEnabled:boolean;isAdmin:boolean;rightsMessage:string;usage:{reportedCredits:number;reservedCredits:number;tasks:number}|null}
export interface AnakinResult{cacheAllowed?:boolean;action:AnakinAction;data:unknown;creditsUsed:number|null;retrievedAt:string;source:string;sourceUrl:string;productRxcui:string|null}
export interface AnakinInput{action:AnakinAction;rxcui?:string;term?:string;page?:number}
interface WireResponse{cacheAllowed?:boolean;requestId?:string;status?:string;error?:string;retryAfterMs?:number;data?:unknown;action?:AnakinAction;creditsUsed?:number|null;retrievedAt?:string;source?:string;sourceUrl?:string;productRxcui?:string|null}
async function invoke<T>(body:Record<string,unknown>):Promise<T>{
 const {data,error}=await getSupabaseClient().functions.invoke('anakin-drugs',{body});
 if(error){let message='The secure Anakin connection could not complete this request.';if(error instanceof FunctionsHttpError){try{const text=await error.context.text();const payload=JSON.parse(text);if(typeof payload.error==='string')message=payload.error;}catch{/* Do not display unparsed upstream bodies. */}}throw new Error(message);}
 if(data?.error)throw new Error(typeof data.error==='string'?data.error:'Anakin request failed.');return data as T;
}
// Compatibility facade: existing screens retain their imports while core references use a neutral backend.
export const fetchAnakinStatus=()=>fetchMedicationReferenceStatus();
export interface AnakinVerification {verified:boolean;verifiedAt:string;connectivity:{httpStatus:number;status:string;fieldNames:string[]};contracts:Array<{action:string;parameter:string;authMode:string;status:string;mode:string}>;contentTestsPerformed:false}
export const verifyAnakinConnection=()=>invoke<AnakinVerification>({op:'verify'});
export interface AnakinTestReceipt {requestId:string;action:string;status:string;providerJobId:string|null;submissionHttpStatus:number|null;httpStatus:number|null;fieldNames:string[];schemaValidated:boolean;executionMs:number|null;creditsUsed:number|null;createdAt:string;completedAt:string|null;error?:string;retryAfterMs?:number}
export const submitAnakinTest=(action:string)=>invoke<AnakinTestReceipt>({op:'test-submit',action});
export const pollAnakinTest=(requestId:string)=>invoke<AnakinTestReceipt>({op:'test-poll',requestId});
export const recordAnakinAuthorization=(record:{evidenceUrl:string;scopeNotes:string;actions:string[];display:boolean;cache:boolean;test:boolean;validUntil:string|null})=>invoke<{recorded:boolean}>({op:'record-rights',...record,confirmed:true});
export interface CabinetIngredient {name:string;medicationIds:string[];aliases:string[]}
export const fetchCabinetIngredients=()=>invoke<{drugs:CabinetIngredient[];unresolved:string[];medicationCount:number}>({op:'cabinet'});
const inFlight=new Map<string,Promise<AnakinResult>>(),sessionResults=new Map<string,{result:AnakinResult;expires:number}>();
function wait(ms:number,signal?:AbortSignal):Promise<void>{return new Promise((resolve,reject)=>{if(signal?.aborted){reject(new Error('Request paused. The provider job is preserved.'));return;}const cancel=()=>{clearTimeout(timer);signal?.removeEventListener('abort',cancel);reject(new Error('Request paused. The provider job is preserved.'));};const timer=setTimeout(()=>{signal?.removeEventListener('abort',cancel);resolve();},Math.max(2000,Math.min(30000,ms)));signal?.addEventListener('abort',cancel,{once:true});});}
export function runAnakinAction(input:AnakinInput,userId:string,signal?:AbortSignal,onProgress?:(text:string)=>void):Promise<AnakinResult>{
 if(capabilityForAction(input.action))return runMedicationReference(input,userId,signal,onProgress);
 const key=JSON.stringify({userId,...input}),cached=sessionResults.get(key);if(cached&&cached.expires>Date.now())return Promise.resolve(cached.result);const pending=inFlight.get(key);if(pending)return pending;
 const task=(async()=>{
  if(signal?.aborted)throw new Error('Request paused.');
  onProgress?.('Starting your lookup…');
  const submitted=await invoke<WireResponse>({op:'submit',...input});
  if(!submitted.requestId)throw new Error('The backend returned no request identifier.');
  if(submitted.status==='completed'&&submitted.data&&submitted.action&&submitted.retrievedAt&&submitted.source&&submitted.sourceUrl)return {action:submitted.action,data:submitted.data,creditsUsed:submitted.creditsUsed??null,retrievedAt:submitted.retrievedAt,source:submitted.source,sourceUrl:submitted.sourceUrl,productRxcui:submitted.productRxcui??null,cacheAllowed:submitted.cacheAllowed!==false};
  onProgress?.('Preparing results…');
  const deadline=Date.now()+180000;let delay=submitted.retryAfterMs??2000;
  while(Date.now()<deadline){await wait(delay,signal);const state=await invoke<WireResponse>({op:'poll',requestId:submitted.requestId});
   if(signal?.aborted)throw new Error('Request paused. The provider job is preserved.');
   if(state.status==='failed')throw new Error(state.error??'Anakin could not complete the job.');
   if(state.status==='completed'){
    if(!state.action||!state.retrievedAt||!state.source||!state.sourceUrl||!state.data||typeof state.data!=='object')throw new Error('Anakin returned incomplete result metadata.');
    return {action:state.action,data:state.data,creditsUsed:state.creditsUsed??null,retrievedAt:state.retrievedAt,source:state.source,sourceUrl:state.sourceUrl,productRxcui:state.productRxcui??null,cacheAllowed:state.cacheAllowed!==false};
   }
   if(!['processing','submitting'].includes(state.status||''))throw new Error('Anakin returned an unexpected job state.');delay=state.retryAfterMs??2000;
  }
  throw new Error('This job is taking longer than expected. Resume to check the same job; no new task is submitted.');
 })();
 inFlight.set(key,task);void task.then(result=>{if(result.cacheAllowed!==false)sessionResults.set(key,{result,expires:Date.now()+(input.action==='dc_drug_prices'?86400000:7*86400000)});inFlight.delete(key);},()=>inFlight.delete(key));return task;
}
export interface ProviderField{key:string;label:string;content:string}
// Render the actual returned keys without guessing an undocumented clinical schema or overwriting DailyMed.
export function providerFields(data:unknown):ProviderField[]{
 const text=(x:unknown,depth=0):string=>{if(x==null||depth>8)return '';if(typeof x==='string')return x.replace(/<[^>]*>/g,'').trim();if(typeof x==='number'||typeof x==='boolean')return String(x);if(Array.isArray(x))return x.map((v,i)=>{const content=text(v,depth+1);return content?`${i+1}. ${content}`:'';}).filter(Boolean).join('\n\n');if(typeof x==='object')return Object.entries(x).map(([k,v])=>{const content=text(v,depth+1);return content?`${k.replace(/_/g,' ')}: ${content}`:'';}).filter(Boolean).join('\n');return '';};
 if(!data||typeof data!=='object')return [];
 const entries=Array.isArray(data)?[['results',data] as const]:Object.entries(data);
 return entries.flatMap(([key,value])=>{if(/api.?key|token|secret|password|credential|cookie|authorization/i.test(key))return [];const content=text(value);return content?[{key,label:key.replace(/_/g,' '),content}]:[];});
}
