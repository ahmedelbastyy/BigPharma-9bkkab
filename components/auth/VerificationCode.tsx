import { useRef } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { ExperienceColors as C, experienceConfig } from '@/constants/experience';
import { Radius, Spacing, Typography } from '@/constants/theme';
interface VerificationCodeProps { value: string; onChange: (value: string) => void; onSubmit: () => void; disabled?: boolean }
export function VerificationCode({ value, onChange, onSubmit, disabled = false }: VerificationCodeProps) {
  const input = useRef<TextInput>(null);
  const count = experienceConfig.otpLength;
  return <Pressable onPress={() => input.current?.focus()} style={({ pressed }) => [styles.wrap, pressed ? styles.pressed : null]} accessibilityLabel={`${count}-digit email verification code`}>
    <View style={styles.row} pointerEvents="none">
      {Array.from({ length: count }, (_, index) => <View key={index} style={[styles.box, index === Math.min(value.length, count - 1) ? styles.active : null]}><Text style={styles.digit}>{value[index] || ''}</Text></View>)}
    </View>
    <TextInput ref={input} style={styles.nativeInput} value={value} onChangeText={text => onChange(text.replace(/\D/g, '').slice(0, count))} keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="one-time-code" autoFocus maxLength={64} editable={!disabled} onSubmitEditing={onSubmit} caretHidden accessibilityLabel={`Enter the ${count}-digit code. You can paste the entire code.`} />
  </Pressable>;
}
const styles = StyleSheet.create({ wrap: { position: 'relative', marginVertical: Spacing.xs }, row: { flexDirection: 'row', gap: Spacing.xs }, box: { flex: 1, minWidth: 1, minHeight: 52, paddingVertical: Spacing.sm, borderRadius: Radius.md, borderColor: C.border, borderWidth: 1, backgroundColor: C.surface, justifyContent: 'center', alignItems: 'center' }, active: { borderColor: C.white, borderWidth: 2 }, digit: { color: C.white, fontSize: Typography.xxl, fontWeight: Typography.medium, includeFontPadding: false }, nativeInput: { position: 'absolute', width: '100%', height: '100%', opacity: 0.025, color: C.transparent }, pressed: { opacity: 0.85 } });
