import { FunctionsHttpError } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/template';
import type { RxCabinet,RxCheckResponse } from './rxcheckContract';
export class RxcheckError extends Error {constructor(message:string,public code='REQUEST_FAILED'){super(message);this.name='RxcheckError';}}
async function invoke<T>(body:Record<string,unknown>,signal?:AbortSignal):Promise<T>{
 if(signal?.aborted)throw new RxcheckError('Check cancelled.','CANCELLED');
 const {data,error}=await getSupabaseClient().functions.invoke('rxcheck-interactions',{body,signal});
 if(signal?.aborted)throw new RxcheckError('Check cancelled.','CANCELLED');
 if(error){let message='The secure medication check could not complete.',code='REQUEST_FAILED';if(error instanceof FunctionsHttpError){try{const text=await error.context.text(),payload=JSON.parse(text);if(typeof payload.error==='string')message=payload.error;if(typeof payload.code==='string')code=payload.code;}catch{/* Never reveal unparsed provider responses. */}}throw new RxcheckError(message,code);}
 if(!data||typeof data!=='object')throw new RxcheckError('The check returned an incomplete response.','INVALID_RESPONSE');
 if(typeof data.error==='string')throw new RxcheckError(data.error,typeof data.code==='string'?data.code:'REQUEST_FAILED');return data as T;
}
export interface RxcheckDiagnostic {httpStatus:number|null;outcome:string;completed:boolean;normalizedFields:string[];durationMs:number;error:string|null;cached:false;input:string}
export const verifyRxcheckExample=()=>invoke<RxcheckDiagnostic>({op:'verify-example'});
export async function fetchRxcheckCabinet(signal?:AbortSignal){const data=await invoke<RxCabinet>({op:'cabinet'},signal);if(!Array.isArray(data.drugs)||!Array.isArray(data.products)||!Array.isArray(data.unresolved)||typeof data.fingerprint!=='string'||data.drugs.some(d=>typeof d.name!=='string'||!Array.isArray(d.medicationIds))||data.products.some(p=>typeof p.id!=='string'||!Array.isArray(p.ingredients)||!['resolved','unresolved'].includes(p.resolution)))throw new RxcheckError('Cabinet identities could not be validated.');return data;}
export async function checkRxcheckPairs(fingerprint:string,pairIds:string[],medicationIds:string[],signal?:AbortSignal){
 if(medicationIds.length!==2||medicationIds[0]===medicationIds[1])throw new RxcheckError('Select exactly two medications.','INVALID_SELECTION');
 const data=await invoke<RxCheckResponse>({op:'check',fingerprint,pairIds,medicationIds},signal);
 if(data.fingerprint!==fingerprint||!Array.isArray(data.medicationIds)||data.medicationIds.length!==2||data.medicationIds.some((id,i)=>id!==medicationIds[i])||!Array.isArray(data.results)||data.results.length!==pairIds.length||new Set(data.results.map(r=>r.id)).size!==pairIds.length||data.results.some(r=>!pairIds.includes(r.id)||!['found','no-record','failed','unresolved'].includes(r.outcome)))throw new RxcheckError('Pair results could not be validated.','INVALID_RESPONSE');return data;
}
