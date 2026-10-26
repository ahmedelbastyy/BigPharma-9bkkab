import { getSupabaseClient } from '@/template';
export interface MedicationRequest { id:string; medication_name:string; details:string|null; requested_at:string; review_status:'pending'|'approved'|'rejected'; catalog_id:string|null; review_notes:string|null }
export async function fetchMedicationRequests(){const {data,error}=await getSupabaseClient().from('medication_requests').select('id,medication_name,details,requested_at,review_status,catalog_id,review_notes').order('requested_at',{ascending:false}).limit(100);return {data:(data??[]) as MedicationRequest[],error:error?.message??null};}
export async function submitMedicationRequest(name:string,details:string){
 const client=getSupabaseClient(),auth=await client.auth.getUser();
 if(auth.error||!auth.data.user)return {data:null,error:'Please sign in before requesting a medication.'};
 const value=name.trim();if(value.length<2||value.length>160)return {data:null,error:'Enter a medication name between 2 and 160 characters.'};
 const {data,error}=await client.from('medication_requests').insert({user_id:auth.data.user.id,medication_name:value,details:details.trim().slice(0,2000)||null}).select('id,medication_name,details,requested_at,review_status,catalog_id,review_notes').single();
 return {data:data as MedicationRequest|null,error:error?.code==='23505'?'You have already requested this medication. Its review status is shown below.':error?.message??null};
}
export async function reviewMedicationRequest(id:string,decision:'approved'|'rejected',catalogId:string|null,notes:string){const {error}=await getSupabaseClient().rpc('review_bigpharma_medication_request',{request_id:id,decision,verified_catalog_id:catalogId,notes});return {error:error?.message??null};}
