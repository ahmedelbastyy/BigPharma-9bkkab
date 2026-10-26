import { memo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useScanClinicalProfile } from '@/hooks/useScanClinicalProfile';
import type { ScanCandidate } from '@/services/scannerService';
import { MedicationInformationSections } from './medication-detail/MedicationInformationSections';
import { ScanMedicationSummary } from './ScanMedicationSummary';
import { MedicationBottle } from './MedicationBottle';
import { useLegalLinks } from '@/hooks/useLegalLinks';
import { Colors as C, Spacing as S, Typography as T, Layout } from '@/constants/theme';

interface ScanClinicalContentProps { candidate: ScanCandidate }
export const ScanClinicalContent = memo(function ScanClinicalContent({ candidate }: ScanClinicalContentProps) {
  const s = useScanClinicalProfile(candidate), open = useLegalLinks(), router = useRouter();
  const identity = s.identification;
  const details = s.ready ? s.profile.reference?.details : undefined;
  const sourceUrl = details?.splSetId ? `https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=${encodeURIComponent(details.splSetId)}` : undefined;
  return <View style={styles.content}>
    <View style={styles.hero}>
      <View style={styles.flex}>
        <Text style={styles.title}>{identity.name}</Text>
        {identity.canPreview ? <Text style={styles.body}>{[identity.strength, identity.form].filter(Boolean).join(' · ') || 'Strength or form not readable'}</Text> : null}
        <Text style={styles.caption}>{identity.status}</Text>
      </View>
      {identity.canPreview ? <MedicationBottle name={identity.name} strength={identity.strength} form={identity.form} size={112} /> : null}
    </View>
    {identity.canPreview ? <>
      <ScanMedicationSummary summary={s.summary} loading={!s.summary && s.profile.loading} onOpen={open} />
      <Pressable testID="scan-full-information-toggle" accessibilityRole="button" accessibilityState={{ expanded: s.detailsExpanded }} onPress={s.toggleDetails} style={({ pressed }) => [styles.link, pressed ? styles.pressed : null]}>
        <Text style={styles.linkText}>{s.detailsExpanded ? 'Hide full medication information & safety' : 'Full medication information & safety'}</Text>
      </Pressable>
      {s.detailsExpanded ? <View testID="scan-full-information" style={styles.content}>
        {s.ready && s.profile.approved ? <MedicationInformationSections name={identity.name} model={s.model} content={details?.medicationSections} headingSize={26} sourceUrl={sourceUrl} />
          : s.profile.loading ? <Text style={styles.body}>Loading saved product information. The general summary above does not confirm your prescription.</Text>
            : <Text style={styles.body}>Full verified product information is unavailable for this label match. No prescription has been added.</Text>}
        {s.summary ? <Pressable accessibilityRole="link" onPress={() => open(s.summary!.sourceUrl)} style={({ pressed }) => [styles.link, pressed ? styles.pressed : null]}>
          <Text style={styles.linkText}>Read complete {s.summary.source} safety information</Text>
        </Pressable> : null}
        {sourceUrl ? <Pressable accessibilityRole="link" onPress={() => open(sourceUrl)} style={({ pressed }) => [styles.link, pressed ? styles.pressed : null]}>
          <Text style={styles.linkText}>Read complete official labeling</Text>
        </Pressable> : null}
        {s.ready && s.matched ? <Pressable accessibilityRole="button" onPress={() => router.push(`/medication/catalog-${s.matched!.rxcui}` as any)} style={({ pressed }) => [styles.link, pressed ? styles.pressed : null]}>
          <Text style={styles.linkText}>Open medication information</Text>
        </Pressable> : null}
        {s.profile.error ? <Pressable accessibilityRole="button" onPress={s.profile.retry} style={({ pressed }) => [styles.link, pressed ? styles.pressed : null]}>
          <Text style={styles.linkText}>Retry information lookup</Text>
        </Pressable> : null}
      </View> : null}
    </> : <Text style={styles.body}>The medication name is not clear enough to show a reliable summary. Scan Again with a clearer label, or search the medication library.</Text>}
  </View>;
});
const styles = StyleSheet.create({
  content: { gap: S.md }, hero: { flexDirection: 'row', alignItems: 'center', gap: S.xs }, flex: { flex: 1, minWidth: 1 },
  title: { color: C.textPrimary, fontSize: T.xxl, fontWeight: T.semibold, letterSpacing: -0.8, includeFontPadding: false },
  body: { color: C.textSecondary, fontSize: T.base, lineHeight: 26, includeFontPadding: false },
  caption: { color: C.textSecondary, fontSize: T.sm, lineHeight: 22, includeFontPadding: false },
  link: { minHeight: Layout.touchTarget, justifyContent: 'center' },
  linkText: { color: C.textPrimary, fontSize: T.base, fontWeight: T.medium, lineHeight: 24, includeFontPadding: false },
  pressed: { opacity: 0.65 },
});
