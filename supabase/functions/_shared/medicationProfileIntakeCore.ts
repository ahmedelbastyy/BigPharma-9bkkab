import { RequestError } from './onspaceAI.ts';
import { exactRxNorm } from './medicationSources.ts';
import { resolveMedicationIngredients } from './medicationIngredientResolver.ts';
import { prepareMedicationSources } from './medicationSourcePreparation.ts';
import { deterministicMedicationProfile } from './deterministicMedicationContent.ts';
import { validateMedicationContent,type ContentCard,type MedicationContentProfile } from './medicationContentContract.ts';
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9-]{36}$/i.test(v);
function check(result:any,stage:string){if(result.error)throw new RequestError(`${stage}: ${result.error.message}`,503);return result.data;}
const fields=['what_it_does','common_side_effects','important_warnings','use_it_well'] as const;
export function validateImportedProfile(value:any){
 if(!value||typeof value!=='object'||Array.isArray(value)||typeof value.medication_name!=='string'||!/^[a-zA-Z0-9 /().-]{2,160}$/.test(value.medication_name))throw new RequestError('Each profile needs a valid medication_name.',422);
 if(typeof value.drug_class!=='string'||value.drug_class.length>160)throw new RequestError('A short draft drug_class is required.',422);
 for(const key of fields)if(!Array.isArray(value[key])||value[key].length>5||value[key].some((s:any)=>typeof s!=='string'||!s.trim()||s.length>1200))throw new RequestError(`${key} must contain up to five short statements.`,422);
 if(value.source_status!=='REQUIRES_PRODUCT_SPECIFIC_LABEL_REVIEW')throw new RequestError('Imports must be unverified drafts, never approved content.',422);
 if(typeof value.review_notes!=='string'||value.review_notes.length>4000)throw new RequestError('review_notes is required.',422);
 return {medication_name:value.medication_name.trim().toUpperCase(),drug_class:value.drug_class.trim(),...Object.fromEntries(fields.map(key=>[key,value[key]])),source_status:value.source_status,review_notes:value.review_notes};
}
const lookupNames:Record<string,string>={'FLUTICASONE INHALED':'fluticasone','FLUTICASONE NASAL':'fluticasone','BUDESONIDE INHALED':'budesonide','AMOXICILLIN/CLAVULANATE':'amoxicillin / clavulanate'};
const routeFor=(name:string)=>/NASAL$/.test(name)?'nasal':/INHALED$/.test(name)||name==='ALBUTEROL'?'inhalation':null;
export function sameIngredientSet(a:string[],b:string[]){return a.length>0&&new Set(a).size===new Set(b).size&&[...new Set(a)].every(id=>b.includes(id));}
export async function sourceFingerprint(label:any,sections:Record<string,string>){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify({setid:label.spl_set_id,version:label.label_version,sections}))))).map(n=>n.toString(16).padStart(2,'0')).join('');}
function importedCard(key:string,title:string,texts:string[],section:string,source:Record<string,string>):ContentCard|null{
 if(!texts.length)return null;
 // A name match or language model judgment is not evidence. Paraphrases remain unvalidated until a reviewer supplies exact quotations.
 return {key,title,source_section:section,statements:texts.map(text=>({text,evidence:source[section]?.includes(text)?[{section_key:section,quote:text}]:[]}))};
}
export function importedPatientProfile(original:any,baseline:MedicationContentProfile,sections:Record<string,string>){
 const p=JSON.parse(JSON.stringify(baseline)) as MedicationContentProfile;
 p.what_it_does.explanation=importedCard('description','What it does',original.what_it_does,'indications_and_usage',sections);
 p.know_before_taking.common_side_effects=importedCard('adverse_reactions','Side effects',original.common_side_effects,'adverse_reactions',sections);
 const safetyKey=sections.warnings_and_cautions?'warnings_and_cautions':sections.boxed_warning?'boxed_warning':'warnings_and_cautions';
 const warning=importedCard(safetyKey,'Important warnings',original.important_warnings,safetyKey,sections);
 p.know_before_taking.important_warnings=p.know_before_taking.important_warnings.filter(c=>c.key!==safetyKey);
 if(warning)p.know_before_taking.important_warnings.push(warning);
 p.use_it_well.how_to_take=importedCard('dosage_and_administration','Use it well',original.use_it_well,'dosage_and_administration',sections);
 return p;
}
export function validateDrugClass(profile:any,sections:Record<string,string>):string[]{
 if(!profile.drug_class)return [];
 const e=profile.drug_class_evidence;
 return typeof profile.drug_class!=='string'||profile.drug_class.length>160||!e||typeof e.quote!=='string'||e.quote.length<12||!sections[e.section_key]?.includes(e.quote)||!e.quote.toLowerCase().includes(profile.drug_class.toLowerCase())?['Drug class needs a matching complete source quotation.']:[];
}
export async function handleProfileIntake(admin:any,body:any,userId:string):Promise<Record<string,any>>{
 if(body.action==='import_profiles'){
  if(!Array.isArray(body.profiles)||!body.profiles.length||body.profiles.length>50)throw new RequestError('Import 1–50 JSON profiles at a time.',422);
  const profiles=body.profiles.map(validateImportedProfile),seen=new Set<string>();if(profiles.some((p:any)=>seen.has(p.medication_name)||!seen.add(p.medication_name)))throw new RequestError('Duplicate names in this import.',422);
  const rows=profiles.map((p:any)=>({import_key:`starter-50-v1:${p.medication_name}`,medication_name:p.medication_name,drug_class:p.drug_class,original_json:p,required_route:routeFor(p.medication_name),missing_sections:['exact_product_identity','official_label','clinical_review']}));
  const imported=check(await admin.from('medication_profile_imports').upsert(rows,{onConflict:'import_key',ignoreDuplicates:true}).select('id'),'Store immutable educational drafts');return {imported:imported.length,duplicates:profiles.length-imported.length,approved:0};
 }
 if(body.action==='import_match'){
  const rows=check(await admin.from('medication_profile_imports').select('*').is('canonical_rxcui',null).neq('verification_status','failed_match').order('imported_at').limit(5),'Read unmatched profiles'),outcomes=[];
  for(const row of rows){try{
   const concept=await exactRxNorm(lookupNames[row.medication_name]||row.medication_name.toLowerCase());
   if(!concept||!['IN','MIN'].includes(concept.tty))throw new Error('No single exact active RxNorm ingredient identity; manual matching required.');
   const resolution=await resolveMedicationIngredients(concept.rxcui);if(!resolution.ingredients.length)throw new Error(resolution.message);
   if(row.medication_name==='AMOXICILLIN/CLAVULANATE'&&resolution.ingredients.length!==2)throw new Error('Combination must retain both verified ingredients.');
   check(await admin.from('medication_profile_imports').update({canonical_rxcui:concept.rxcui,ingredient_rxcuis:resolution.ingredients.map(i=>i.rxcui),verification_status:'ingredient_verified',last_error:null,source_references:[{url:`https://rxnav.nlm.nih.gov/REST/rxcui/${concept.rxcui}/properties.json`,source:'Live RxNorm exact identity'},{url:`https://rxnav.nlm.nih.gov/REST/rxcui/${concept.rxcui}/related.json?tty=IN`,source:'Live RxNorm ingredient set'}],updated_at:new Date().toISOString()}).eq('id',row.id).is('canonical_rxcui',null),'Save ingredient evidence');outcomes.push({name:row.medication_name,status:'ingredient_verified'});
  }catch(error){const message=error instanceof Error?error.message:'Identity unavailable';check(await admin.from('medication_profile_imports').update({verification_status:'failed_match',last_error:message,updated_at:new Date().toISOString()}).eq('id',row.id),'Record failed match');outcomes.push({name:row.medication_name,status:'failed_match',error:message});}}
  return {outcomes,approved:0,more:rows.length===5};
 }
 if(!uuid(body.id))throw new RequestError('Select an imported draft.',422);
 const row=check(await admin.from('medication_profile_imports').select('*').eq('id',body.id).single(),'Read imported draft');
 if(body.action==='import_edit'){
  const edited=validateImportedProfile(body.profile);if(edited.medication_name!==row.medication_name)throw new RequestError('Changing identity requires a separate import.',422);
  check(await admin.from('medication_profile_imports').update({edited_json:edited,updated_at:new Date().toISOString()}).eq('id',row.id),'Save editorial draft');return {saved:true,approved:false};
 }
 if(body.action==='import_link'){
  if(!uuid(body.productId)||!row.ingredient_rxcuis.length)throw new RequestError('Verify the ingredient identity before choosing an exact product.',422);
  const p=check(await admin.from('medication_catalog_products').select('*').eq('id',body.productId).single(),'Read exact product');
  if(p.retired||p.suppressed||!p.strength||!p.dosage_form)throw new RequestError('Choose an active product with verified strength and formulation.',422);
  const actual=await resolveMedicationIngredients(p.rxcui);if(!sameIngredientSet(row.ingredient_rxcuis,actual.ingredients.map(i=>i.rxcui)))throw new RequestError('Product ingredient set differs from this draft; combinations cannot be collapsed.',422);
  if(row.required_route&&!String(p.route||'').toLowerCase().includes(row.required_route)&&!(row.required_route==='inhalation'&&/respiratory|inhal/i.test(p.route||'')))throw new RequestError('The product route differs from the inhaled/nasal draft.',422);
  check(await admin.from('medication_profile_imports').update({product_id:p.id,content_id:null,publication_status:'unpublished',verification_status:'product_selected',missing_sections:['official_label','clinical_review'],updated_at:new Date().toISOString()}).eq('id',row.id),'Save explicit product scope');
  check(await admin.from('medication_content_jobs').upsert({medication_id:p.id},{onConflict:'medication_id',ignoreDuplicates:true}),'Queue exact labeling');return {status:'product_selected',productId:p.id,approved:false};
 }
 if(body.action!=='import_compare')throw new RequestError('Unsupported import action.',400);
 if(!row.product_id)throw new RequestError('Select an exact formulation first.',422);
 const product=check(await admin.from('medication_catalog_products').select('*').eq('id',row.product_id).single(),'Read product scope');if(product.retired||product.suppressed)throw new RequestError('Selected product is no longer active.',422);
 const labels=check(await admin.from('medication_catalog_product_labels').select('*').eq('product_id',product.id).order('verified_at',{ascending:false}),'Read verified source');
 const label=labels.find((l:any)=>['spl-clinical-v3','manual-label-review-v1','fda-label-v1'].includes(l.content?.parserVersion));if(!label)throw new RequestError('Exact source labeling is not prepared yet. Process the queued product, then compare.',409);
 const sections=prepareMedicationSources(label.content.sections||{}),now=new Date().toISOString(),hash=await sourceFingerprint(label,sections),version=`patient-profile-v1:import:${row.id}:${label.label_version}`;
 const baseline=deterministicMedicationProfile({schema_version:'patient-profile-v1',identity:{medication_id:product.id,rxcui:product.rxcui,name:product.full_name,strength:product.strength,formulation:product.dosage_form},source_url:`https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=${label.spl_set_id}`,source_setid:label.spl_set_id,label_version:label.label_version,generated_at:now},sections);
 let profile:any=body.patientProfile||importedPatientProfile(row.edited_json||row.original_json,baseline.profile,sections);
 const errors=[...validateMedicationContent(profile,{medication_id:product.id,rxcui:product.rxcui,setid:label.spl_set_id,version:label.label_version,strength:product.strength,formulation:product.dosage_form},sections),...validateDrugClass(profile,sections)];
 if(errors.some(e=>/Invalid profile schema|Invalid card arrays|Invalid display card|Invalid statement text/.test(e)))throw new RequestError(errors.join('; '),422);
 const existing=check(await admin.from('medication_content').select('id,status').eq('medication_id',product.id).eq('source_fingerprint',hash).eq('content_version',version).maybeSingle(),'Find imported content revision');if(existing?.status==='approved')throw new RequestError('Approved versions are immutable. Select a new official source version for a replacement draft.',409);
 const data={medication_id:product.id,rxcui:product.rxcui,label_id:label.id,source_setid:label.spl_set_id,source_version:label.label_version,source_fingerprint:hash,content_version:version,content_json:profile,status:'review_required',validation_errors:errors,generation_metrics:{method:'human_import',import_id:row.id,ai_calls:0,original_requires_review:true},last_checked_at:now};
 const saved=check(await admin.from('medication_content').upsert(data,{onConflict:'medication_id,source_fingerprint,content_version'}).select('id').single(),'Save permanent review candidate');
 check(await admin.from('medication_profile_imports').update({content_id:saved.id,verification_status:errors.length?'needs_correction':'label_verified',publication_status:'review_required',source_version:label.label_version,source_references:[...(row.source_references||[]),...label.source_urls.map((url:string)=>({url,source:'Exact product labeling',version:label.label_version}))],validation_notes:errors,missing_sections:errors.filter(e=>/^Missing/.test(e)),last_error:null,updated_at:now}).eq('id',row.id),'Save comparison result');
 return {contentId:saved.id,status:'review_required',validationErrors:errors,approved:false,aiCalls:0,reviewer:userId?'authenticated':undefined};
}
