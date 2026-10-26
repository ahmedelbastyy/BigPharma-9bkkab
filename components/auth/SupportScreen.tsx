import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { useSupport } from '@/hooks/useSupport';
import { useReducedMotion } from '@/hooks/useViewport';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { AuthButton, AuthMessage } from '@/components/auth/AuthControls';
import { BrandMark } from '@/components/ui/BrandMark';
import { ExperienceColors as C, authImages } from '@/constants/experience';
import { Spacing, Radius, Typography } from '@/constants/theme';
export function SupportScreen() {
  const support = useSupport();
  const layout = useResponsiveLayout();
  const reduced = useReducedMotion();
  return <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={styles.root}>
    <Image source={authImages[4]} contentFit="cover" transition={200} style={StyleSheet.absoluteFill} />
    <LinearGradient colors={[C.transparent, C.veil, C.black]} style={StyleSheet.absoluteFill} />
    <View style={[styles.brand, { top: layout.insets.top + Spacing.sm }]}><BrandMark width={150} /></View>
    <Animated.View entering={reduced ? undefined : SlideInDown.springify().damping(25).stiffness(210)} style={[styles.panel, { height: Math.min(layout.sheetHeight, Math.max(1, layout.usableHeight - 72)) }]}>
      <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { padding: layout.padding }]} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { fontSize: layout.pageTitle }]}>Support BigPharma</Text>
        <Text style={styles.subtitle}>Help us continue building tools that make medication information and pharmacy savings more accessible.</Text>
        <View style={styles.benefits}>
          {[{ icon: 'people-outline', title: 'Support independent development', body: 'Help sustain thoughtful, independent tools.' }, { icon: 'bar-chart', title: 'Help fund new features', body: 'Contribute to improvements and ongoing work.' }, { icon: 'favorite-border', title: 'Be part of the mission', body: 'Make medication information more accessible.' }].map(item => <View key={item.title} style={styles.benefit}><View style={styles.benefitIcon}><MaterialIcons name={item.icon as any} size={24} color={C.white} /></View><View style={styles.benefitText}><Text style={styles.benefitTitle}>{item.title}</Text><Text style={styles.small}>{item.body}</Text></View></View>)}
        </View>
        <Text style={styles.proposed}>PROPOSED AMOUNTS · NOT YET FOR SALE</Text>
        {support.proposedContributions.map(product => <Pressable key={product.id} onPress={() => support.setSelected(product.id)} style={({ pressed }) => [styles.product, support.selected === product.id ? styles.productSelected : null, pressed ? styles.pressed : null]} accessibilityRole="button" accessibilityState={{ selected: support.selected === product.id }} accessibilityLabel={`${product.title}, proposed ${product.price} ${product.period}, not yet available`}>
          <MaterialIcons name={support.selected === product.id ? 'check-circle' : 'radio-button-unchecked'} color={support.selected === product.id ? C.white : C.muted} size={26} />
          <View style={styles.benefitText}><Text style={styles.benefitTitle}>{product.title}</Text><Text style={styles.small}>{product.price} {product.period}</Text></View>
        </Pressable>)}
        <Text style={styles.small}>{support.availability.message}</Text>
        <AuthButton label="Support BigPharma" onPress={support.requestSupport} />
        <AuthMessage text={support.error} error />
        <AuthButton secondary label="Continue for free" onPress={support.continueForFree} loading={support.busy} />
        <Text style={styles.footer}>Entirely optional. Skipping does not limit your access. Contributions are not charitable donations or tax-deductible gifts.</Text>
      </ScrollView>
    </Animated.View>
  </SafeAreaView>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: C.black, justifyContent: 'flex-end' }, brand: { position: 'absolute', top: Spacing.xl, alignSelf: 'center' }, panel: { width: '100%', maxWidth: 640, alignSelf: 'center', backgroundColor: C.surface, borderTopLeftRadius: Radius.xxl, borderTopRightRadius: Radius.xxl, borderWidth: 1, borderColor: C.border, overflow: 'hidden' }, scroll: { flex: 1 }, content: { padding: Spacing.xl, paddingBottom: Spacing.xxl, gap: Spacing.sm }, title: { fontSize: Typography.xxxl, color: C.white, fontWeight: Typography.bold, letterSpacing: -1, textAlign: 'center', marginTop: Spacing.xs }, subtitle: { color: C.silver, fontSize: Typography.base, lineHeight: 26, textAlign: 'center' }, benefits: { gap: Spacing.sm, marginVertical: Spacing.xs }, benefit: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md }, benefitIcon: { width: 36, height: 36, borderRadius: Radius.full, borderWidth: 1, borderColor: C.border, backgroundColor: C.elevated, alignItems: 'center', justifyContent: 'center' }, benefitText: { flex: 1, minWidth: 1 }, benefitTitle: { color: C.white, fontSize: Typography.base, fontWeight: Typography.medium, lineHeight: 24 }, small: { color: C.muted, fontSize: Typography.sm, lineHeight: 22 }, proposed: { color: C.muted, fontSize: Typography.sm, letterSpacing: 1.2 }, product: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center', minHeight: 64, padding: Spacing.sm, borderRadius: Radius.xl, borderColor: C.border, borderWidth: 1, backgroundColor: C.black }, productSelected: { borderColor: C.white, borderWidth: 1 }, pressed: { opacity: 0.65 }, footer: { color: C.muted, fontSize: Typography.sm, lineHeight: 22, textAlign: 'center' } });
