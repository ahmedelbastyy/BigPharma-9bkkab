import { unzipSync, strFromU8 } from 'https://esm.sh/fflate@0.8.2';
// Exact column order published by NLM. STRENGTHS_AND_FORMS is a Clinical Tables derived field, not a release column.
const mainColumns = ['RXCUI','GENERIC_RXCUI','TTY','FULL_NAME','RXN_DOSE_FORM','FULL_GENERIC_NAME','BRAND_NAME','DISPLAY_NAME','ROUTE','NEW_DOSE_FORM','STRENGTH','SUPPRESS_FOR','DISPLAY_NAME_SYNONYM','IS_RETIRED','SXDG_RXCUI','SXDG_TTY','SXDG_NAME','PSN'];
const ingredientColumns = ['RXCUI','INGREDIENT','ING_RXCUI'];
export type ReleaseProduct = { rxcui:string; genericRxcui:string; termType:string; fullName:string; fullGenericName:string; brandName:string; displayName:string; route:string; rxnormDoseForm:string; interfaceForm:string; strength:string; sxdgRxcui:string; groupKey:string; aliases:string[]; ingredients:Array<{rxcui:string;name:string}>; details:Record<string,unknown> };
function rows(text:string,documented:string[]) {
 const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/).filter(x=>x.trim());
 if(!lines.length)throw new Error('Empty NLM data file');
 const delimiter=lines[0].includes('|')?'|':'\t';
 let columns=lines[0].split(delimiter).map(x=>x.trim());
 const hasHeader=columns[0]==='RXCUI';
 if(!hasHeader){if(!/^\d+$/.test(columns[0]))throw new Error('Unrecognized NLM file header');columns=documented;}
 for(const key of documented)if(!columns.includes(key))throw new Error(`NLM schema changed: missing ${key}`);
 return lines.slice(hasHeader?1:0).map((line,index)=>{const cells=line.split(delimiter);if(cells.length<columns.length)throw new Error(`NLM row ${index+1} has fewer fields than documented`);return Object.fromEntries(columns.map((key,i)=>[key,cells[i]?.trim()??'']));});
}
export function parseRelease(bytes:Uint8Array,version:string) {
 const files=unzipSync(bytes,{filter:file=>/\.txt$/i.test(file.name)&&(/rxterms/i.test(file.name)||/ingredients/i.test(file.name))});
 const main=Object.keys(files).find(name=>new RegExp(`(?:^|/)RxTerms${version}\\.txt$`,'i').test(name));
 const ingredients=Object.keys(files).find(name=>/ingredients/i.test(name)&&name.includes(version));
 if(!main||!ingredients)throw new Error('Release archive is missing the main or ingredient mapping file');
 const mapping=new Map<string,Array<{rxcui:string;name:string}>>();
 for(const row of rows(strFromU8(files[ingredients]),ingredientColumns)) {
  if(!/^\d+$/.test(row.RXCUI)||!/^\d+$/.test(row.ING_RXCUI))throw new Error('Invalid ingredient RxCUI');
  const values=mapping.get(row.RXCUI)??[];if(!values.some(x=>x.rxcui===row.ING_RXCUI))values.push({rxcui:row.ING_RXCUI,name:row.INGREDIENT});mapping.set(row.RXCUI,values);
 }
 const products:ReleaseProduct[]=[],seen=new Set<string>();let excluded=0;
 for(const row of rows(strFromU8(files[main]),mainColumns)) {
  if(row.SUPPRESS_FOR||row.IS_RETIRED){excluded++;continue;}
  if(!/^\d+$/.test(row.RXCUI)||!['SCD','SBD','BPCK','GPCK'].includes(row.TTY)||!row.DISPLAY_NAME)throw new Error('Invalid supported RxTerms product');
  if(seen.has(row.RXCUI))throw new Error(`Duplicate RxCUI in release: ${row.RXCUI}`);seen.add(row.RXCUI);
  const aliases=row.DISPLAY_NAME_SYNONYM.split(';').map(x=>x.trim()).filter(Boolean);
  products.push({rxcui:row.RXCUI,genericRxcui:row.GENERIC_RXCUI,termType:row.TTY,fullName:row.FULL_NAME,fullGenericName:row.FULL_GENERIC_NAME,brandName:row.BRAND_NAME,displayName:row.DISPLAY_NAME,route:row.ROUTE,rxnormDoseForm:row.RXN_DOSE_FORM,interfaceForm:row.NEW_DOSE_FORM,strength:row.STRENGTH,sxdgRxcui:/^\d+$/.test(row.SXDG_RXCUI)?row.SXDG_RXCUI:'',groupKey:row.DISPLAY_NAME.toLowerCase(),aliases,ingredients:mapping.get(row.RXCUI)??[],details:{identitySource:'NLM monthly RxTerms release',interfaceForm:row.NEW_DOSE_FORM,prescribableName:row.PSN,sxdgName:row.SXDG_NAME,sxdgType:row.SXDG_TTY,clinicalDataStatus:'not_yet_enriched',availabilityStatus:'supported_in_release',activeIngredients:mapping.get(row.RXCUI)??[]}});
 }
 // Bootstrap common products without losing the rest of the complete release.
 const priority=['lisinopril','metformin','atorvastatin','losartan','semaglutide'];
 products.sort((a,b)=>{const rank=(x:ReleaseProduct)=>{const i=priority.findIndex(name=>x.displayName.toLowerCase().startsWith(name+' ('));return i<0?99:i;};return rank(a)-rank(b)||a.displayName.localeCompare(b.displayName)||a.rxcui.localeCompare(b.rxcui);});
 return {products,excluded,files:[main,ingredients],types:products.reduce((out,p)=>({...out,[p.termType]:(out[p.termType]??0)+1}),{} as Record<string,number>)};
}
export async function sourceFetch(url:string,timeout=25000) {
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
 try {const response=await fetch(url,{signal:controller.signal});if(!response.ok)throw new Error(`Official source HTTP ${response.status}: ${new URL(url).hostname}`);if(Number(response.headers.get('content-length')??0)>20000000)throw new Error('Official source exceeds the bounded download budget');const bytes=await response.arrayBuffer();if(bytes.byteLength>20000000)throw new Error('Official source exceeds the bounded download budget');return new Response(bytes,{status:response.status,headers:response.headers});}finally{clearTimeout(timer);}
}
