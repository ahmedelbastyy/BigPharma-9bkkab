import { useCallback } from 'react';
import { Extrapolation,interpolate,useAnimatedScrollHandler,useAnimatedStyle,useSharedValue,runOnJS,type SharedValue } from 'react-native-reanimated';
import { useReducedMotion } from '@/hooks/useViewport';
import { useFloatingNavigation } from '@/hooks/useFloatingNavigation';
// Artwork stays inside its reserved normal-flow lane. Only a centered scale changes; no overlays or translation.
export function useMedicationDetailMotion(imageSize:number,contentWidth:number,heroHeight:number){
 const reducedMotion=useReducedMotion(),{notifyScroll}=useFloatingNavigation(),scrollY=useSharedValue(0),lastSignal=useSharedValue(0),safetyY=useSharedValue(0),usageY=useSharedValue(0);
 const onScroll=useAnimatedScrollHandler({onScroll:event=>{const y=Math.max(0,event.contentOffset.y);scrollY.value=y;if(Math.abs(y-lastSignal.value)>=20){lastSignal.value=y;runOnJS(notifyScroll)(y);}}});
 const recordSafety=useCallback((y:number)=>{safetyY.value=y;},[safetyY]),recordUsage=useCallback((y:number)=>{usageY.value=y;},[usageY]);
 const imageStyle=useAnimatedStyle(()=>({transform:[{scale:reducedMotion?1:interpolate(scrollY.value,[0,Math.max(1,heroHeight)],[1,.86],Extrapolation.CLAMP)}]}),[heroHeight,reducedMotion]);
 return {scrollY,onScroll,imageStyle,reducedMotion,recordSafety,recordUsage,safetyY,usageY};
}
export type DetailScrollValue=SharedValue<number>;
