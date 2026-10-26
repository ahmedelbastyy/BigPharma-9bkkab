import { useCallback,useEffect,useRef,useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Asset } from 'expo-asset';
import { useSharedValue,withTiming,cancelAnimation,Easing } from 'react-native-reanimated';
import { homeBannerImages,homeVisualTiming } from '@/constants/homeBanner';
import { useReducedMotion } from '@/hooks/useViewport';
export function useHomeBanner(){const [focused,setFocused]=useState(false),[ready,setReady]=useState(false),loaded=useRef(new Set<number>()),from=useSharedValue(0),to=useSharedValue(0),fade=useSharedValue(1),reduced=useReducedMotion();
 const markLoaded=useCallback((id:number)=>{loaded.current.add(id);if(loaded.current.size===homeBannerImages.length)setReady(true);},[]);
 useEffect(()=>{void Asset.loadAsync([...homeBannerImages]).catch(()=>{});},[]);
 useFocusEffect(useCallback(()=>{setFocused(true);return()=>setFocused(false);},[]));
 useEffect(()=>{if(!ready||!focused||reduced){cancelAnimation(fade);fade.value=1;return;}const timer=setInterval(()=>{if(AppState.currentState!=='active')return;from.value=to.value;to.value=(to.value+1)%homeBannerImages.length;fade.value=0;fade.value=withTiming(1,{duration:homeVisualTiming.fade,easing:Easing.inOut(Easing.quad)});},homeVisualTiming.interval);const sub=AppState.addEventListener('change',state=>{if(state!=='active'){cancelAnimation(fade);fade.value=1;}});return()=>{clearInterval(timer);sub.remove();cancelAnimation(fade);fade.value=1;};},[ready,focused,reduced,from,to,fade]);
 return {from,to,fade,markLoaded};
}
