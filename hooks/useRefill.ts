import { useCallback,useEffect,useRef,useState } from 'react';
import { adjustInventory,inventoryOperationId } from '@/services/inventoryService';
import { useMedications } from '@/hooks/useMedications';
export function useRefill(id?:string){
 const {refresh}=useMedications(),[quantity,setQuantity]=useState(''),[expiration,setExpiration]=useState(''),[notes,setNotes]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),operation=useRef(''),lock=useRef(false);
 useEffect(()=>{setQuantity('');setExpiration('');setNotes('');setError('');operation.current=inventoryOperationId();},[id]);
 const save=useCallback(async(kind:'refill'|'correction'='refill')=>{if(lock.current||!id)return false;lock.current=true;setBusy(true);setError('');try{if(!quantity.trim()||!Number.isFinite(Number(quantity))||Number(quantity)<0)throw new Error('Enter a valid remaining quantity.');if(expiration&&!/^\d{4}-\d{2}-\d{2}$/.test(expiration))throw new Error('Use YYYY-MM-DD for expiration.');await adjustInventory(id,Number(quantity),expiration,operation.current,kind,notes);await refresh();return true;}catch(e){setError(e instanceof Error?e.message:'Inventory could not save.');return false;}finally{lock.current=false;setBusy(false);}},[id,quantity,expiration,notes,refresh]);
 return {quantity,setQuantity,expiration,setExpiration,notes,setNotes,busy,error,save};
}
