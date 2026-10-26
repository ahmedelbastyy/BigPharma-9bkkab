import { useCallback,useEffect,useMemo,useRef,useState } from 'react';
import { AppState,PanResponder } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSharedValue,withTiming,runOnJS,Easing,cancelAnimation } from 'react-native-reanimated';
import { useReducedMotion } from '@/hooks/useViewport';
export const cabinetCarouselTiming={interval:2500,duration:500} as const;
export function useCabinetCarousel(count:number){const [focused,setFocused]=useState(false),[center,setCenter]=useState(0),progress=useSharedValue(0),target=useRef(0),lock=useRef(false),reduced=useReducedMotion();
 const settle=useCallback(()=>{lock.current=false;setCenter(target.current);},[]);
 const stop=useCallback(()=>{cancelAnimation(progress);progress.value=target.current;settle();},[progress,settle]);
 useFocusEffect(useCallback(()=>{setFocused(true);return()=>{setFocused(false);stop();};},[stop]));
 useEffect(()=>{cancelAnimation(progress);target.current=count?((target.current%count)+count)%count:0;progress.value=target.current;lock.current=false;setCenter(target.current);},[count,progress]);
 const rotate=useCallback((direction=1)=>{if(count<2||lock.current)return;lock.current=true;target.current+=direction;if(reduced){progress.value=target.current;settle();return;}progress.value=withTiming(target.current,{duration:cabinetCarouselTiming.duration,easing:Easing.inOut(Easing.cubic)},done=>{if(done)runOnJS(settle)();});},[count,reduced,progress,settle]);
 const move=useRef(rotate);move.current=rotate;
 const pan=useMemo(()=>PanResponder.create({onMoveShouldSetPanResponder:(_,g)=>Math.abs(g.dx)>16&&Math.abs(g.dx)>Math.abs(g.dy),onPanResponderRelease:(_,g)=>{if(Math.abs(g.dx)>20)move.current(g.dx<0?1:-1);},onPanResponderTerminate:()=>{}}),[]);
 useEffect(()=>{if(reduced||!focused||count<2)return;const timer=setInterval(()=>{if(AppState.currentState==='active')rotate();},cabinetCarouselTiming.interval),sub=AppState.addEventListener('change',s=>{if(s!=='active')stop();});return()=>{clearInterval(timer);sub.remove();stop();};},[rotate,reduced,focused,count,stop]);
 return {progress,center,panHandlers:pan.panHandlers};
}
