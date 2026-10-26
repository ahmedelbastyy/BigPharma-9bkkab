import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { adminClient,jsonResponse,RequestError,handleError } from '../_shared/onspaceAI.ts';
import { parseMedicationImageFilename } from '../../../services/medicationImageIdentity.ts';
async function sourceJSON(url:string){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),9000);try{const response=await fetch(url,{signal:controller.signal});if(!response.ok)throw new Error('Official identifier lookup unavailable');return await response.json();}finally{clearTimeout(timer);}}
serve(async req=>{if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});try{
 if(req.method!=='POST')throw new RequestError('POST required',405);const admin=adminClient(),token=req.headers.get('Authorization')?.replace(/^Bearer\s+/i,'');
 if(!token)throw new RequestError('Please sign in',401);const auth=await admin.auth.getUser(token);if(auth.error||!auth.data.user)throw new RequestError('Your session expired. Please sign in again.',401);const user=auth.data.user;
 const member=await admin.from('medication_video_admins').select('user_id').eq('user_id',user.id).maybeSingle();if(member.error||!member.data)throw new RequestError('Administrator access required',403);
 const raw=await req.text();if(raw.length>18000)throw new RequestError('Metadata request too large',413);let body:any;try{body=JSON.parse(raw);}catch{throw new RequestError('Invalid metadata request',400);}if(!body||typeof body!=='object'||(typeof body.id!=='string'&&typeof body.path!=='string'))throw new RequestError('Choose an uploaded image',400);
 const row=await admin.from('medication_images').select('*').eq(body.id?'id':'storage_path',body.id||body.path).single();if(row.error||!row.data)throw new RequestError('Upload not found. Refresh the review queue.',404);let item=row.data;
 if(body.action==='reject'){const r=await admin.from('medication_images').update({review_status:'rejected',reviewed_by:user.id,reviewed_at:new Date().toISOString()}).eq('id',item.id);if(r.error)throw new RequestError('Could not save review',500);return jsonResponse({ok:true});}
 if(body.action==='register'||body.action==='resolve'){
  const identity=parseMedicationImageFilename(item.filename);let product:any=null,ndc:string|null=null,notes='Invalid filename or ambiguous identifier. Nothing is published.',evidence:Record<string,unknown>={};
  if(identity?.kind==='rxcui'){
   const found=await admin.from('medication_catalog_products').select('id,rxcui,strength,dosage_form,source_url,suppressed,retired').eq('rxcui',identity.identifier).not('suppressed','is',true).eq('retired',false).maybeSingle();if(found.error)throw new RequestError('Catalog lookup failed',503);product=found.data;notes=product?'Exact formulation identified; appearance and rights still require review.':'Identifier is not a current product. No match attached.';evidence={method:'exact RxCUI product',source:product?.source_url};
  }else if(identity?.kind==='ndc'){
   try{
    const source=`https://rxnav.nlm.nih.gov/REST/ndcstatus.json?ndc=${encodeURIComponent(identity.original)}&history=1&altpkg=0`,response=await sourceJSON(source),status=response.ndcStatus;
    if(status?.status==='ACTIVE'&&status?.active==='YES'&&String(status?.conceptStatus||'').toUpperCase()==='ACTIVE'&&status?.ndc11===identity.identifier&&status?.altNdc!=='Y'&&/^\d+$/.test(status.rxcui||'')){
     const found=await admin.from('medication_catalog_products').select('id,rxcui,strength,dosage_form,source_url').eq('rxcui',status.rxcui).not('suppressed','is',true).eq('retired',false).maybeSingle();if(found.error)throw new Error('Catalog lookup failed');product=found.data;ndc=product?identity.identifier:null;evidence={method:'active exact NDC, no alternate packaging',source,ndc11:status.ndc11,rxcui:status.rxcui,verifiedAt:new Date().toISOString()};notes=product?'Exact packaging identifier verified; confirm manufacturer and photographed appearance before publication.':'Product is absent from the verified catalog; administrator review required.';
    }else notes='Official lookup did not confirm this exact active packaging. Administrator review required.';
   }catch{notes='Official identifier lookup unavailable. Retry matching; this image remains unpublished.';}
  }
  const update:Record<string,unknown>={medication_id:product?.id||null,rxcui:product?.rxcui||null,product_ndc:ndc,original_ndc:identity?.kind==='ndc'?identity.original:null,strength:product?.strength||null,formulation:product?.dosage_form||null,match_status:product?'verified':'unresolved',match_evidence:evidence,review_notes:notes,uploaded_by:item.uploaded_by||user.id};
  // Paths can only refer to derivatives next to the original. No external URLs or arbitrary bucket paths accepted.
  const folder=item.storage_path.replace(/\/[^/]+$/,'');const listing=await admin.storage.from('medication-images').list(folder);if(listing.error)throw new RequestError('Could not check image derivatives',503);
  if(listing.data.some(f=>f.name==='display.webp')&&listing.data.some(f=>f.name==='thumb.webp')){update.display_path=`${folder}/display.webp`;update.thumbnail_path=`${folder}/thumb.webp`;}
  const saved=await admin.from('medication_images').update(update).eq('id',item.id).eq('review_status','pending').select().single();if(saved.error)throw new RequestError('Could not save matching evidence',500);return jsonResponse({item:saved.data});
 }
 if(body.action!=='approve')throw new RequestError('Unsupported image operation',400);
 if(item.match_status!=='verified'||!item.medication_id||!item.rxcui)throw new RequestError('Resolve the exact verified product before publishing',422);
 const metadata=body.metadata||{},type=metadata.imageType;const allowed=['illustration','product_photo','packaging_photo'];if(!allowed.includes(type))throw new RequestError('Choose an image category',422);
 if(type!=='illustration'&&!item.product_ndc)throw new RequestError('A manufacturer-specific photograph requires an exact verified product NDC. Use an illustration for concept-level images.',422);
 const source=String(metadata.sourceUrl||'').trim(),attribution=String(metadata.attribution||'').trim(),license=String(metadata.license||'').trim(),manufacturer=String(metadata.manufacturer||'').trim(),notes=String(metadata.notes||'').trim();
 if(!/^https:\/\//.test(source)||!attribution||!license||metadata.permissionConfirmed!==true||metadata.identityConfirmed!==true||notes.length<10)throw new RequestError('Record source, attribution, rights and visual identity review before publishing',422);
 if(item.product_ndc&&!manufacturer)throw new RequestError('Confirm the exact labeler or manufacturer for this product photograph',422);
 if(!item.display_path||!item.thumbnail_path)throw new RequestError('Optimized display and thumbnail files are required. Upload this image through the library uploader.',422);
 const result=await admin.from('medication_images').update({review_status:'approved',permission_status:'confirmed',image_type:type,source_url:source,source_attribution:attribution,license,manufacturer:manufacturer||null,review_notes:notes,reviewed_by:user.id,reviewed_at:new Date().toISOString(),image_url:`${Deno.env.get('SUPABASE_URL')}/storage/v1/object/authenticated/medication-images/${item.display_path}`}).eq('id',item.id).eq('review_status','pending');if(result.error)throw new RequestError('Could not publish the reviewed image',500);
 return jsonResponse({ok:true});
 }catch(error){return handleError(error);}});
