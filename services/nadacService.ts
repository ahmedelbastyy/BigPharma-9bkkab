import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabaseClient } from '@/template';
import { FunctionsHttpError } from '@supabase/supabase-js';
import type { NadacLookup } from './nadacRules';
import { createReferenceRequestPool,requestAbortError } from './referenceRequestPool';
import { recordSavingsTiming } from './savingsPerformanceService';
export interface NadacMedication {id:string;savedId?:string;rxcui?:string;name:string;strength?:string;form?:string;route?:string;ndc?:string;quantity?:number;quantityUnit?:string}
const memory=new Map<string,{result:NadacLookup;expires:number}>(),pool=createReferenceRequestPool<NadacLookup>(1,28000);
export const nadacRequestSnapshot=()=>pool.snapshot();
export async function fetchNadacBenchmark(medication:NadacMedication,owner:string,force=false,signal?:AbortSignal):Promise<NadacLookup>{
 if(signal?.aborted)throw requestAbortError();
 if(!owner||(!medication.rxcui&&!medication.savedId))return {benchmark:null,cached:false,message:'Confirm the exact medication product before checking prices.'};
 const identity=[medication.savedId||medication.rxcui,medication.rxcui,medication.ndc||'auto',medication.strength||'',medication.form||'',medication.route||''].join('|'),key=`nadac-unit-v4:${owner}:${identity}`;
 const cached=memory.get(key);if(!force&&cached&&cached.expires>Date.now())return {...cached.result,cached:true};
 // Only catalog reference benchmarks persist. Saved-prescription identifiers and location never enter disk caches here.
 const diskKey=!medication.savedId?`nadac-reference-v4:${identity}`:null;
 return pool.request(key,async requestSignal=>{
  const started=Date.now();try{
   if(!force&&diskKey){try{const saved=JSON.parse(await AsyncStorage.getItem(diskKey)||'null');if(saved?.expires>Date.now()&&saved.result?.benchmark?.productRxcui===medication.rxcui){memory.set(key,saved);return {...saved.result,cached:true};}}catch{}}
   if(requestSignal.aborted)throw requestAbortError();
   const {data,error}=await getSupabaseClient().functions.invoke('nadac-pricing',{body:medication.savedId?{medicationId:medication.savedId}:{rxcui:medication.rxcui},signal:requestSignal});
   if(requestSignal.aborted)throw requestAbortError();
   if(error){let message=error.message;if(error instanceof FunctionsHttpError){try{const raw=await error.context.text();message=JSON.parse(raw).error||message;}catch{}}throw new Error(message);}
   if(!data||typeof data.message!=='string'||(data.benchmark&&medication.rxcui&&data.benchmark.productRxcui!==medication.rxcui))throw new Error('Price unavailable');
   const result=data as NadacLookup,stored={result,expires:Date.now()+(result.benchmark?3600000:300000)};
   if(memory.size>=100)memory.delete(memory.keys().next().value!);memory.set(key,stored);
   if(diskKey&&result.benchmark){try{await AsyncStorage.setItem(diskKey,JSON.stringify(stored));}catch{}}
   recordSavingsTiming('nadac_request',started);return result;
  }catch(error){recordSavingsTiming('nadac_request',started,requestSignal.aborted?'cancelled':'error');throw error;}
 },signal);
}
