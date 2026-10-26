import { useCallback,useEffect,useRef,useState } from 'react';
import { AccessibilityInfo,AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSharedValue,withTiming,withSequence,withRepeat,Easing,runOnJS,cancelAnimation } from 'react-native-reanimated';
export function useMedicationAddedMotion(){const [ready,setReady]=useState(false),[reduced,setReduced]=useState(true),rotation=useSharedValue(0),float=useSharedValue(0),[settled,setSettled]=useState(false),started=useRef(false);
 useEffect(()=>{let alive=true;void AccessibilityInfo.isReduceMotionEnabled().then(value=>{if(alive){setReduced(value);setReady(true);}}).catch(()=>{if(alive)setReady(true);});const sub=AccessibilityInfo.addEventListener('reduceMotionChanged',setReduced);return()=>{alive=false;sub.remove();};},[]);
 const settle=useCallback(()=>setSettled(true),[]);
 useFocusEffect(useCallback(()=>{if(!ready)return;let timer:ReturnType<typeof setTimeout>|undefined;const stop=()=>{cancelAnimation(rotation);cancelAnimation(float);rotation.value=360;float.value=0;settle();};
 if(!started.current){started.current=true;if(reduced){rotation.value=360;settle();}else rotation.value=withTiming(360,{duration:1000,easing:Easing.inOut(Easing.cubic)},done=>{if(done)runOnJS(settle)();});}
 if(!reduced){timer=setTimeout(()=>{float.value=withRepeat(withSequence(withTiming(-4,{duration:1200}),withTiming(4,{duration:1200})),3,false);},1100);}const sub=AppState.addEventListener('change',s=>{if(s!=='active')stop();});return()=>{if(timer)clearTimeout(timer);sub.remove();stop();};},[ready,reduced,rotation,float,settle]));
 return {rotation,float,settled,reduced};
}
