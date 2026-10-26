import { useEffect, useState } from 'react';
import { Dimensions, AccessibilityInfo, Platform } from 'react-native';
export function useViewport() {
  const [size, setSize] = useState({ width: 375, height: 667 });
  useEffect(() => {
    const update = () => {
      const value = Dimensions.get('window');
      const visual = Platform.OS === 'web' && typeof window !== 'undefined' ? window.visualViewport : null;
      const width = Math.max(1, visual?.width || value.width || 375);
      const height = Math.max(1, visual?.height || value.height || 667);
      setSize(previous => previous.width === width && previous.height === height ? previous : { width, height });
    };
    update();
    const subscription = Dimensions.addEventListener('change', update);
    const visual = Platform.OS === 'web' && typeof window !== 'undefined' ? window.visualViewport : null;
    visual?.addEventListener('resize', update);
    return () => { subscription.remove(); visual?.removeEventListener('resize', update); };
  }, []);
  return size;
}
export function useReducedMotion() {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (alive) setReduced(value); }).catch(() => { if (alive) setReduced(true); });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { alive = false; subscription.remove(); };
  }, []);
  return reduced;
}
