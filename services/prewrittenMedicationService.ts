import type { CatalogDetails,CatalogMatch } from './catalogService';
import type { ScanCandidate } from './scannerService';
export type SupportedMedication='atorvastatin'|'levothyroxine'|'lisinopril'|'metformin'|'amlodipine'|'losartan';
export interface PrewrittenMedicationGuide {id:SupportedMedication;name:string;aliases:string[];sourceUrl:string;sections:Record<string,string[]>}
export const prewrittenMedicationGuides:PrewrittenMedicationGuide[]=[
 {id:'atorvastatin',name:'Atorvastatin',aliases:['atorvastatin','atorvastatin calcium','lipitor'],sourceUrl:'https://medlineplus.gov/druginfo/meds/a600045.html',sections:{
 indications_and_usage:['Lowers LDL ("bad") cholesterol.','Helps reduce the risk of heart attack and stroke.','Used to manage high cholesterol and certain lipid disorders.'],
 mechanism_of_action:['Belongs to a class of drugs called statins.','Reduces cholesterol production in the liver.','Helps decrease cholesterol buildup in blood vessels.'],
 adverse_reactions:['May cause diarrhea or joint discomfort.','Report unexplained muscle pain or weakness.','Rarely, serious muscle damage or liver problems can occur.'],
 warnings_and_cautions:['Tell your doctor about liver disease or heavy alcohol use.','Some medications can increase the risk of muscle problems.','Seek medical attention for severe muscle symptoms or dark urine.'],
 dosage_and_administration:['Usually taken once daily as prescribed.','Tablet formulations can be taken with or without food.','Take it consistently and follow your prescribed instructions.']}},
 {id:'levothyroxine',name:'Levothyroxine',aliases:['levothyroxine','levothyroxine sodium','synthroid'],sourceUrl:'https://medlineplus.gov/druginfo/meds/a682461.html',sections:{
 indications_and_usage:['Treats an underactive thyroid (hypothyroidism).','Replaces thyroid hormone your body does not produce sufficiently.','Certain treatment plans also use it for thyroid cancer.'],
 mechanism_of_action:['Contains synthetic thyroid hormone (T4).','Helps restore normal thyroid hormone levels.','Supports normal metabolism and body functions.'],
 adverse_reactions:['Excessive thyroid hormone may cause a rapid heartbeat.','May cause nervousness, sweating, or difficulty sleeping.','Tell your doctor about new or persistent symptoms.'],
 warnings_and_cautions:['Do not use thyroid hormone medication for weight loss.','Calcium and iron supplements can reduce absorption.','Thyroid blood tests help determine whether your dose is appropriate.'],
 dosage_and_administration:['Usually taken once daily on an empty stomach.','Typically taken 30–60 minutes before breakfast.','Take exactly as prescribed and follow instructions for your formulation.']}},
 {id:'lisinopril',name:'Lisinopril',aliases:['lisinopril','prinivil','zestril'],sourceUrl:'https://medlineplus.gov/druginfo/meds/a692051.html',sections:{
 indications_and_usage:['Treats high blood pressure.','Helps manage heart failure.','May improve survival after a heart attack.'],
 mechanism_of_action:['Belongs to a class called ACE inhibitors.','Reduces substances that narrow blood vessels.','Helps blood flow more easily and lowers blood pressure.'],
 adverse_reactions:['May cause dizziness or a persistent dry cough.','Can affect kidney function and potassium levels.','Swelling of the face, lips, or tongue requires emergency care.'],
 warnings_and_cautions:['Do not take during pregnancy; contact your doctor immediately if pregnant.','Tell your doctor about kidney disease.','Ask a clinician before using potassium supplements or salt substitutes.'],
 dosage_and_administration:['Usually taken once daily as prescribed.','Can generally be taken with or without food.','Do not change the dose without medical guidance.']}},
 {id:'metformin',name:'Metformin',aliases:['metformin','metformin hydrochloride','glucophage'],sourceUrl:'https://medlineplus.gov/druginfo/meds/a696005.html',sections:{
 indications_and_usage:['Helps manage blood sugar in type 2 diabetes.','Used alongside diet, exercise, and other treatment when needed.','Helps improve long-term blood sugar control.'],
 mechanism_of_action:['Reduces glucose production in the liver.',"Improves the body's response to insulin.",'Reduces glucose absorption from the digestive tract.'],
 adverse_reactions:['Common effects include nausea, diarrhea, and stomach discomfort.','Digestive symptoms may improve over time.','Rarely, serious lactic acidosis can occur.'],
 warnings_and_cautions:['Tell your doctor about kidney or liver disease.','Severe dehydration or illness may require medical advice about treatment.','Certain imaging procedures using contrast require special precautions.'],
 dosage_and_administration:['Follow the instructions for your specific formulation.','Immediate-release tablets are generally taken with meals.','Extended-release tablets should not be crushed or chewed.']}},
 {id:'amlodipine',name:'Amlodipine',aliases:['amlodipine','amlodipine besylate','norvasc'],sourceUrl:'https://medlineplus.gov/druginfo/meds/a692044.html',sections:{
 indications_and_usage:['Treats high blood pressure.','Helps prevent certain types of chest pain (angina).','Used for certain coronary artery conditions.'],
 mechanism_of_action:['Belongs to a class called calcium channel blockers.','Relaxes blood vessels to lower blood pressure.','Helps improve blood flow to the heart.'],
 adverse_reactions:['May cause swelling in the ankles or feet.','Can cause dizziness, flushing, or fatigue.','Report severe or worsening symptoms to your healthcare professional.'],
 warnings_and_cautions:['May cause dizziness, especially when beginning treatment.','Tell your doctor about liver disease.','Does not provide immediate relief during an active angina attack.'],
 dosage_and_administration:['Usually taken once daily.','Can generally be taken with or without food.','Take consistently and do not stop without medical advice.']}},
 {id:'losartan',name:'Losartan',aliases:['losartan','losartan potassium','cozaar'],sourceUrl:'https://medlineplus.gov/druginfo/meds/a695008.html',sections:{
 indications_and_usage:['Treats high blood pressure.','Helps protect the kidneys in certain patients with type 2 diabetes.','May lower stroke risk in certain patients with high blood pressure.'],
 mechanism_of_action:['Belongs to a class called angiotensin II receptor blockers (ARBs).','Blocks the action of a substance that tightens blood vessels.','Relaxes blood vessels and helps lower blood pressure.'],
 adverse_reactions:['May cause dizziness or lightheadedness.','Can affect potassium levels and kidney function.','Seek medical care for serious allergic reactions or swelling.'],
 warnings_and_cautions:['Do not take during pregnancy; contact your doctor immediately if pregnant.','Tell your doctor if you have kidney or liver disease.','Ask your clinician before using potassium supplements or salt substitutes.'],
 dosage_and_administration:['Usually taken once daily, though some prescriptions differ.','Can generally be taken with or without food.','Follow your prescribed dose and medication schedule.']}}
];
// Exact normalized ingredient/brand identity only. Strength/form suffixes may be removed,
// but combination product names are rejected BEFORE removing their strength suffix.
export function normalizedMedicationIdentity(value:string):string{
 const name=value.toLowerCase().trim().replace(/®|™/g,'');
 if(/\/|\s\+\s|\band\b/.test(name.replace(/\b(?:mg|mcg|g)\s*\/\s*(?:ml|l)\b/g,''))||/\b(?:hydrochlorothiazide|ezetimibe|sitagliptin|empagliflozin)\b/.test(name))return '';
 return name.replace(/\s+\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|%)\b.*$/i,'').replace(/\s*\[(?:lipitor|synthroid|prinivil|zestril|glucophage|norvasc|cozaar)\]\s*$/,'').replace(/\s*\((?:oral|tablet|tab|cap|capsule|solution|suspension|xr|er)[^)]*\)\s*$/,'').replace(/\s+(?:oral\s+)?(?:extended release |immediate release )?(?:tablet|tablets|capsule|capsules|solution|suspension|xr|er)\s*$/,'').replace(/\s+/g,' ').trim();
}
export function matchPrewrittenMedication(names:string[]):PrewrittenMedicationGuide|null{
 if(names.some(n=>/\/|\s\+\s|\band\b/.test(n.toLowerCase().replace(/\b(?:mg|mcg|g)\s*\/\s*(?:ml|l)\b/g,''))))return null;
 const normalized=names.filter(Boolean).map(normalizedMedicationIdentity),matches=prewrittenMedicationGuides.filter(g=>normalized.some(n=>g.aliases.includes(n)));
 return matches.length===1?matches[0]:null;
}
export function verifiedMedicationGuide(name:string,details:CatalogDetails):PrewrittenMedicationGuide|null{
 const ingredients=details.activeIngredients||[];
 if(ingredients.length>1)return null;
 const identityNames=ingredients.length?ingredients.map(i=>i.name):[details.fullGenericName||'',details.productName||'',details.displayName||'',...(details.brandNames||[])];
 // Do not let an unverified page title fabricate a drug match while its profile is loading.
 if(!identityNames.some(Boolean))return null;
 const guide=matchPrewrittenMedication(identityNames);
 if(!guide)return null;
 const displayMatch=matchPrewrittenMedication([name]);if(displayMatch&&displayMatch.id!==guide.id)return null;
 return guide;
}
export function generalAdministrationApplies(details:CatalogDetails,form=''):boolean{
 const forms=[form,...(details.dosageForms||[]),details.labelFormulation||''].join(' ').toLowerCase(),route=(details.route||'').toLowerCase();
 // The supplied administration text describes oral tablets, not IV, topical, feeding-tube
// products or unknown/special formulations. Verified product instructions take precedence there.
 return /\b(?:tablet|tab)\b/.test(forms)&&(!route||/oral/.test(route))&&!/injection|intravenous|topical|sublingual|feeding tube/.test(forms+' '+route);
}
export function scannerMedicationGuide(candidate:ScanCandidate,matched:CatalogMatch|null):PrewrittenMedicationGuide|null{
 // Confidence in the readable drug name is independent of product/NDC confirmation.
 if(candidate.confidence!=='high'&&candidate.confidence!=='medium')return null;
 const guide=matchPrewrittenMedication([candidate.name,candidate.normalizedName||'',candidate.genericName||'']);if(!guide||matchPrewrittenMedication([candidate.name])?.id!==guide.id)return null;
 if(matched){const canonical=verifiedMedicationGuide(matched.matchedName,matched.details)||matchPrewrittenMedication([matched.genericName,matched.matchedName]);if((canonical&&canonical.id!==guide.id)||((matched.details.activeIngredients||[]).length>1))return null;}
 return guide;
}
export const losartanScannerDescription='Losartan is a prescription medication commonly used to treat high blood pressure. It belongs to a class of medicines called angiotensin II receptor blockers (ARBs), which help relax blood vessels and lower blood pressure.';
export const losartanScannerBullets=['Main use: Helps manage high blood pressure.','How it works: Relaxes blood vessels to improve blood flow.','Important: Take only as prescribed and confirm your medication details.'];
