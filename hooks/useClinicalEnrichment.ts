import { useCallback,useEffect,useRef,useState } from 'react';
import { fetchClinicalEnrichmentCounts,invokeCatalogImport } from '@/services/catalogImportService';
export function useClinicalEnrichment(enabled:boolean){
 const [counts,setCounts]=useState<Record<string,number>>({}),[error,setError]=useState(''),[starting,setStarting]=useState(false),[message,setMessage]=useState('');const alive=useRef(true),lock=useRef(false);
 const refresh=useCallback(async()=>{if(!enabled)return;const result=await fetchClinicalEnrichmentCounts();if(alive.current){setCounts(result.counts);if(result.error)setError(result.error);}},[enabled]);
 useEffect(()=>{alive.current=true;if(enabled)void refresh();const timer=enabled?setInterval(()=>{void refresh();},5000):null;return()=>{alive.current=false;if(timer)clearInterval(timer);};},[enabled,refresh]);
 const start=useCallback(async()=>{if(!enabled||lock.current)return;lock.current=true;setStarting(true);setError('');try{const result=await invokeCatalogImport({action:'enrich_batch',background:true});if(alive.current){setError(result.error??'');setMessage(result.error?'':result.data?.status==='idle'?'No products are due. Pending retries keep their checkpoints.':'Backend enrichment started. Each request checks one product; successful records and source failures remain recorded.');await refresh();}}finally{lock.current=false;if(alive.current)setStarting(false);}},[enabled,refresh]);
 return {counts,error,starting,message,start,refresh};
}
