import { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFloatingNavigation } from '@/hooks/useFloatingNavigation';
import { useReducedMotion } from '@/hooks/useViewport';
import { useKeyboardVisible } from '@/hooks/useKeyboardVisible';
import { Colors, Spacing, Radius, Layout, Typography, Shadow } from '@/constants/theme';
export type TabName = 'home' | 'coupons' | 'cabinet' | 'more' | 'scanner';
interface TabBarProps { activeTab: TabName; onTabPress: (tab: TabName) => void; onScanPress: () => void }
interface TabItemProps { id: TabName; icon: keyof typeof MaterialIcons.glyphMap; label: string; selected: boolean; onPress: (tab: TabName) => void }
const TabItem = memo(function TabItem({ id, icon, label, selected, onPress }: TabItemProps) {
  const highlight = useAnimatedStyle(() => ({ opacity: withTiming(selected ? 1 : 0, { duration: 180 }) }));
  return <Pressable onPress={() => onPress(id)} style={({ pressed }) => [styles.tab, pressed ? styles.pressed : null]} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected }}>
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.selected, highlight]} />
    <MaterialIcons name={icon} size={24} color={selected ? Colors.tabActive : Colors.tabInactive} />
  </Pressable>;
});
export const TabBar = memo(function TabBar({ activeTab, onTabPress, onScanPress }: TabBarProps) {
  const insets = useSafeAreaInsets();
  return <View pointerEvents="box-none" style={[styles.wrapper, { bottom: insets.bottom + Spacing.xs, paddingLeft: Math.max(Spacing.md, insets.left), paddingRight: Math.max(Spacing.md, insets.right) }]}><View pointerEvents="box-none" style={styles.inner}>
    <View style={styles.dock}>
      <TabItem id="home" icon="home" label="Home" selected={activeTab === 'home'} onPress={onTabPress} />
      <TabItem id="coupons" icon="local-offer" label="Savings" selected={activeTab === 'coupons'} onPress={onTabPress} />
      <TabItem id="cabinet" icon="medication" label="Cabinet" selected={activeTab === 'cabinet'} onPress={onTabPress} />
      <TabItem id="more" icon="person-outline" label="Profile" selected={activeTab === 'more'} onPress={onTabPress} />
    </View>
    <Pressable onPress={onScanPress} style={({ pressed }) => [styles.scan, activeTab==='scanner'?styles.scanSelected:null, pressed ? styles.pressed : null]} accessibilityRole="tab" accessibilityState={{selected:activeTab==='scanner'}} accessibilityLabel="Camera"><MaterialIcons name="photo-camera" size={26} color={Colors.tabInactive} /></Pressable>
  </View></View>;
});
const styles = StyleSheet.create({
  wrapper: { zIndex: 50, position: 'absolute', left: 0, right: 0, backgroundColor: Colors.transparent }, inner: { width: '100%', maxWidth: Layout.dockWidth, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  dock: { flex: 1, minWidth: 1, height: 60, flexDirection: 'row', backgroundColor: Colors.tabDock, borderRadius: Radius.full, padding: Spacing.xxs * 2, alignItems: 'center', borderWidth: 1, borderColor: Colors.borderLight, ...Shadow.md },
  tab: { flex: 1, minWidth: 1, minHeight: 48, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center', gap: Spacing.xxs }, label: { color: Colors.tabInactive, fontSize: Typography.xs, fontWeight: Typography.medium, includeFontPadding: false }, activeLabel: { color: Colors.tabActive }, selected: { backgroundColor: Colors.selectedBg, borderRadius: Radius.full }, pressed: { opacity: 0.65, transform: [{ scale: 0.97 }] },
  scanSelected: { borderColor: Colors.textPrimary, borderWidth: 2 },
  scan: { width: 52, height: 52, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.borderLight, backgroundColor: Colors.tabDock, alignItems: 'center', justifyContent: 'center', ...Shadow.sm },
});
