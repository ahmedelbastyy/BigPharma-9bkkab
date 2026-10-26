// Shared display contract: never truncate official labeling into a patient card.
export const patientKeys = ['description','indications_and_usage','mechanism_of_action','adverse_reactions','boxed_warning','warnings_and_cautions','contraindications','drug_interactions','dosage_and_administration','storage_and_handling','usage_in_specific_populations','patient_information'] as const;
export const safetyKeys = ['boxed_warning','warnings_and_cautions','contraindications','drug_interactions','usage_in_specific_populations'];
export function sentenceCount(text: string): number {
 const clean=text.replace(/\*\*/g,'').replace(/(\d)\.(\d)/g,'$1·$2').replace(/\b(mg|ml|dr|e\.g|i\.e)\./gi,'$1');
 return clean.split(/\n+/).filter(x=>x.trim()).reduce((sum,line)=>sum+Math.max(1,(line.match(/[.!?](?:\s|$)/g)||[]).length),0);
}
export function patientTextProblem(key:string,text:unknown):string|null {
 if(typeof text!=='string'||!text.trim())return 'Missing explanation';
 if(!patientKeys.includes(key as typeof patientKeys[number]))return 'Unsupported patient category';
 if(/<[^>]+>|&(?:#\d+|[a-z]+);|\b(?:DESCRIPTION|CLINICAL STUDIES|HOW SUPPLIED)\b|(?:^|\n)\s*(?:\d+(?:\.\d+)*\s+[A-Z]|\d+\s*$)|\b(?:molecular formula|molecular weight|chemical structure|empirical formula|structural formula|IUPAC|C\d+H\d+|randomized|double-blind|placebo-controlled|confidence interval)\b|[\x00-\x08\x0b\x0c\x0e-\x1f]/i.test(text))return 'Raw labeling or technical artifacts';
 const limit=['description','indications_and_usage','mechanism_of_action','storage_and_handling'].includes(key)?3:10;
 if(sentenceCount(text)>limit)return `Use at most ${limit} concise sentences`;
 const lines=text.split(/\n+/).filter(x=>x.trim());
 if(lines.filter(line=>/^\s*[•*-]\s+/.test(line)).length>5)return 'Use at most five bullet points';
 const sentences=lines.flatMap(line=>line.replace(/\*\*/g,'').split(/(?<=[.!?])\s+(?=[A-Z•])/));
 if(sentences.some(sentence=>sentence.trim().split(/\s+/).length>46))return 'Sentence needs plain-language editing';
 if(text.length>1900)return 'Explanation needs editorial simplification';
 return null;
}
export function approvedPatientText(key:string,text:unknown):string|null {return patientTextProblem(key,text)?null:String(text).trim();}
export function validPatientSummary(sections:Record<string,unknown>):boolean {return Object.keys(sections).length>0&&Object.entries(sections).every(([key,text])=>!patientTextProblem(key,text));}
