// Authored tests; run in the exported project's Playwright environment. No runtime mock data.
import { test,expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { needsInitialProfile,initialProfilePatch } from '../services/initialProfileRules';
import { priorityGenericName } from '../supabase/functions/_shared/priorityMedicationNames';
import { nadacDescriptionPattern,nadacDescriptionMayMatch,nadacSavedProductMatches,verifiedNadacPackage } from '../supabase/functions/_shared/nadacProductMatch';
import { nadacEstimate } from '../services/nadacEstimateService';
import { normalizeRxPair,selectedRxPairs } from '../supabase/functions/_shared/rxcheckContract';
const read=(path:string)=>readFileSync(path,'utf8');
const product={rxcui:'861007',generic_name:'metformin hydrochloride',full_name:'metformin hydrochloride 500 MG Oral Tablet',strength:'500 mg',dosage_form:'Oral Tablet',term_type:'SCD'};
const benchmark:any={ndc:'00378718505',description:'METFORMIN HCL 500 MG TABLET',costPerUnit:'0.01483',unit:'EA',strength:'500 mg',form:'Oral Tablet',productRxcui:'861007',effectiveDate:'2026-10-21'};
test('Only newly versioned, verified accounts enter optional setup; skip never overwrites identity',()=>{
 expect(needsInitialProfile({})).toBe(false);expect(needsInitialProfile({initial_profile_version:1,account_setup_pending:true})).toBe(false);
 expect(needsInitialProfile({initial_profile_version:1,account_setup_pending:false})).toBe(true);
 expect(needsInitialProfile({initial_profile_version:1,initial_profile_completed:true})).toBe(false);
 expect(initialProfilePatch('')).toEqual({initial_profile_completed:true});
 expect(initialProfilePatch('  Ahmed  ')).toEqual({initial_profile_completed:true,first_name:'Ahmed',full_name:'Ahmed'});
 expect(initialProfilePatch('', 'account/123.jpg')).toEqual({initial_profile_completed:true,avatar_url:'account/123.jpg'});
});
test('Retained splash copy and logo remain separate from original landing; no resume replay',()=>{
 const welcome=read('components/auth/WelcomeExperience.tsx');expect(welcome).toContain('WELCOME TO');expect(welcome).toContain("Something better{'\\n'}starts here.");expect(welcome).toContain("Your health{'\\n'}beautifully{'\\n'}managed");
 expect(read('hooks/useLaunchPreview.ts')).not.toMatch(/addEventListener|setVisible\(true\)/);expect(read('contexts/LaunchVisibilityContext.tsx')).toContain('useState(true)');
 expect(read('app/_layout.tsx')).toContain('<LaunchPreview>');expect(read('app/_layout.tsx')).not.toContain('<TutorialOverlay');
 expect(read('components/auth/InitialProfileScreen.tsx')).toContain('Looking Fresh!');
});
test('All priority aliases resolve exactly, never by arbitrary substring or a combination',()=>{
 for(const [generic,aliases] of Object.entries({atorvastatin:['Lipitor'],levothyroxine:['Synthroid'],lisinopril:['Prinivil','Zestril'],metformin:['Glucophage'],amlodipine:['Norvasc'],losartan:['Cozaar']}))for(const value of [generic,...aliases])expect(priorityGenericName(value)).toBe(generic);
 expect(priorityGenericName('Lipitor 10 mg tablet')).toBe('atorvastatin');expect(priorityGenericName('Notlosartan')).toBeNull();expect(priorityGenericName('losartan / hydrochlorothiazide')).toBeNull();
});
test('Strength, release and exact package validation prevent wrong metformin rates',()=>{
 expect(nadacDescriptionPattern(product)).toBe('METFORMIN%500 MG%');
 expect(nadacDescriptionMayMatch('METFORMIN ER 500 MG OSMOTIC TB',product)).toBe(false);
 expect(nadacSavedProductMatches({strength:'1000 mg',form:'Tablet'},product)).toBe(false);
 expect(nadacSavedProductMatches({strength:'500 mg',form:'Tablet'},product)).toBe(true);
 expect(nadacSavedProductMatches({strength:'500 mg',form:'Extended Release Oral Tablet'},product)).toBe(false);
 const status={ndc11:'00378600291',rxcui:'1807917',status:'ACTIVE',active:'YES',altNdc:'N'};
 expect(verifiedNadacPackage(status,'00378600291','861007')).toBe(false);expect(verifiedNadacPackage(status,'00378600291','1807917')).toBe(true);
 expect(nadacDescriptionPattern({...product,generic_name:'Osmotic 24 HR metformin hydrochloride 500 MG Extended Release Oral Tablet'})).toBe('METFORMIN%500 MG%');
 expect(nadacDescriptionPattern({...product,generic_name:'levothyroxine sodium',strength:'0.137 MG'})).toBe('LEVOTHYROXINE%137 MCG%');
});
test('Observed official IR cost uses supplied compatible quantity without fees or unit guesses',()=>{
 expect(nadacEstimate(benchmark,'30','tablets').total).toBe('$0.44');expect(nadacEstimate(benchmark,'30','mL').total).toBeNull();expect(nadacEstimate(benchmark,'1.5','tablets').total).toBeNull();expect(nadacEstimate(benchmark,'','tablets').total).toBeNull();
 expect(nadacEstimate({...benchmark,unit:'ML',form:'Oral Solution',costPerUnit:'0.50'},'1.5','mL').total).toBe('$0.75');
});
test('Failed, unresolved and explicit no-record responses are not findings; combination pairs survive',()=>{
 expect(normalizeRxPair({},'6809','52175').outcome).toBe('failed');expect(normalizeRxPair({result_status:'unresolved'},'6809','52175').outcome).toBe('unresolved');
 expect(normalizeRxPair({result_status:'no_record_found',interaction:{found:false}},'6809','52175').outcome).toBe('no-record');
 expect(normalizeRxPair({result_status:'no_record_found',query:{drug1:{input:'different'}},interaction:{found:false}},'6809','52175').outcome).toBe('failed');
 const drugs=[{name:'metformin',medicationIds:['combo'],aliases:[]},{name:'saxagliptin',medicationIds:['combo'],aliases:[]},{name:'losartan',medicationIds:['other'],aliases:[]}];expect(selectedRxPairs(drugs,['combo','other'])).toHaveLength(2);
 expect(read('supabase/functions/_shared/rxcheckResolution.ts')).toContain('mapped.ingredients.length===1');
});
test('Scroll policy blurs the input and dismisses overlays without submit/change calls',()=>{
 const policy=read('services/keyboardDismissService.ts');expect(policy).toContain('focused?.blur()');expect(policy).toContain('Keyboard.dismiss()');expect(policy).toContain('onScrollBeginDrag: dismissKeyboardOnScroll');expect(policy).not.toMatch(/onChangeText|onSubmitEditing/);
 for(const path of ['components/auth/AuthFrame.tsx','app/(tabs)/index.tsx','app/(tabs)/cabinet.tsx','app/(tabs)/coupons.tsx','components/feature/RefillSheet.tsx','components/feature/ScannerScene.tsx'])expect(read(path)).toContain('{...keyboardScrollProps}');
});
const base=process.env.BIGPHARMA_PREVIEW_URL||'http://localhost:8081';
test.describe('Genuine signed-in visual acceptance',()=>{
 test.use({storageState:process.env.BIGPHARMA_QA_STORAGE_STATE||undefined});
 test('Profile has two columns with actual 16px/18px border gaps at screenshot viewport',async({page},info)=>{
  test.skip(!process.env.BIGPHARMA_QA_STORAGE_STATE,'Requires a real QA session and running preview.');
  await page.setViewportSize({width:375,height:667});await page.goto(`${base}/more`);
  const cards=page.locator('[data-testid^="profile-stat-"]:not([data-testid="profile-stat-grid"])');await expect(cards).toHaveCount(4);
  const boxes=await cards.evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};}));
  expect(Math.abs(boxes[1].x-(boxes[0].x+boxes[0].width)-16)).toBeLessThan(1);
  expect(Math.abs(boxes[2].y-(boxes[0].y+boxes[0].height)-18)).toBeLessThan(1);
  expect(boxes[0].y).toBe(boxes[1].y);expect(boxes[2].y).toBe(boxes[3].y);
  expect(boxes[0].height).toBe(boxes[1].height);expect(boxes[2].height).toBe(boxes[3].height);
  await page.screenshot({path:info.outputPath('profile-375x667-gaps.png')});
 });
});
