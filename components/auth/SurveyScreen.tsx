import { View, Text, Pressable, TextInput, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import { AuthFrame } from '@/components/auth/AuthFrame';
import { AuthButton, AuthMessage } from '@/components/auth/AuthControls';
import { FocusableInput } from '@/components/ui/FocusableInput';
import { useSurvey } from '@/hooks/useSurvey';
import { useReducedMotion } from '@/hooks/useViewport';
import { useLegalLinks } from '@/hooks/useLegalLinks';
import { ExperienceColors as C, experienceConfig, surveySteps } from '@/constants/experience';
import { Typography, Spacing, Radius } from '@/constants/theme';
export function SurveyScreen() {
  const survey = useSurvey();
  const reduced = useReducedMotion();
  const open = useLegalLinks();
  const selected = survey.answers[survey.current.key] ?? [];
  return <AuthFrame title={survey.current.title} subtitle={survey.current.subtitle} onBack={survey.step > 0 ? survey.back : undefined} progress={`PERSONALIZE · ${survey.step + 1} / ${surveySteps.length}`}>
    <Animated.View key={survey.current.key} entering={reduced ? undefined : FadeIn.duration(220)} style={styles.content}>
      {survey.current.key === 'name' ? <><Text style={styles.label}>Display name (optional)</Text><FocusableInput style={styles.input} value={survey.answers.name?.[0] ?? ''} onChangeText={survey.setName} placeholder="Your name" placeholderTextColor={C.muted} autoCapitalize="words" accessibilityLabel="Optional display name" /></> : survey.current.options.map(option => <Pressable key={option} disabled={survey.busy} onPress={() => survey.toggle(option)} style={({ pressed }) => [styles.option, selected.includes(option) ? styles.selected : null, pressed ? styles.pressed : null]} accessibilityRole="button" accessibilityState={{ selected: selected.includes(option) }}><Text style={[styles.optionText, selected.includes(option) ? styles.selectedText : null]}>{option}</Text><MaterialIcons name={selected.includes(option) ? 'check-circle' : 'radio-button-unchecked'} size={22} color={selected.includes(option) ? C.black : C.muted} /></Pressable>)}
      {survey.current.key === 'privacy' ? <Pressable style={({ pressed }) => [styles.linkButton, pressed ? styles.pressed : null]} onPress={() => open(experienceConfig.privacyUrl)}><Text style={styles.link}>Read how your information is processed</Text></Pressable> : null}
      <AuthMessage text={survey.error} error />
      <AuthButton label={survey.step === surveySteps.length - 1 ? 'Meet your new Cabinet' : 'Continue'} loading={survey.busy} onPress={() => survey.advance()} />
      <AuthButton secondary label={survey.step === surveySteps.length - 1 ? 'Continue without AI consent' : 'Skip this question'} disabled={survey.busy} onPress={() => survey.advance(true)} />
      <Text style={styles.note}>Optional answers are saved privately to your account. No notification permission is requested during this introduction.</Text>
    </Animated.View>
  </AuthFrame>;
}
const styles = StyleSheet.create({ content: { gap: Spacing.sm }, label: { color: C.silver, fontSize: Typography.base }, input: { textAlign:'left',textAlignVertical:'center',includeFontPadding:false,paddingVertical:Spacing.xs,minHeight: 50, borderRadius: Radius.lg, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, color: C.white, fontSize: Typography.base, paddingHorizontal: Spacing.md }, option: { minHeight: 50, borderRadius: Radius.full, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }, selected: { backgroundColor: C.white, borderColor: C.white }, optionText: { flex: 1, minWidth: 1, color: C.silver, fontSize: Typography.base, lineHeight: 24 }, selectedText: { color: C.black, fontWeight: Typography.semibold }, pressed: { opacity: 0.65 }, linkButton: { minHeight: 48, justifyContent: 'center' }, link: { fontSize: Typography.base, color: C.silver, textDecorationLine: 'underline' }, note: { color: C.muted, fontSize: Typography.sm, lineHeight: 22, textAlign: 'center' } });
