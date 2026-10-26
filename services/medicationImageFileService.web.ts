// This web entry point deliberately imports neither Expo FileSystem nor the native base64 codec.
export async function readMedicationImageFile(uri: string, _base64?: string): Promise<ArrayBuffer | Blob> {
  const response = await fetch(uri);
  if (!response.ok) throw new Error('Could not read this image. Please select the file again.');
  return response.blob();
}
