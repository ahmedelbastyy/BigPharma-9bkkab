import { XMLParser, XMLValidator } from 'https://esm.sh/fast-xml-parser@4.5.3';
// FDA's actual LOINC map, not similarly numbered headings.
export const parserVersion = 'spl-clinical-v3';
export const sectionCodes: Record<string,string> = {
 '34067-9':'indications_and_usage','34068-7':'dosage_and_administration','34070-3':'contraindications','34071-1':'warnings','43685-7':'warnings_and_cautions','42232-9':'precautions','34066-1':'boxed_warning','34084-4':'adverse_reactions','34073-7':'drug_interactions','34090-1':'clinical_pharmacology','43679-0':'mechanism_of_action','43684-0':'usage_in_specific_populations','34069-5':'how_supplied','44425-7':'storage_and_handling','34089-3':'description','43678-2':'dosage_forms_and_strengths','34076-0':'patient_information','88436-1':'patient_counseling_information','59845-8':'instructions_for_use','42230-3':'patient_package_insert','42231-1':'medication_guide','90374-0':'clinical_trials_experience','90375-7':'postmarketing_experience','42228-7':'pregnancy','77290-5':'lactation','34081-0':'pediatric_use','34082-8':'geriatric_use','88828-9':'renal_impairment','88829-7':'hepatic_impairment',
};
export const list=(x:any):any[]=>x==null?[]:Array.isArray(x)?x:[x];
export function narrative(node:any):string {
 if(node==null)return '';if(typeof node==='string'||typeof node==='number')return String(node);
 if(Array.isArray(node))return node.map(narrative).filter(Boolean).join('\n');
 return Object.entries(node).filter(([k])=>!k.startsWith('@_')&&!['reference','renderMultiMedia'].includes(k)).map(([k,v])=>{const s=narrative(v);return k==='item'&&s?`• ${s}`:s;}).filter(Boolean).join('\n');
}
function nestedNarrative(section:any):string {
 // Many PLR top-level sections have NO <text>; their real text is in component/section.
 // Regulatory titles are metadata, not clinical narrative. Chemistry remains internal under description.
 const parts=[narrative(section.text)];
 for(const component of list(section.component))for(const child of list(component.section))parts.push(nestedNarrative(child));
 return parts.filter(Boolean).join('\n\n').replace(/\n{3,}/g,'\n\n').trim();
}
export function parseSPL(xml:string){
 if(/<!DOCTYPE|<!ENTITY/i.test(xml))throw new Error('External XML entities are not permitted');
 if(XMLValidator.validate(xml)!==true)throw new Error('DailyMed returned invalid XML');
 const doc=new XMLParser({ignoreAttributes:false,removeNSPrefix:true,parseTagValue:false,processEntities:true}).parse(xml).document;
 if(!doc?.setId?.['@_root']||!doc.versionNumber?.['@_value'])throw new Error('Not an SPL document: missing SETID/version');
 const sections:Record<string,string>={},codes:Record<string,string[]>={},products:any[]=[];
 function walk(node:any){
  if(!node||typeof node!=='object')return;
  for(const section of list(node.section)){
   const code=list(section.code)[0]?.['@_code'],key=sectionCodes[code];
   if(key){const value=nestedNarrative(section);if(value){sections[key]=[sections[key],value].filter(Boolean).join('\n\n');codes[key]=[...new Set([...(codes[key]??[]),code])];}}
  }
  // Only inner manufacturedProduct objects contain the NDC, form, ingredients and strength.
  if(node.code?.['@_codeSystem']==='2.16.840.1.113883.6.69'&&node.formCode&&node.ingredient){
   products.push({ndc:node.code['@_code'],name:narrative(node.name),form:node.formCode['@_displayName']??'',ingredients:list(node.ingredient).filter(i=>String(i['@_classCode']??'').startsWith('ACT')).map(i=>({name:narrative(i.ingredientSubstance?.name),moieties:list(i.ingredientSubstance?.activeMoiety).map(m=>narrative(m.activeMoiety?.name??m.name)),numerator:i.quantity?.numerator,denominator:i.quantity?.denominator}))});
  }
  for(const value of Object.values(node))if(typeof value==='object')for(const child of list(value))walk(child);
 }
 walk(doc);
 const documentType=doc.code?.['@_displayName']??'';
 if(!/HUMAN.*DRUG LABEL/i.test(documentType))throw new Error(`Non-human/non-drug SPL excluded: ${documentType}`);
 return {setid:doc.setId['@_root'],version:String(doc.versionNumber['@_value']),effectiveDate:doc.effectiveTime?.['@_value']??null,title:narrative(doc.title),sections,codes,products,documentType};
}
export function fdaSections(label:any):Record<string,string>{
 const keys=['description','indications_and_usage','dosage_and_administration','contraindications','warnings','warnings_and_cautions','precautions','boxed_warning','adverse_reactions','drug_interactions','clinical_pharmacology','mechanism_of_action','usage_in_specific_populations','how_supplied','storage_and_handling','patient_information','dosage_forms_and_strengths','instructions_for_use','information_for_patients','patient_counseling_information'];
 return Object.fromEntries(keys.flatMap(key=>{const value=list(label?.[key]).filter(x=>typeof x==='string').join('\n\n').trim();return value?[[key==='information_for_patients'?'patient_information':key,value]]:[];}));
}
export function classifySections(sections:Record<string,string>){
 const missing=['indications_and_usage','adverse_reactions','dosage_and_administration','drug_interactions'].filter(k=>!sections[k]?.trim());
 if(!sections.warnings_and_cautions&&!sections.warnings)missing.push('warnings');
 if(!sections.storage_and_handling&&!/\b(store|storage|temperature|protect)\b/i.test(sections.how_supplied??''))missing.push('storage');
 return {status:missing.length?'partial':'enriched',missing,populated:Object.keys(sections).filter(k=>sections[k]?.trim())};
}
