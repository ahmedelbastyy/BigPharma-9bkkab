import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { openExternalLink } from './linkService';
import { safeProviderReferenceUrl } from './referenceLinkService';
export async function openPriceGuideBrowser(url:string){const safe=safeProviderReferenceUrl(url);if(!safe)throw new Error('Source URL unavailable.');if(Platform.OS==='web'){await openExternalLink(safe);return;}await WebBrowser.openBrowserAsync(safe,{presentationStyle:WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,showTitle:true,enableBarCollapsing:false});}
