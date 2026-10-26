import { useCallback, useEffect, useMemo, useState } from 'react';
import { Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCatalogReference } from '@/hooks/useCatalogReference';
import { useViewport } from '@/hooks/useViewport';
import { usePatientEducation } from '@/hooks/usePatientEducation';
import { buildDetailPage, medicationDetailLayout } from '@/services/medicationDetailPresentation';
import type { MedicationProfileInput } from '@/services/medicationProfileService';

export function useMedicationDetail(input:MedicationProfileInput) {
 const loaded=useCatalogReference(input.name,input.rxcui,input.strength,input.form,input.savedId,input.ndc,input.openfdaLabelId);
 // Approved photo metadata stays available for optional supporting images; the primary artwork is local.
 const profile=loaded;
 const viewport=useViewport(),router=useRouter(),insets=useSafeAreaInsets();
 const [sourcesOpen,setSourcesOpen]=useState(false),[fontScale,setFontScale]=useState(1);
 useEffect(()=>{
  const update=()=>setFontScale(Math.max(1,Dimensions.get('window').fontScale||1));
  update();const subscription=Dimensions.addEventListener('change',update);
  return()=>subscription.remove();
 },[]);
 useEffect(()=>{setSourcesOpen(false);},[input.savedId,input.rxcui,input.openfdaLabelId]);
 const details=profile.reference?.details??{};
 const model=useMemo(()=>buildDetailPage(input.name,details,input.strength,input.form),[input.name,input.strength,input.form,profile.reference]);
 const geometry=useMemo(()=>medicationDetailLayout(Math.max(1,viewport.width-insets.left-insets.right),fontScale,Math.max(1,viewport.height-insets.top-insets.bottom)),[viewport.width,viewport.height,insets.left,insets.right,insets.top,insets.bottom,fontScale]);
 const patient=usePatientEducation(profile.reference?.rxcui??input.rxcui);
 const links=patient.links.length?patient.links:details.medlinePlusLinks??[];
 const sources=useMemo(()=>Array.from(new Set([...(details.sourceUrls??[]),...Object.values(details.sectionSources??{}).map(source=>source.url),profile.reference?.sourceUrl].filter((url):url is string=>Boolean(url)))),[profile.reference]);
 const back=useCallback(()=>{if(router.canGoBack())router.back();else router.replace('/(tabs)/cabinet');},[router]);
 return {profile,details,model,geometry,viewport,links,patient,sources,sourcesOpen,setSourcesOpen,back};
}
