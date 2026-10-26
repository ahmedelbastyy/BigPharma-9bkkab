import { getSupabaseClient } from '@/template';
let refreshing:ReturnType<ReturnType<typeof getSupabaseClient>['auth']['refreshSession']>|null=null;
export async function verifiedMedicationSession(){
 const client=getSupabaseClient();const current=await client.auth.getSession();
 if(current.error||!current.data.session) return {user:null,error:'Your session has ended. Please sign in again.'};
 if((current.data.session.expires_at||0)*1000<=Date.now()+60000){
  if(!refreshing)refreshing=client.auth.refreshSession();let result;
  try{result=await refreshing;}finally{refreshing=null;}
  if(result.error||!result.data.session)return {user:null,error:'Your session has expired. Please sign in again.'};
 }
 const verified=await client.auth.getUser();
 if(verified.error||!verified.data.user)return {user:null,error:'Your session could not be verified. Please sign in again.'};
 return {user:verified.data.user,error:null};
}
export function medicationOperationError(error:{message:string;code?:string;details?:string;hint?:string}|null,operation:string){
 if(!error)return null;
 console.error('Medication operation failed',{operation,code:error.code,message:error.message,details:error.details,hint:error.hint});
 if(error.code==='PGRST301'||error.code==='PGRST303')return 'Your session has expired. Please sign in again.';
 // Preserve actionable root-cause information; never relabel a database permission error as a session error.
 return `${error.message}${error.code?` (${error.code})`:''}`;
}
