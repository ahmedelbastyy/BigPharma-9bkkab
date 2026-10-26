import { useEffect, useRef, type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { usePathname } from 'expo-router';
import { useExperience } from '@/hooks/useExperience';
interface TourTargetProps { id: string; children: ReactNode; style?: StyleProp<ViewStyle>; onReveal?: () => void }
export function TourTarget({ id, children, style, onReveal }: TourTargetProps) {
  const ref = useRef<View>(null);
  const reveal = useRef(onReveal); reveal.current = onReveal;
  const route = usePathname();
  const { registerAnchor } = useExperience();
  useEffect(() => registerAnchor(id, { ref, route, reveal: () => reveal.current?.() }), [id, route, registerAnchor]);
  return <View ref={ref} collapsable={false} style={style}>{children}</View>;
}
