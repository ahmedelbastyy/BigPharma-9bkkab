import { wireRequest,WireError,redactWireData,publicWireError } from './anakinWire.ts';
import { wireEnvelope,normalizeWireResult,wireFieldNames,wireScope } from './anakinLifecycle.ts';
export function db(result:any){if(result.error)throw new WireError('DATABASE_UNAVAILABLE',503);return result.data;}
export async function wireRights(admin:any,action?:string){const permission=db(await admin.from('anakin_wire_permissions').select('*').eq('id',true).maybeSingle());return {...wireScope(permission,action),permission};}
function sourceMetadata(data:any){let url=typeof data?.url==='string'?data.url:typeof data?.source_url==='string'?data.source_url:'',source='Anakin Wire';try{const u=new URL(url);if(u.protocol!=='https:'||u.username||u.password||!(u.hostname==='drugs.com'||u.hostname.endsWith('.drugs.com')))url='';else source='Drugs.com via Anakin Wire';}catch{url='';}return {source,sourceUrl:url||'https://anakin.io/catalog/drugs_com'};}
export function presentWireJob(job:any){
 const data=job.transient_result??job.result_json;
 const pending=job.status==='completed'&&!job.diagnostic_mode&&!data;
 const base={requestId:job.id,status:pending?'processing':job.status,action:job.action_id,target:job.request_target,productRxcui:job.product_rxcui,cacheAllowed:job.cache_permitted!==false&&!job.diagnostic_mode,retryAfterMs:Math.max(2000,Math.min(30000,Date.parse(job.next_poll_at||'')-Date.now()||2000))};
 if(job.diagnostic_mode)return {...base,providerJobId:job.provider_job_id,submissionHttpStatus:job.submission_http_status,httpStatus:job.http_status,fieldNames:job.response_fields||[],schemaValidated:job.schema_validated===true,executionMs:job.execution_ms,creditsUsed:job.credits_used,createdAt:job.created_at,completedAt:job.completed_at,...(['failed','uncertain','expired'].includes(job.status)?{error:publicWireError(job.error_code||'JOB_FAILED')}:{}),diagnostic:true};
 if(job.status==='completed'&&data)return {...base,data,creditsUsed:job.credits_used,retrievedAt:job.completed_at,...job.source_metadata};
 if(['failed','uncertain','expired'].includes(job.status))return {...base,error:publicWireError(job.error_code||'JOB_FAILED')};return base;
}
// A shared exclusive lease coordinates authenticated GET polling and signed webhook delivery.
// For display-only licenses, completed content is returned transiently, never inserted into result_json.
export async function settleWireJob(admin:any,original:any,force=false,resultPath?:string){
 if(['failed','uncertain','expired'].includes(original.status))return original;
 const initialRights=await wireRights(admin,original.action_id);
 if(original.diagnostic_mode?!initialRights.testAllowed:!initialRights.enabled)throw new WireError('RIGHTS_CHANGED',403);
 if(original.status==='completed'&&(original.diagnostic_mode||(original.result_json&&initialRights.cache&&original.cache_permitted!==false)))return original;
 const leased=db(await admin.rpc('lease_anakin_job',{p_id:original.id,p_force:force}));
 if(!leased)return db(await admin.from('anakin_wire_jobs').select('*').eq('id',original.id).single());
 const job=leased;let transientResult:unknown;let patch:any={lease_token:null,lease_until:null};
 try{
  const rights=await wireRights(admin,job.action_id);
  if(job.diagnostic_mode?!rights.testAllowed:!rights.enabled)throw new WireError('RIGHTS_CHANGED',403);
  if(Date.now()-Date.parse(job.created_at)>24*3600000||job.poll_attempts>120)throw new WireError('JOB_EXPIRED',410);
  const response=wireEnvelope(await wireRequest(resultPath||`/wire/jobs/${job.provider_job_id}`));patch.http_status=response.__httpStatus;
  if(response.status==='processing'){
   const backoff=Math.max(2000,Math.min(30000,Number(response.retry_after_ms)||2000*Math.pow(1.3,Math.min(job.poll_attempts,12))));patch.next_poll_at=new Date(Date.now()+backoff).toISOString();
  }else if(['failed','expired'].includes(response.status)){
   patch={...patch,status:'failed',error_code:response.status==='expired'?'JOB_EXPIRED':response.error?.code||'JOB_FAILED',provider_error:job.diagnostic_mode?'':String(redactWireData(response.error?.message||'')).slice(0,1000),credits_used:response.credits_used??null,completed_at:new Date().toISOString()};
  }else{
   const data=redactWireData(normalizeWireResult(response)),cache=!job.diagnostic_mode&&rights.cache&&job.cache_permitted!==false;
   if(new TextEncoder().encode(JSON.stringify(data)).length>95000)throw new WireError('RESULT_TOO_LARGE');
   const fields=wireFieldNames(data);
   patch={...patch,status:'completed',error_code:null,provider_error:null,next_poll_at:null,completed_at:job.completed_at||new Date().toISOString(),expires_at:new Date(Date.now()+(job.action_id==='dc_drug_prices'?86400000:7*86400000)).toISOString(),execution_ms:Number.isFinite(response.execution_ms)?response.execution_ms:null,credits_used:Number.isFinite(response.credits_used)?response.credits_used:null,response_fields:fields,schema_validated:true,cache_permitted:cache};
   if(!job.diagnostic_mode){patch.source_metadata=sourceMetadata(data);if(cache)patch.result_json=data;else transientResult=data;}
   console.log('anakin_task_completed',{requestId:job.id,providerJobId:job.provider_job_id,action:job.action_id,httpStatus:response.__httpStatus,diagnostic:job.diagnostic_mode===true,fieldNames:fields,executionMs:patch.execution_ms});
  }
 }catch(e){
  const error=e instanceof WireError?e:new WireError('INTERNAL_ERROR');patch.http_status=error.httpStatus;patch.error_code=error.code;patch.provider_error=job.diagnostic_mode?'':error.detail.slice(0,1000);
  const retryable=['NETWORK_OR_TIMEOUT','RATE_LIMITED','DATABASE_UNAVAILABLE'].includes(error.code)||(error.httpStatus>=500&&error.code==='PROVIDER_ERROR');
  if(retryable&&job.poll_attempts<120)patch.next_poll_at=new Date(Date.now()+30000).toISOString();else patch={...patch,status:'failed',completed_at:new Date().toISOString()};
  console.error('anakin_job_error',{requestId:job.id,providerJobId:job.provider_job_id,action:job.action_id,code:error.code,httpStatus:error.httpStatus});
 }
 const saved=db(await admin.from('anakin_wire_jobs').update(patch).eq('id',job.id).eq('lease_token',job.lease_token).select('*').single());
 return transientResult===undefined?saved:{...saved,transient_result:transientResult};
}
