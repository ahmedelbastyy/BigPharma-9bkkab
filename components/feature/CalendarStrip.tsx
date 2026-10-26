import { memo } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography, Radius, Layout } from '@/constants/theme';
interface CalendarStripProps { selectedDate: Date; onDateSelect: (date: Date) => void }
export const CalendarStrip = memo(function CalendarStrip({ selectedDate, onDateSelect }: CalendarStripProps) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 14 }, (_, index) => { const date = new Date(today); date.setDate(date.getDate() + index - 3); return date; });
  return <View style={styles.rail}><FlatList horizontal data={days} keyExtractor={date => date.toISOString()} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.content} renderItem={({ item }) => {
    const selected = item.toDateString() === selectedDate.toDateString();
    return <Pressable onPress={() => onDateSelect(item)} accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={item.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })} style={({ pressed }) => [styles.day, selected ? styles.selected : null, pressed ? styles.pressed : null]}><Text style={[styles.label, selected ? styles.selectedText : null]}>{item.toLocaleDateString([], { weekday: 'short' })}</Text><Text style={[styles.number, selected ? styles.selectedText : null]}>{item.getDate()}</Text></Pressable>;
  }} /></View>;
});
const styles = StyleSheet.create({ rail: { minHeight: 64 }, content: { paddingHorizontal: Spacing.md, alignItems: 'center', gap: Spacing.xs }, day: { minWidth: Layout.touchTarget, minHeight: 60, padding: Spacing.xs, alignItems: 'center', justifyContent: 'center', gap: Spacing.xxs, borderRadius: Radius.md, backgroundColor: Colors.card }, selected: { backgroundColor: Colors.selected }, label: { fontSize: Typography.xs, color: Colors.textSecondary }, number: { fontSize: Typography.md, fontWeight: Typography.semibold, color: Colors.textPrimary }, selectedText: { color: Colors.background }, pressed: { opacity: 0.65 } });
