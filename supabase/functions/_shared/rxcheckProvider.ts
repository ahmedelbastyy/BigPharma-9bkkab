import { supportedRxQuery } from './rxcheckResolution.ts';
import { normalizeRxPair,failedRxPair,cacheableRxRelease,rxPairId,type RxPairResult } from './rxcheckContract.ts';
const apiBase='https://api.rxcheck.dev/v1';
console.log('rxcheck_adapter_version',{version:'20261026-verified-rx-identifiers-v2'});
export interface RxCachePolicy {enabled:boolean;ttlSeconds:number}
export async function rxcheckCachePolicy(admin:any):Promise<RxCachePolicy>{const {data,error}=await admin.from('rxcheck_cache_policy').select('enabled,ttl_seconds,evidence_url,scope_notes').eq('id',true).maybeSingle();return {enabled:!error&&data?.enabled===true&&/^https:\/\//.test(data.evidence_url||'')&&typeof data.scope_notes==='string'&&data.scope_notes.trim().length>=40,ttlSeconds:Math.max(60,Math.min(86400,Number(data?.ttl_seconds)||3600))};}
export const terminalRxFailure=(code:string|null)=>['CREDENTIALS_MISSING','PROVIDER_AUTH','QUOTA_EXHAUSTED','RATE_LIMIT','USER_LIMIT'].includes(code||'');
export async function requestRxPair(apiKey:string,first:string,second:string,identifiers?:{first:string;second:string}):Promise<RxPairResult>{
 if(!apiKey)return failedRxPair(first,second,'CREDENTIALS_MISSING','Medication checks are not configured.');
 try{
  // Independent, verified name-resolution requests run together; never use a provider's
  // ambiguous name row as proof of ingredient identity, especially for combinations.
  const [drug1,drug2]=identifiers?await Promise.all([supportedRxQuery(first,identifiers.first),supportedRxQuery(second,identifiers.second)]):[first,second];
  if(!drug1||!drug2){const result=failedRxPair(first,second,'UNRESOLVED','Medication could not be identified. Confirm its verified ingredients.');result.outcome='unresolved';return result;}
  console.log('rxcheck_outbound_ingredients',{drug1:first,drug2:second});
  const response=await fetch(`${apiBase}/interactions?drug1=${encodeURIComponent(drug1)}&drug2=${encodeURIComponent(drug2)}&format=full`,{method:'GET',headers:{'X-API-Key':apiKey,Accept:'application/json'},signal:AbortSignal.timeout(10000),redirect:'error'});
  const status=response.status;
  // Never log upstream bodies, headers, keys or patient identifiers.
  if(!response.ok){void response.body?.cancel();
   if(status===401||status===403)return failedRxPair(first,second,'PROVIDER_AUTH','The medication provider could not authenticate this request.',status);
   if(status===402)return failedRxPair(first,second,'QUOTA_EXHAUSTED','The medication provider quota is unavailable. Try again after it renews.',status);
   if(status===429)return failedRxPair(first,second,'RATE_LIMIT','The provider request limit was reached. Please try later.',status);
   if(status===400||status===422){const result=failedRxPair(first,second,'UNRESOLVED',"We couldn't identify this medication for checking. Verify the matching ingredient or select another medication.",status);result.outcome='unresolved';return result;}
   return failedRxPair(first,second,'PROVIDER_ERROR','This pair could not be checked. Please retry later.',status);
  }
  const raw=await response.text();if(new TextEncoder().encode(raw).length>100000)return failedRxPair(first,second,'INVALID_RESPONSE','The response exceeded the supported size.',status);
  if(raw.includes(apiKey))return failedRxPair(first,second,'INVALID_RESPONSE','The provider response could not be safely displayed.',status);
  let payload:unknown;try{payload=JSON.parse(raw);}catch{return failedRxPair(first,second,'INVALID_RESPONSE','The provider returned an unreadable response.',status);}
  const parsed=normalizeRxPair(payload,drug1,drug2,status);
  return {...parsed,id:rxPairId(first,second),first,second};
 }catch{return failedRxPair(first,second,'NETWORK_ERROR','This pair could not finish because of a network error or timeout.');}
}
export async function checkRxPair(admin:any,userId:string,pair:{id:string;first:string;second:string},apiKey:string,policy:RxCachePolicy,identifiers?:{first:string;second:string}):Promise<RxPairResult>{
 if(!apiKey)return failedRxPair(pair.first,pair.second,'CREDENTIALS_MISSING','Medication checks are not configured.');
 if(policy.enabled){const saved=await admin.from('rxcheck_pair_cache').select('result_json,expires_at').eq('pair_key',pair.id).gt('expires_at',new Date().toISOString()).order('retrieved_at',{ascending:false}).limit(1).maybeSingle();const r=saved.data?.result_json;if(!saved.error&&r&&r.id===pair.id&&cacheableRxRelease(r.datasetRelease)&&['found','no-record'].includes(r.outcome))return {...r,cached:true};}
 const lease=await admin.rpc('claim_rxcheck_request',{p_owner:userId,p_key:pair.id});if(lease.error)return failedRxPair(pair.first,pair.second,'LIMIT_UNAVAILABLE','Request limits could not be verified. Please retry.');
 if(!lease.data?.allowed)return failedRxPair(pair.first,pair.second,lease.data?.code||'USER_LIMIT',lease.data?.code==='IN_FLIGHT'?'This pair is already being checked. Retry shortly.':'Your check limit was reached. Retry later.');
 const result=await requestRxPair(apiKey,pair.first,pair.second,identifiers);
 if(policy.enabled&&cacheableRxRelease(result.datasetRelease)&&['found','no-record'].includes(result.outcome)){
  const saved=await admin.from('rxcheck_pair_cache').upsert({pair_key:pair.id,dataset_release:result.datasetRelease,result_json:result,retrieved_at:result.retrievedAt,expires_at:new Date(Date.now()+policy.ttlSeconds*1000).toISOString()},{onConflict:'pair_key,dataset_release'});if(saved.error)console.error('rxcheck_cache_write_failed',{code:'DATABASE_ERROR'});
 }
 const released=await admin.from('rxcheck_pair_leases').update({lease_until:new Date(Date.now()+2000).toISOString()}).eq('pair_key',pair.id).eq('lease_token',lease.data.token);if(released.error)console.error('rxcheck_lease_release_failed',{code:'DATABASE_ERROR'});
 console.log('rxcheck_pair_complete',{version:'20261026-verified-rx-identifiers-v2',drug1:pair.first,drug2:pair.second,httpStatus:result.httpStatus,outcome:result.outcome,resultStatus:result.resultStatus,errorCode:result.errorCode,cached:false});return result;
}
