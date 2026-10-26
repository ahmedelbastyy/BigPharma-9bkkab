import { test,expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { nextRxSelection,selectedRxPairs,normalizeRxPair,cacheableRxRelease } from '../supabase/functions/_shared/rxcheckContract';
import { rxnormINIngredients } from '../supabase/functions/_shared/medicationIngredientResolver';
const read=(file:string)=>readFileSync(file,'utf8');
const inPayload=(values:Array<[string,string]>)=>({relatedGroup:{conceptGroup:[{tty:'IN',conceptProperties:values.map(([rxcui,name])=>({rxcui,name,tty:'IN',suppress:'N'}))}]}});
test('Selection toggles, replaces only the second medication and never exceeds two',()=>{
 let ids:string[]=[];ids=nextRxSelection(ids,'ibuprofen');expect(ids).toEqual(['ibuprofen']);ids=nextRxSelection(ids,'lisinopril');expect(ids).toEqual(['ibuprofen','lisinopril']);ids=nextRxSelection(ids,'metformin');expect(ids).toEqual(['ibuprofen','metformin']);ids=nextRxSelection(ids,'ibuprofen');expect(ids).toEqual(['metformin']);ids=nextRxSelection(ids,'metformin');expect(ids).toEqual([]);
});
test('Combination expansion includes only unique cross-product ingredient pairs',()=>{
 const drugs=[{name:'ibuprofen',medicationIds:['single'],aliases:[]},{name:'lisinopril',medicationIds:['combo'],aliases:[]},{name:'hydrochlorothiazide',medicationIds:['combo'],aliases:[]},{name:'atorvastatin',medicationIds:['unselected'],aliases:[]}];
 const pairs=selectedRxPairs(drugs,['single','combo']);expect(pairs.map(p=>p.id)).toEqual(['hydrochlorothiazide|ibuprofen','ibuprofen|lisinopril']);expect(selectedRxPairs(drugs,['combo','single'])).toEqual(pairs);expect(selectedRxPairs(drugs,['single'])).toEqual([]);expect(selectedRxPairs(drugs,['single','single'])).toEqual([]);
 const overlap=[{name:'a',medicationIds:['one','two'],aliases:[]},{name:'b',medicationIds:['one','two'],aliases:[]}];expect(selectedRxPairs(overlap,['one','two']).map(p=>p.id)).toEqual(['a|b']);expect(selectedRxPairs([{name:'a',medicationIds:['one','two'],aliases:[]}],['one','two'])).toEqual([]);
});
test('Real RxNorm mapping shapes preserve salts, branded products and combination ingredients',()=>{
 expect(rxnormINIngredients(inPayload([['5640','ibuprofen']])).map(i=>i.name)).toEqual(['ibuprofen']);
 expect(rxnormINIngredients(inPayload([['29046','lisinopril'],['5487','hydrochlorothiazide']])).map(i=>i.name)).toEqual(['hydrochlorothiazide','lisinopril']);
 expect(rxnormINIngredients(inPayload([['6809','metformin']])).map(i=>i.name)).toEqual(['metformin']);
 expect(rxnormINIngredients(inPayload([['52175','losartan']])).map(i=>i.name)).toEqual(['losartan']);
 expect(rxnormINIngredients(inPayload([['108118','mometasone']])).map(i=>i.name)).toEqual(['mometasone']);
 expect(rxnormINIngredients(inPayload([['83367','atorvastatin']])).map(i=>i.name)).toEqual(['atorvastatin']);
 expect(rxnormINIngredients(inPayload([['1','Ibuprofen 200 mg Oral Tablet']]))).toEqual([]);
 expect(rxnormINIngredients(inPayload([['1','a'],['2','invalid 200 mg product']]))).toEqual([]);
});
test('Nested ambiguity from actual RxCheck responses is never a no-record result',()=>{
 const payload={status:'success',result_status:'no_record_found',dataset_release:'unversioned',query:{drug1:{input:'metformin',resolved_name:'Metformin',rxcui:'1043567',normalization:{ambiguous:true,candidate_count:2}},drug2:{input:'losartan',rxcui:'2709046',normalization:{ambiguous:false}}},interaction:{found:false}};
 expect(normalizeRxPair(payload,'metformin','losartan').outcome).toBe('unresolved');
 expect(normalizeRxPair({...payload,query:{...payload.query,drug1:{...payload.query.drug1,normalization:{ambiguous:false,candidate_count:1}}}},'metformin','losartan').outcome).toBe('no-record');
 expect(normalizeRxPair(payload,'ibuprofen','lisinopril').outcome).toBe('failed');
 expect(cacheableRxRelease('unversioned')).toBe(false);expect(cacheableRxRelease('development')).toBe(false);expect(cacheableRxRelease('fixture-release-1')).toBe(true);
});
test('Only product IDs and selected ingredient pairs enter the secure adapter',()=>{
 const hook=read('hooks/useInteractionChecker.ts'),edge=read('supabase/functions/rxcheck-interactions/index.ts'),network=read('components/feature/PharmacologyNetwork.tsx');
 expect(hook).toContain('selectedRxPairs(next.drugs,ids)');expect(hook).not.toContain('uniqueRxPairs(');expect(hook).toContain('selected.current.join');expect(hook).toContain('controller.current?.abort()');expect(hook).toContain('if(lock.current');
 expect(edge).toContain('selected.length!==2');expect(edge).toContain('selectedRxPairs(cabinet.drugs,selected)');expect(edge).not.toContain('uniqueRxPairs(');expect(edge).toContain('resultStatus:product.resolution');expect(edge).toContain("Deno.env.get('RXCHECK_API_KEY')");
 expect(network).toContain("id:'selection-only'");expect(network).toContain("selection?'5 4'");expect(network).toContain('NetworkCanvas large {...canvasProps}');expect(network).toContain('useScientificNetwork(items,edges)');expect(network).toContain('state.positions.value[edge.source]');
 expect(read('services/educationService.ts')).not.toContain('uniqueRxPairs(');
});
test('Condition explanatory copy is below the result list, not above medication cards',()=>{
 const file=read('app/condition-lookup.tsx'),footer=file.indexOf('ListFooterComponent=');expect(file.indexOf('About these labeled-use results')).toBeGreaterThan(footer);expect(file.indexOf('This is a labeling search, not a diagnosis')).toBeGreaterThan(footer);
});
// Optional genuine public API tests. Not automatically run, and no mock data enters the app.
test.describe('Live RxCheck selected-ingredient requests',()=>{
 test.skip(process.env.BIGPHARMA_LIVE_RXCHECK_TESTS!=='1','Explicit opt-in required for live provider traffic.');
 for(const [first,second] of [['ibuprofen','lisinopril'],['atorvastatin','lisinopril'],['metformin','losartan'],['mometasone','ibuprofen'],['warfarin','aspirin']])test(`${first} + ${second}`,async({request})=>{
  const response=await request.get(`https://api.rxcheck.dev/v1/interactions?drug1=${encodeURIComponent(first)}&drug2=${encodeURIComponent(second)}`);expect(response.status()).toBe(200);const payload=await response.json(),result=normalizeRxPair(payload,first,second,response.status());expect(['found','no-record','unresolved']).toContain(result.outcome);
  if(payload.query?.drug1?.normalization?.ambiguous||payload.query?.drug2?.normalization?.ambiguous)expect(result.outcome).toBe('unresolved');
 });
});
