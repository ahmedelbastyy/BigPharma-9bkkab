import { createContext,useCallback,useEffect,useRef,useState,type ReactNode } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { loadApprovedMedicationImages } from '@/services/medicationImageService';
import type { LibraryImage } from '@/services/medicationImageIdentity';
interface MedicationImagesState {images:LibraryImage[];refresh:()=>Promise<void>;error:string}
export const MedicationImagesContext=createContext<MedicationImagesState|undefined>(undefined);
export function MedicationImagesProvider({children}:{children:ReactNode}){
 const {user}=useAuth(),id=user?.id,account=useRef(id),epoch=useRef(0),[images,setImages]=useState<LibraryImage[]>([]),[error,setError]=useState('');account.current=id;
 const refresh=useCallback(async()=>{const ticket=++epoch.current;if(!id){setImages([]);return;}try{const data=await loadApprovedMedicationImages();if(account.current===id&&ticket===epoch.current){setImages(data);setError('');}}catch(e){if(account.current===id&&ticket===epoch.current)setError(e instanceof Error?e.message:'Image library unavailable');}},[id]);
 useEffect(()=>{setImages([]);setError('');void refresh();if(!id)return()=>{epoch.current++;};const timer=setInterval(()=>{if(AppState.currentState==='active')void refresh();},2700000),listener=AppState.addEventListener('change',state=>{if(state==='active')void refresh();});return()=>{epoch.current++;clearInterval(timer);listener.remove();};},[id,refresh]);
 return <MedicationImagesContext.Provider value={{images,refresh,error}}>{children}</MedicationImagesContext.Provider>;
}
