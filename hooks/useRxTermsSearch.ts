import { useCallback,useEffect,useRef,useState } from 'react';
import { searchMedicationGroups,resolveClinicalProduct,type MedicationGroup } from '@/services/rxtermsSearchService';
import type { CatalogMatch } from '@/services/catalogService';
export function useRxTermsSearch(query:string,onSelect:(match:CatalogMatch)=>void){
 const [groups,setGroups]=useState<MedicationGroup[]>([]),[loading,setLoading]=useState(false),[error,setError]=useState(''),[expanded,setExpanded]=useState(''),[resolving,setResolving]=useState('');
 const alive=useRef(true),request=useRef(0),selection=useRef<AbortController|null>(null),locked=useRef(false);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;request.current++;selection.current?.abort();};},[]);
 useEffect(()=>{const id=++request.current,controller=new AbortController();selection.current?.abort();locked.current=false;setResolving('');setGroups([]);setError('');setExpanded('');
  if(query.trim().length<2){setLoading(false);return;}setLoading(true);
  const timer=setTimeout(()=>{void searchMedicationGroups(query,controller.signal).then(result=>{if(alive.current&&id===request.current&&!controller.signal.aborted){setGroups(result.data);setError(result.error??'');}}).catch(()=>{if(alive.current&&id===request.current&&!controller.signal.aborted)setError('Medication search could not connect. Please retry.');}).finally(()=>{if(alive.current&&id===request.current)setLoading(false);});},300);
  return()=>{clearTimeout(timer);controller.abort();};
 },[query]);
 const select=useCallback(async(rxcui:string)=>{if(locked.current)return;locked.current=true;const id=request.current,controller=new AbortController();selection.current=controller;const timer=setTimeout(()=>controller.abort(),14000);setResolving(rxcui);setError('');
  try{const result=await resolveClinicalProduct(rxcui,controller.signal);if(alive.current&&id===request.current){if(result.data&&!controller.signal.aborted)onSelect(result.data);else setError(result.error||'Product verification timed out. Please retry.');}}
  catch{if(alive.current&&id===request.current)setError('Product verification is temporarily unavailable.');}
  finally{clearTimeout(timer);if(selection.current===controller){locked.current=false;selection.current=null;if(alive.current)setResolving('');}}
 },[onSelect]);
 return {groups,loading,error,expanded,setExpanded,resolving,select};
}
