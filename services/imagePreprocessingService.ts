import * as ImageManipulator from 'expo-image-manipulator';
export async function prepareMedicationImage(uri: string): Promise<{ base64: string; mimeType: 'image/jpeg' }> {
  const image = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 1280 } }], { compress: 0.78, format: ImageManipulator.SaveFormat.JPEG, base64: true });
  if (!image.base64 || image.base64.length > 5_500_000) throw new Error('Image is too large to analyze. Try a smaller or clearer label photo.');
  return { base64: image.base64, mimeType: 'image/jpeg' };
}
