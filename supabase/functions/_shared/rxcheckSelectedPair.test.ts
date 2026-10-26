import { requestRxPair } from './rxcheckProvider.ts';
import { resolveMedicationIdentity } from './medicationIngredientResolver.ts';
const eq=(actual:unknown,expected:unknown)=>{if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error('Selected-pair contract assertion failed');};
// Isolated synthetic HTTP responses; these tests never alter credentials or patient records.
Deno.test('Missing RxCUI uses exact name resolution, not a misleading generic_name field',async()=>{
 const original=globalThis.fetch;try{
  const urls:string[]=[];globalThis.fetch=(async(input)=>{const url=String(input);urls.push(url);if(url.includes('rxcui.json?'))return new Response(JSON.stringify({idGroup:{rxnormId:['83367']}}));if(url.includes('/properties.json'))return new Response(JSON.stringify({properties:{rxcui:'83367',tty:'IN',suppress:'N',name:'atorvastatin'}}));return new Response(JSON.stringify({relatedGroup:{conceptGroup:[{tty:'IN',conceptProperties:[{rxcui:'83367',tty:'IN',suppress:'N',name:'atorvastatin'}]}]}}));}) as typeof fetch;
  const result=await resolveMedicationIdentity('','Atorvastatin');eq(result.ingredients.map(i=>i.name),['atorvastatin']);eq(urls.some(url=>url.includes('search=0')),true);eq(urls.some(url=>url.includes('Lipitor')),false);
 }finally{globalThis.fetch=original;}
});
Deno.test('Only clean ingredients and a private header reach RxCheck; nested ambiguity remains incomplete',async()=>{
 const original=globalThis.fetch;try{
  globalThis.fetch=(async(input,init)=>{const url=new URL(String(input));eq(url.searchParams.get('drug1'),'ibuprofen');eq(url.searchParams.get('drug2'),'lisinopril');eq(init?.method,'GET');eq((init?.headers as Record<string,string>)['X-API-Key'],'test-only-private-key');return new Response(JSON.stringify({status:'success',result_status:'no_record_found',query:{drug1:{normalization:{ambiguous:true}}},interaction:{found:false}}),{status:200});}) as typeof fetch;
  const result=await requestRxPair('test-only-private-key','ibuprofen','lisinopril');eq(result.outcome,'unresolved');eq(result.httpStatus,200);
 }finally{globalThis.fetch=original;}
});
Deno.test('Invalid credentials, exhausted quota, rate limits and no-record are not interchangeable',async()=>{
 const original=globalThis.fetch;try{
  for(const [status,code] of [[401,'PROVIDER_AUTH'],[402,'QUOTA_EXHAUSTED'],[429,'RATE_LIMIT'],[503,'PROVIDER_ERROR']] as const){globalThis.fetch=(async()=>new Response('private error',{status})) as typeof fetch;const result=await requestRxPair('test-only-private-key','a','b');eq(result.errorCode,code);eq(result.outcome,'failed');}
  eq((await requestRxPair('','a','b')).errorCode,'CREDENTIALS_MISSING');
 }finally{globalThis.fetch=original;}
});
