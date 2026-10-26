import { Linking } from 'react-native';
export async function openExternalLink(url: string): Promise<void> {
  if (!/^https:\/\//.test(url)) throw new Error('This link is not a secure URL.');
  await Linking.openURL(url);
}
