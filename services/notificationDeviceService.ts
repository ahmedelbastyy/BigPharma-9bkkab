import type { PlannedDoseNotification } from './notificationPlanService';
export async function notificationPermission(_request=false){return {granted:false,supported:false,message:'Native reminders require an installed iOS or Android build.'};}
export async function reconcileNativeNotifications(_items:PlannedDoseNotification[]){return 0;}
export async function scheduleTestNotification(){throw new Error('Test notifications require an installed iOS or Android build.');}
export function listenForDoseNotification(_open:(id:string)=>void){return ()=>{};}
