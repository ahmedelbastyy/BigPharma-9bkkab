import { memo,useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import Animated,{useSharedValue,useAnimatedStyle,withTiming,cancelAnimation,type SharedValue} from 'react-native-reanimated';
import { useReducedMotion } from '@/hooks/useViewport';
import { Colors } from '@/constants/theme';
interface FrozenScanFrameProps {uri:string;height:number;visibleHeight?:SharedValue<number>}
export const FrozenScanFrame=memo(function FrozenScanFrame({uri,height,visibleHeight}:FrozenScanFrameProps){const reduced=useReducedMotion(),size=useSharedValue(Math.max(1,height));useEffect(()=>{size.value=withTiming(Math.max(1,height*.36),{duration:reduced?0:240});return()=>cancelAnimation(size);},[uri,height,reduced,size]);const frame=useAnimatedStyle(()=>({height:Math.max(1,visibleHeight?visibleHeight.value:size.value)}));return <Animated.View testID="frozen-scan-photo" style={[styles.frame,frame]}><Image source={{uri}} style={StyleSheet.absoluteFill} contentFit="contain" transition={0} accessibilityLabel="Captured medication label. Live camera has stopped."/></Animated.View>;});
const styles=StyleSheet.create({frame:{position:'absolute',top:0,left:0,right:0,backgroundColor:Colors.background}});
