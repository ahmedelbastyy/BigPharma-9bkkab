import { test,expect } from '@playwright/test';
import { runMedicationProductChecks } from './medicationProductChecks';
import { runMedicationContentChecks } from './medicationContentChecks';
const base=process.env.BIGPHARMA_PREVIEW_URL||'http://localhost:8081',session=process.env.BIGPHARMA_QA_STORAGE_STATE;
test('Shared product assets and clinical source contracts',()=>{expect(runMedicationProductChecks()).toContain('passed');expect(runMedicationContentChecks()).toContain('passed');});
const products=[{kind:'bottle',id:process.env.BIGPHARMA_QA_TABLET_ID||process.env.BIGPHARMA_QA_MEDICATION_ID},{kind:'inhaler',id:process.env.BIGPHARMA_QA_INHALER_ID},{kind:'nasal',id:process.env.BIGPHARMA_QA_NASAL_ID}];
test.describe('Existing authenticated product pages',()=>{
 test.use({storageState:session||undefined,reducedMotion:'reduce'});
 for(const product of products)for(const width of [320,390,768])test(`${product.kind} ${width}px centered hero and nonempty guidance`,async({page},info)=>{
  test.skip(!session||!product.id,'Requires an existing real authenticated QA session and saved product; no test account or prescription is created.');
  await page.setViewportSize({width,height:740});await page.goto(`${base}/medication/${product.id}`);await page.waitForTimeout(4500);
  const launch=page.getByRole('button',{name:'Swipe up to begin. Double tap to continue.',exact:true});if(await launch.isVisible())await launch.click();
  await expect(page.getByTestId('detail-hero-container')).toBeVisible({timeout:20000});
  await expect(page.getByTestId(`medication-product-${product.kind}`)).toBeAttached();
  const bounds=await page.evaluate(()=>{
   const rect=(id:string)=>document.querySelector(`[data-testid="${id}"]`)!.getBoundingClientRect();
   const header=rect('detail-medication-header'),hero=rect('detail-hero-container'),art=rect('detail-scroll-artwork'),content=rect('detail-what-it-does');
   return {afterTitle:hero.top>=header.bottom-1,beforeContent:hero.bottom<=content.top+1,center:Math.abs((art.left+art.right)/2-(hero.left+hero.right)/2),contained:art.left>=hero.left&&art.right<=hero.right+1&&art.top>=hero.top&&art.bottom<=hero.bottom+1};
  });
  expect(bounds.afterTitle&&bounds.beforeContent&&bounds.contained).toBe(true);expect(bounds.center).toBeLessThan(2);
  for(const section of ['detail-what-it-does','detail-know-before-taking','detail-use-it-well']){
   const panel=page.getByTestId(section);await expect(panel).toBeAttached();expect((await panel.textContent())!.trim().length).toBeGreaterThan(50);
  }
  const bodies=await page.locator('[data-testid^="detail-card-"]').allTextContents();
  expect(bodies.join(' ')).not.toMatch(/11 DESCRIPTION|molecular formula|chemical structure|<section|<paragraph/i);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)).toBe(false);
  await page.screenshot({path:info.outputPath(`${product.kind}-${width}.png`)});
 });
 for(const product of products)test(`${product.kind} approved summary persists without preparation on reopening`,async({page})=>{
  test.skip(!session||!product.id||process.env.BIGPHARMA_QA_APPROVED_PROFILES!=='true','Requires those exact products to have identified clinical approvals; generated drafts are not automatically published.');
  let ensureCalls=0;
  page.on('request',request=>{if(request.url().includes('/functions/v1/medication-content')&&request.method()==='POST'){try{if(request.postDataJSON()?.action==='ensure')ensureCalls++;}catch{}}});
  const responsePromise=page.waitForResponse(r=>r.url().includes('/rpc/get_bigpharma_medication_profile')&&r.status()===200);
  await page.goto(`${base}/medication/${product.id}`);const payload=await (await responsePromise).json();
  expect(payload.approved.status).toBe('approved');expect(payload.approved.medication_id).toBe(payload.product.id);expect(payload.approved.rxcui).toBe(payload.product.rxcui);
  const card=page.getByTestId('detail-card-description').or(page.getByTestId('detail-card-indications_and_usage'));
  await expect(card.first()).toBeAttached({timeout:20000});const first=await card.first().textContent();
  await page.reload();await expect(card.first()).toHaveText(first!);expect(ensureCalls).toBe(0);
 });
});
// No tests are marked executed without a real browser runner and authenticated fixture IDs.
