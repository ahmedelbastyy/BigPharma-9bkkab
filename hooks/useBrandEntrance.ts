import { useEffect } from 'react';
import { AccessibilityInfo } from 'react-native';
import { cancelAnimation, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

/** Wait for the actual motion preference before playing the first logo entrance. */
export function useBrandEntrance(active: boolean) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);
  useEffect(() => {
    if (!active) { opacity.value = 0; scale.value = 0.9; return; }
    let alive = true;
    const reveal = (reduced: boolean) => {
      if (!alive) return;
      cancelAnimation(opacity);
      cancelAnimation(scale);
      opacity.value = reduced ? 1 : withTiming(1, { duration: 240 });
      scale.value = reduced ? 1 : withSpring(1, { damping: 14, stiffness: 180, mass: 0.8 });
    };
    void AccessibilityInfo.isReduceMotionEnabled().then(reveal).catch(() => reveal(true));
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', reveal);
    return () => {
      alive = false;
      subscription.remove();
      cancelAnimation(opacity);
      cancelAnimation(scale);
    };
  }, [active, opacity, scale]);
  return useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ scale: scale.value }] }));
}
