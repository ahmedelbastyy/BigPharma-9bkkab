import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabaseClient } from '@/template';
import { deviceTimezone } from './scheduleService';
export interface NotificationPreferences {enabled:boolean;dose_reminders:boolean;low_inventory_alerts:boolean;refill_alerts:boolean;expiration_alerts:boolean;advance_minutes:number}
export const defaultNotificationPreferences:NotificationPreferences={enabled:false,dose_reminders:true,low_inventory_alerts:false,refill_alerts:false,expiration_alerts:false,advance_minutes:10};
function normalize(prefs:Partial<NotificationPreferences>):NotificationPreferences{const result={...defaultNotificationPreferences,...prefs};if(![5,10,15,30].includes(result.advance_minutes))result.advance_minutes=10;return result;}
export async function readNotificationPreferences(userId:string){
 const {data,error}=await getSupabaseClient().from('user_notification_preferences').select('enabled,dose_reminders,low_inventory_alerts,refill_alerts,expiration_alerts,advance_minutes').eq('user_id',userId).maybeSingle();
 if(error){const local=await AsyncStorage.getItem(`notification-preferences:${userId}`);if(local){try{return normalize(JSON.parse(local));}catch{/* Invalid cache cannot replace server preferences. */}}throw new Error(error.message);}
 const prefs=normalize(data||{});await AsyncStorage.setItem(`notification-preferences:${userId}`,JSON.stringify(prefs));return prefs;
}
export async function saveNotificationPreferences(userId:string,prefs:NotificationPreferences){
 if(![5,10,15,30].includes(prefs.advance_minutes))throw new Error('Choose 5, 10, 15 or 30 minutes before your dose.');
 const {error}=await getSupabaseClient().from('user_notification_preferences').upsert({...prefs,user_id:userId,timezone:deviceTimezone(),updated_at:new Date().toISOString()});if(error)throw new Error(error.message);
 await AsyncStorage.multiSet([[`notification-preferences:${userId}`,JSON.stringify(prefs)],[`notification-setup:${userId}`,'configured']]);
}
// First confirmed schedule may offer native permission. Never override an existing Off choice,
// including a choice synchronized from another device. Never prompt during registration.
export async function medicationReminderSetupNeeded(userId:string){
 if(await AsyncStorage.getItem(`notification-setup:${userId}`))return false;
 const {data,error}=await getSupabaseClient().from('user_notification_preferences').select('user_id').eq('user_id',userId).maybeSingle();if(error)throw new Error(error.message);return !data;
}
export async function readNotificationPreference(userId:string){return (await readNotificationPreferences(userId)).enabled;}
export async function saveNotificationPreference(userId:string,enabled:boolean){await saveNotificationPreferences(userId,{...await readNotificationPreferences(userId),enabled});}
