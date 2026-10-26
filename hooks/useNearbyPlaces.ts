import { useCallback,useEffect,useMemo,useRef,useState } from 'react';
import { AppState,InteractionManager } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAlert } from '@/template';
import { askLocationPermission,readLocationPermission,currentPlaceLocation,fetchNearbyPlaces,copyPlaceAddress,openPlaceExternally,openLocationSettings } from '@/services/nearbyPlaceService';
import { placeDistance,type PlaceCoordinate,type PlaceCategory,type NearbyPlace } from '@/services/nearbyPlaceRules';
import { meaningfulViewportChange,viewportRadius,type PlaceViewport } from '@/services/nearbyMapService';
import { reconcilePlaceResults } from '@/services/nearbyMarkerService';
import { useAuth } from '@/hooks/useAuth';
type State='checking'|'permission'|'denied'|'loading'|'ready'|'error';
export function useNearbyPlaces(){
 const {user}=useAuth(),{showAlert}=useAlert(),[active,setActive]=useState(false),[expanded,setExpanded]=useState(false),[status,setStatus]=useState<State>('checking'),[places,setPlaces]=useState<NearbyPlace[]>([]),[coordinate,setCoordinate]=useState<PlaceCoordinate|null>(null),[category,setCategory]=useState<PlaceCategory>('pharmacies'),[selectedId,setSelectedId]=useState(''),[error,setError]=useState(''),[copied,setCopied]=useState(''),[canAsk,setCanAsk]=useState(true);
 const epoch=useRef(0),controller=useRef<AbortController|null>(null),location=useRef<PlaceCoordinate|null>(null),categoryRef=useRef<PlaceCategory>('pharmacies'),focused=useRef(false),loadedAt=useRef(0),failed=useRef(false),viewport=useRef<PlaceViewport|null>(null),panTimer=useRef<ReturnType<typeof setTimeout>|null>(null),permissionDenied=useRef(false),owner=useRef(user?.id||'');owner.current=user?.id||'';
 const cancel=useCallback(()=>{epoch.current++;controller.current?.abort();controller.current=null;if(panTimer.current)clearTimeout(panTimer.current);panTimer.current=null;},[]);
 const load=useCallback(async(requestPermission=false,nextCategory:PlaceCategory=categoryRef.current,target?:PlaceViewport,force=false)=>{
  if(!focused.current||!owner.current)return;
  cancel();const generation=epoch.current,abort=new AbortController();controller.current=abort;setError('');setCopied('');setStatus('checking');
  const alive=()=>focused.current&&generation===epoch.current&&!abort.signal.aborted;
  try{const permission=await(requestPermission?askLocationPermission():readLocationPermission());if(!alive())return;setCanAsk(permission.canAskAgain);permissionDenied.current=!permission.granted;
   if(!permission.granted){location.current=null;viewport.current=null;setCoordinate(null);setPlaces([]);setSelectedId('');setStatus(permission.status==='denied'?'denied':'permission');return;}
   setStatus('loading');const point=location.current??await currentPlaceLocation(abort.signal);if(!alive())return;location.current=point;setCoordinate(previous=>previous&&placeDistance(previous,point)<100?previous:point);
   const area=target||viewport.current||{...point,latitudeDelta:.32,longitudeDelta:.32};viewport.current=area;
   const next=await fetchNearbyPlaces(area,nextCategory,abort.signal,owner.current,target?viewportRadius(area):25000,force);if(!alive())return;
   loadedAt.current=Date.now();failed.current=false;setPlaces(previous=>reconcilePlaceResults(previous,next));setSelectedId(old=>next.some(p=>p.id===old)?old:next[0]?.id||'');setStatus('ready');
  }catch(e){if(alive()){failed.current=true;setError(e instanceof Error?e.message:'Nearby search failed.');setStatus('error');}}finally{if(controller.current===abort)controller.current=null;}
 },[cancel]);
 const loadRef=useRef(load);loadRef.current=load;
 useEffect(()=>{cancel();location.current=null;viewport.current=null;loadedAt.current=0;failed.current=false;setCoordinate(null);setPlaces([]);setSelectedId('');setError('');setStatus('checking');},[user?.id,cancel]);
 // Single focus-owned pipeline replaces competing mount/focus loads. Blur aborts GPS, queued work and requests.
 useFocusEffect(useCallback(()=>{
  focused.current=true;let alive=true;const task=InteractionManager.runAfterInteractions(()=>{if(!alive)return;setActive(true);if(!failed.current&&(!loadedAt.current||Date.now()-loadedAt.current>300000))void loadRef.current();});
  const sub=AppState.addEventListener('change',state=>{if(state!=='active'||!alive)return;void readLocationPermission().then(permission=>{if(!alive)return;setCanAsk(permission.canAskAgain);if(!permission.granted){cancel();permissionDenied.current=true;location.current=null;viewport.current=null;setCoordinate(null);setPlaces([]);setStatus(permission.status==='denied'?'denied':'permission');}else if(permissionDenied.current){permissionDenied.current=false;void loadRef.current();}}).catch(()=>{});});
  return()=>{alive=false;focused.current=false;setActive(false);task.cancel();sub.remove();cancel();};
 },[user?.id,cancel]));
 const changeCategory=useCallback((next:PlaceCategory)=>{if(next===categoryRef.current)return;categoryRef.current=next;setCategory(next);setExpanded(false);setSelectedId('');void load(false,next);},[load]);
 const onViewportChange=useCallback((next:PlaceViewport)=>{if(!focused.current||!meaningfulViewportChange(viewport.current,next))return;if(panTimer.current)clearTimeout(panTimer.current);panTimer.current=setTimeout(()=>{panTimer.current=null;if(meaningfulViewportChange(viewport.current,next))void loadRef.current(false,categoryRef.current,next);},600);},[]);
 const retry=useCallback(()=>{failed.current=false;setExpanded(false);void load(false,categoryRef.current,undefined,true);},[load]),enable=useCallback(()=>{void load(true);},[load]);
 const sortedPlaces=useMemo(()=>places.map(p=>({...p,distanceMeters:coordinate?placeDistance(coordinate,p):p.distanceMeters})).sort((a,b)=>a.distanceMeters-b.distanceMeters),[places,coordinate]),visiblePlaces=useMemo(()=>expanded?sortedPlaces:sortedPlaces.slice(0,3),[sortedPlaces,expanded]),selected=useMemo(()=>sortedPlaces.find(p=>p.id===selectedId)??null,[sortedPlaces,selectedId]);
 const toggleExpanded=useCallback(()=>setExpanded(v=>!v),[]);
 const copy=useCallback(async(place:NearbyPlace)=>{try{await copyPlaceAddress(place);if(focused.current)setCopied(place.id);}catch(e){showAlert('Address could not be copied',e instanceof Error?e.message:'Please retry.');}},[showAlert]);
 const open=useCallback(async(place:NearbyPlace)=>{try{await openPlaceExternally(place);}catch{showAlert('Maps could not open','Please try again or copy the address.');}},[showAlert]);
 const settings=useCallback(async()=>{try{await openLocationSettings();}catch{showAlert('Location permission','Allow location access in your device or browser settings, then retry.');}},[showAlert]);
 return {active,expanded,toggleExpanded,visiblePlaces,status,places:sortedPlaces,coordinate,category,changeCategory,selected,select:setSelectedId,error,copied,canAsk,enable,retry,copy,open,settings,onViewportChange};
}
