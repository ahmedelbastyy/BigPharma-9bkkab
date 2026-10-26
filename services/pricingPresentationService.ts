import type { Medication } from '@/hooks/useMedications';
import type { AnakinResult } from './anakinService';
import { parseDrugPrices,priceFormMatches,type DrugPriceOffer } from './drugPriceRules';
import { shortMedicationName } from './medicationDisplayService';
import { pricingTarget } from './pricingCacheService';
export function pricingOffers(results:Array<AnakinResult&{target?:string}>,medications:Medication[]):DrugPriceOffer[]{const offers:DrugPriceOffer[]=[],seen=new Set<string>();for(const result of results){const target=result.target||'';for(const m of medications.filter(m=>m.rxcui===result.productRxcui||pricingTarget(m)===target)){if(seen.has(m.id))continue;const rows=parseDrugPrices(result.data,result.source,result.sourceUrl);if(!rows.length)continue;seen.add(m.id);for(const o of rows)offers.push({...o,id:`${m.id}:${o.id}`,medicationId:m.id,rxcui:m.rxcui,medicationName:shortMedicationName(o.medicationName||m.name),recordedForm:m.form,formMismatch:!priceFormMatches(o.form,m.form),retrievedAt:result.retrievedAt});}}return offers;}
