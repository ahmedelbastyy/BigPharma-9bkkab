import * as ImagePicker from 'expo-image-picker';
export async function pickMedicationPhoto(): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error('Allow photo library access to select a medication label.');
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85, base64: false });
  return result.canceled ? null : result.assets[0]?.uri ?? null;
}
