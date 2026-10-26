import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTutorial } from '@/hooks/useTutorial';
import { useReducedMotion } from '@/hooks/useViewport';
import { AuthButton, AuthMessage } from '@/components/auth/AuthControls';
import { ExperienceColors as C } from '@/constants/experience';
import { Spacing, Radius, Typography, Layout } from '@/constants/theme';
import { getTutorialCardLayout } from '@/services/responsiveLayoutService';
export function TutorialOverlay() {
  const tour = useTutorial(), insets = useSafeAreaInsets(), reduced = useReducedMotion();
  if (!tour.active && !tour.paused) return null;
  if (tour.paused || tour.availableHeight - insets.top < 300) return <View pointerEvents="box-none" style={[styles.resumeWrap, { top: insets.top + Spacing.xs }]}><Pressable onPress={tour.resume} style={({ pressed }) => [styles.resume, pressed ? styles.pressed : null]} accessibilityLabel="Resume introductory guide"><Text style={styles.resumeText}>Continue guide · {tour.index + 1}/{tour.count}</Text></Pressable></View>;
  const candidate = getTutorialCardLayout(tour.availableHeight, insets.top, tour.bottomClearance, tour.rect);
  // A short viewport can never support a readable card and a large highlight.
  // In that case, retain navigation and offer a real reveal action without a conflicting spotlight.
  const rect = candidate.height >= 172 ? tour.rect : null;
  const card = rect ? candidate : getTutorialCardLayout(tour.availableHeight, insets.top, tour.bottomClearance, null);
  const cardWidth = Math.max(1, Math.min(420, tour.viewport.width - Math.max(Spacing.md, insets.left) - Math.max(Spacing.md, insets.right)));
  return <View style={styles.overlay} pointerEvents="box-none">
    {rect ? <>
      <View style={[styles.dim, { left: 0, top: 0, right: 0, height: Math.max(1, rect.y) }]} />
      <View style={[styles.dim, { left: 0, top: rect.y, width: Math.max(1, rect.x), height: rect.height }]} />
      <View style={[styles.dim, { left: rect.x + rect.width, top: rect.y, right: 0, height: rect.height }]} />
      <View style={[styles.dim, { left: 0, top: rect.y + rect.height, right: 0, bottom: 0 }]} />
      <View pointerEvents="none" style={[styles.highlight, { left: rect.x, top: rect.y, width: rect.width, height: rect.height }]} />
    </> : <View style={[StyleSheet.absoluteFill, styles.dim]} pointerEvents="none" />}
    <Animated.View key={tour.index} entering={reduced ? undefined : FadeIn.duration(180)} style={[styles.card, { top: card.top, height: card.height, width: cardWidth, left: Math.max(0, (tour.viewport.width - cardWidth) / 2) }]}>
      <View style={styles.top}><Text style={styles.eyebrow}>YOUR FIRST LOOK · {tour.index + 1}/{tour.count}</Text><Pressable onPress={tour.pause} accessibilityLabel="Pause guide without completing it" style={({ pressed }) => [styles.pause, pressed ? styles.pressed : null]}><Text style={styles.secondary}>Pause</Text></Pressable></View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"><Text style={styles.title}>{tour.current.title}</Text><Text style={styles.body}>{tour.current.body}</Text>
        {tour.missingMedication ? <Text style={styles.body}>Your Cabinet is empty. Add a real medication when ready; no sample records are created.</Text> : null}
        {rect ? <Text style={styles.hint}>Try the highlighted control before continuing.</Text> : <Pressable onPress={tour.reveal} accessibilityLabel="Bring the current feature into view" style={({ pressed }) => [styles.reveal, pressed ? styles.pressed : null]}><Text style={styles.secondary}>Show this feature</Text></Pressable>}
        <AuthMessage text={tour.error} error />
      </ScrollView>
      <View style={styles.buttons}>{tour.index > 0 ? <Pressable style={({ pressed }) => [styles.back, pressed ? styles.pressed : null]} onPress={tour.back} disabled={tour.busy}><Text style={styles.secondary}>Back</Text></Pressable> : null}<View style={styles.next}><AuthButton label={tour.index === tour.count - 1 ? 'Start exploring' : 'Next'} onPress={tour.next} loading={tour.busy} /></View></View>
    </Animated.View>
  </View>;
}
const styles = StyleSheet.create({ overlay: { ...StyleSheet.absoluteFillObject, zIndex: 100 }, dim: { position: 'absolute', backgroundColor: C.veil }, highlight: { position: 'absolute', borderWidth: 1, borderColor: C.white, borderRadius: Radius.md }, card: { position: 'absolute', borderRadius: Radius.xl, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, overflow: 'hidden' }, top: { paddingHorizontal: Spacing.sm, flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }, eyebrow: { fontSize: Typography.xs, letterSpacing: 0.6, color: C.muted, flex: 1 }, pause: { minHeight: Layout.touchTarget, paddingHorizontal: Spacing.xs, justifyContent: 'center' }, secondary: { color: C.silver, fontSize: Typography.sm }, scroll: { flex: 1 }, content: { paddingHorizontal: Spacing.sm, paddingBottom: Spacing.xs, gap: Spacing.xs }, title: { color: C.white, fontSize: Typography.md, fontWeight: Typography.semibold, lineHeight: 24 }, body: { color: C.silver, fontSize: Typography.base, lineHeight: 25 }, hint: { color: C.white, fontSize: Typography.sm, lineHeight: 21 }, buttons: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.sm, paddingBottom: Spacing.xs }, back: { minHeight: Layout.touchTarget, paddingHorizontal: Spacing.sm, justifyContent: 'center' }, next: { flex: 1 }, pressed: { opacity: 0.6 }, reveal: { minHeight: Layout.touchTarget, justifyContent: 'center' }, resumeWrap: { position: 'absolute', right: Spacing.md, zIndex: 100 }, resume: { backgroundColor: C.surface, borderRadius: Radius.full, paddingHorizontal: Spacing.sm, minHeight: Layout.touchTarget, justifyContent: 'center', borderWidth: 1, borderColor: C.border }, resumeText: { color: C.white, fontSize: Typography.sm } });
