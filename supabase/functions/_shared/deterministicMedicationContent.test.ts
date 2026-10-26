import { exactSourceCard,deterministicMedicationProfile } from './deterministicMedicationContent.ts';
import { validateMedicationContent } from './medicationContentContract.ts';
function assert(value:unknown,message:string){if(!value)throw new Error(message);}
Deno.test('Only whole short source sections qualify for zero-AI preparation',()=>{
 const source='This medicine treats the specified condition in adults.';
 const card=exactSourceCard('indications_and_usage',source);
 assert(card?.statements[0].text===source,'A complete source is retained verbatim');
 assert(card?.statements[0].evidence[0].quote===source,'Exact source evidence is retained');
 assert(!exactSourceCard('boxed_warning',Array(6).fill('• A specific serious risk requires attention.').join('\n')),'A sixth safety bullet is not truncated away');
 assert(!exactSourceCard('indications_and_usage','11 DESCRIPTION C21H31 molecular formula.'),'Chemistry and numbering never become purpose');
 assert(!exactSourceCard('adverse_reactions','A randomized placebo-controlled trial found a statistically significant difference.'),'Trial methodology is excluded');
});
Deno.test('Deterministic profiles are exact-product drafts, not automatic approvals',()=>{
 const metadata={schema_version:'patient-profile-v1' as const,identity:{medication_id:'fixture',rxcui:'123',name:'Fixture',strength:'50 mg',formulation:'Oral Tablet'},source_url:'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=fixture',source_setid:'fixture',label_version:'1',generated_at:'2026-10-24T00:00:00Z'};
 const sources={indications_and_usage:'This medicine treats the specified condition in adults.',boxed_warning:'Do not use during pregnancy. Contact your prescriber if pregnancy occurs.'};
 const result=deterministicMedicationProfile(metadata,sources);
 assert(result.rewriteKeys.length===0,'Short whole sections require no AI');
 assert(result.exactCards===2,'Purpose and complete short warning retained');
 const expected={medication_id:'fixture',rxcui:'123',setid:'fixture',version:'1',strength:'50 mg',formulation:'Oral Tablet'};
 assert(validateMedicationContent(result.profile,expected,sources).length===0,'Draft satisfies evidence contract');
 assert(validateMedicationContent(result.profile,{...expected,strength:'25 mg'},sources).length>0,'Wrong strength rejected');
 assert(result.profile.use_it_well.storage===null,'No invented storage instructions');
});
