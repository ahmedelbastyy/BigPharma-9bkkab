import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { adminClient,jsonResponse,RequestError,handleError } from '../_shared/onspaceAI.ts';
import { lookupNadac } from '../_shared/nadacProvider.ts';
serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});
 try{
  if(req.method!=='POST')throw new RequestError('POST required',405);
  const admin=adminClient(),token=req.headers.get('Authorization')?.replace(/^Bearer\s+/i,'');if(!token)throw new RequestError('Please sign in',401);
  const auth=await admin.auth.getUser(token);if(auth.error||!auth.data.user)throw new RequestError('Please sign in again',401);
  const raw=await req.text();if(raw.length>4096)throw new RequestError('Request too large',413);
  let body:any;try{body=JSON.parse(raw);}catch{throw new RequestError('Invalid request',400);}
  if(!body||typeof body!=='object'||Array.isArray(body))throw new RequestError('Invalid request',400);
  let medication:any;
  if(body.medicationId){
   if(!/^[0-9a-f-]{36}$/i.test(body.medicationId))throw new RequestError('Select a medication',400);
   const found=await admin.from('user_medications').select('id,rxcui,ndc,strength,form').eq('id',body.medicationId).eq('user_id',auth.data.user.id).is('deleted_at',null).neq('status','archived').maybeSingle();
   if(found.error)throw new RequestError('Price unavailable',503);if(!found.data)throw new RequestError('Medication unavailable',404);medication=found.data;
   if(!medication.rxcui){const link=await admin.from('medication_catalog_saved_links').select('product_id').eq('user_id',auth.data.user.id).eq('medication_id',medication.id).maybeSingle();if(link.error)throw new RequestError('Product identity unavailable',503);if(link.data){const product=await admin.from('medication_catalog_products').select('rxcui').eq('id',link.data.product_id).maybeSingle();if(product.error)throw new RequestError('Product identity unavailable',503);medication.rxcui=product.data?.rxcui;}}
  }else{if(!/^\d{1,12}$/.test(body.rxcui||''))throw new RequestError('Select a medication',400);medication={rxcui:body.rxcui};}
  // No NDC input is accepted. Saved package codes or exact RxNorm mappings stay server-side.
  const quota=await admin.rpc('claim_nadac_request',{p_owner:auth.data.user.id});if(quota.error||quota.data!==true)throw new RequestError('Price unavailable',429);
  return jsonResponse(await lookupNadac(admin,medication));
 }catch(e){if(e instanceof RequestError)return handleError(e);console.error('nadac_lookup_failed',{message:e instanceof Error?e.message:'Official source unavailable'});return jsonResponse({error:'Price unavailable'},503);}
});
