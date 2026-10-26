import { test,expect } from '@playwright/test';
import fs from 'node:fs';
import { medicationContentSeeds } from '../services/medicationContentSeed';
import { draftMedicationSections,medicationSectionsFromProfile,medicationSectionPlacementErrors } from '../services/medicationSectionService';
import { buildGenericReviewTemplate,approvedGenericProfileIsPublishable } from '../services/genericMedicationContentService';
import { contentCardText } from '../services/medicationContentContract';
const read=(path:string)=>fs.readFileSync(path,'utf8');
for(const seed of medicationContentSeeds)test(`${seed.medication_name}: exact supplied wording maps into its own three sections`,()=>{
 const p=draftMedicationSections(seed as unknown as Record<string,unknown>);
 expect(p.drugClass).toBe(seed.drug_class);expect(p.whatItDoes.flatMap(c=>c.statements.map(s=>s.text))).toEqual(seed.what_it_does);
 expect(p.sideEffects.flatMap(c=>c.statements.map(s=>s.text))).toEqual(seed.common_side_effects);
 expect(p.warnings.flatMap(c=>c.statements.map(s=>s.text))).toEqual(seed.important_warnings);
 expect(p.useItWell.flatMap(c=>c.statements.map(s=>s.text))).toEqual(seed.use_it_well);
 expect(p.sideEffects[0].key).toBe('adverse_reactions');expect(p.useItWell[0].key).toBe('dosage_and_administration');
});
test('Review templates retain wording and reject cross-section placement',()=>{const s=medicationContentSeeds.find(s=>s.medication_name==='LISINOPRIL')!,p=buildGenericReviewTemplate(s as unknown as Record<string,unknown>,s.ingredient_rxcuis,['oral']);expect(medicationSectionPlacementErrors(p)).toEqual([]);p.what_it_does.explanation.key='adverse_reactions';expect(medicationSectionPlacementErrors(p)).toContain('What It Does: incorrect clinical category adverse_reactions');});
test('Formulation-dependent administration stays attached only to explicitly reviewed product codes',()=>{
 const s=medicationContentSeeds.find(s=>s.medication_name==='METFORMIN')!,p=buildGenericReviewTemplate(s as unknown as Record<string,unknown>,s.ingredient_rxcuis,['oral']);p.administration_applicability.product_rxcuis=['861007'];
 expect(medicationSectionsFromProfile(p,'861007').useItWell.length).toBe(1);expect(medicationSectionsFromProfile(p,'860975').useItWell).toEqual([]);expect(medicationSectionsFromProfile(p,'860975').whatItDoes[0].statements[0].text).toBe(s.what_it_does[0]);
});
test('Multiple approved warning cards with the same source category are never overwritten',()=>{const s=medicationContentSeeds[0],p=buildGenericReviewTemplate(s as unknown as Record<string,unknown>,s.ingredient_rxcuis,['oral']);p.know_before_taking.important_warnings.push({...p.know_before_taking.important_warnings[0],statements:[{text:'Second preserved safety statement.',evidence:[]}]});expect(medicationSectionsFromProfile(p).warnings.length).toBe(2);expect(contentCardText(medicationSectionsFromProfile(p).warnings[1])).toBe('Second preserved safety statement.');});
test('The supplied unreviewed educational draft cannot pass the patient publication gate',()=>{expect(approvedGenericProfileIsPublishable({status:'approved',content_scope:'ingredient',content_json:medicationContentSeeds[0]})).toBe(false);});
test('All entry points use the same sections and retrieval path, with no page-open generation or status polling',()=>{
 expect(read('components/feature/CatalogReference.tsx')).toContain('MedicationInformationSections');expect(read('components/feature/ScanClinicalContent.tsx')).toContain('MedicationInformationSections');
 const hook=read('hooks/useCatalogReference.ts');expect(hook).toContain('loadMedicationProfile');expect(hook).not.toContain('enqueuePreparation');expect(hook).not.toContain('readMedicationPreparation');
 const profile=read('services/medicationProfileService.ts');expect(profile).toContain('codes.length===1');expect(profile).toContain('15000');
 const load=read('services/medicationContentService.ts').split('export async function loadSavedMedicationContent')[1];expect(load).not.toContain('functions.invoke');expect(load).not.toContain('enqueuePreparation');expect(load).toContain('bigpharma:content:v7:');
});
test('The persisted migration maps all intake fields without approving or rewriting medical claims',()=>{const migration=read('supabase/migrations/20261025_medication_section_display.sql');expect(migration).toContain('generated always');expect(migration).toContain("profile->'important_warnings'");expect(migration).not.toMatch(/update public\.medication_content set status/i);});
// These are synthetic mapping/contract tests, not proof of device testing or clinical verification.
