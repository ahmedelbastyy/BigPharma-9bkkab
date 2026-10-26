import { useCallback,useEffect,useRef,useState } from 'react';
import { useLocalSearchParams,useRouter } from 'expo-router';
import { useMedications,type Medication } from '@/hooks/useMedications';
import { resolveClinicalProduct } from '@/services/rxtermsSearchService';
import type { CatalogMatch } from '@/services/catalogService';
export function useMedicationAddRoute(){
 const params=useLocalSearchParams<{product?:string;edit?:string;query?:string;ndc?:string}>(),router=useRouter(),{getMedicationById,loading}=useMedications(),lookup=useRef(getMedicationById);lookup.current=getMedicationById;
 const [initial,setInitial]=useState<CatalogMatch|null>(null),[editing,setEditing]=useState<Medication|null>(null),[ready,setReady]=useState(false),[error,setError]=useState(''),attempted=useRef('');
 const key=`${params.product||''}:${params.edit||''}:${params.ndc||''}`;
 useEffect(()=>{
 if(params.edit&&loading)return;if(attempted.current===key)return;let alive=true;
 setReady(false);setError('');setInitial(null);setEditing(null);
 void (async()=>{try{
 if(params.edit){const m=lookup.current(String(params.edit));if(!m)throw new Error('Medication is unavailable.');if(alive)setEditing({...m});}
 else if(params.product){const result=await resolveClinicalProduct(String(params.product));if(result.error||!result.data)throw new Error(result.error||'Product unavailable.');const match=params.ndc?{...result.data,details:{...result.data.details,matchEvidence:{...result.data.details.matchEvidence,scanNdc:String(params.ndc)}}}:result.data;if(alive)setInitial(match);}
 }catch(e){if(alive)setError(e instanceof Error?e.message:'Product could not load.');}
 finally{if(alive){attempted.current=key;setReady(true);}}})();return()=>{alive=false;};
 },[key,loading]);
 const close=useCallback(()=>router.dismissTo('/(tabs)/cabinet'),[router]),scan=useCallback(()=>router.replace('/(tabs)/scanner'),[router]);
 return {initial,editing,ready,error,query:String(params.query||''),close,scan};
}
