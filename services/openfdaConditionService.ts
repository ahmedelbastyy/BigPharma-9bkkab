import { FunctionsHttpError } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/template';
import type { FDAConditionPage,FDALabelProfile } from './openfdaConditionContract';
export class ConditionLookupError extends Error {constructor(message:string,public code='REQUEST_FAILED',public retryAfter=0){super(message);}}
const pending=new Map<string,Promise<any>>(),memory=new Map<string,{expires:number;data:any}>();
async function invokeFDA<T>(body:Record<string,unknown>,signal?:AbortSignal):Promise<T>{
 if(signal?.aborted)throw new ConditionLookupError('Search cancelled.','CANCELLED');
 const client=getSupabaseClient(),session=await client.auth.getSession();if(session.error||!session.data.session)throw new ConditionLookupError('Sign in to view medication labeling.','AUTH_REQUIRED');
 const key=`${session.data.session.user.id}:${JSON.stringify(body)}`,stored=memory.get(key);if(stored&&stored.expires>Date.now())return {...stored.data,cached:true};
 let task=pending.get(key);if(!task){task=(async()=>{
  const {data,error}=await client.functions.invoke('condition-lookup',{body});
  if(error){let message='The secure label lookup could not complete.',code='REQUEST_FAILED',retryAfter=0;if(error instanceof FunctionsHttpError){try{const payload=JSON.parse(await error.context.text());if(typeof payload.error==='string')message=payload.error;if(typeof payload.code==='string')code=payload.code;if(typeof payload.retryAfter==='number')retryAfter=payload.retryAfter;}catch{/* Do not expose raw upstream responses or credentials. */}}throw new ConditionLookupError(message,code,retryAfter);}
  if(!data||typeof data!=='object'||data.error)throw new ConditionLookupError('The label lookup returned an incomplete response.','INVALID_RESPONSE');
  if(body.op==='search'&&(!Array.isArray(data.items)||typeof data.condition!=='string'||!Number.isInteger(data.total)||data.items.some((i:any)=>typeof i.id!=='string'||typeof i.groupKey!=='string'||typeof i.matchedUse!=='string')))throw new ConditionLookupError('Source result cards could not be validated.','INVALID_RESPONSE');
  if(body.op==='detail'&&(data.medication?.id!==body.id||!Array.isArray(data.sections)||data.sourceOnly!==true))throw new ConditionLookupError('The selected label identity could not be verified.','INVALID_RESPONSE');
  memory.set(key,{expires:Date.now()+300000,data});if(memory.size>80)memory.delete(memory.keys().next().value!);return data;
 })();pending.set(key,task);void task.finally(()=>pending.delete(key)).catch(()=>{});}
 const result=await task;if(signal?.aborted)throw new ConditionLookupError('Search cancelled.','CANCELLED');return result as T;
}
export const searchConditionLabels=(query:string,skip=0,signal?:AbortSignal)=>invokeFDA<FDAConditionPage>({op:'search',query,skip},signal);
export const loadConditionLabel=(id:string)=>invokeFDA<FDALabelProfile>({op:'detail',id});
