// Opt-in DEPLOYED Edge Function tests using only pre-provisioned synthetic accounts.
// No service-role/signing keys, fabricated production approval, patient-data logging or expiration overrides.
// Positive professional requests use Connect's REAL deployed approval proxy; missing assertions are tested directly.
import {assertEquals, assert} from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {createClient, FunctionsHttpError, type SupabaseClient} from 'npm:@supabase/supabase-js@2';
const base='https://ibmovdnyqtzlbxtuibmo.backend.onspace.ai',origin='https://bigpharma-connect-nweb365.vercel.app';
const env=(key:string)=>Deno.env.get(key)||'';
const required=['BIGPHARMA_QA_ANON_KEY','BIGPHARMA_QA_PATIENT_EMAIL','BIGPHARMA_QA_PATIENT_PASSWORD','BIGPHARMA_QA_PROFESSIONAL_EMAIL','BIGPHARMA_QA_PROFESSIONAL_PASSWORD','BIGPHARMA_QA_SECOND_PROFESSIONAL_EMAIL','BIGPHARMA_QA_SECOND_PROFESSIONAL_PASSWORD','BIGPHARMA_QA_UNAPPROVED_EMAIL','BIGPHARMA_QA_UNAPPROVED_PASSWORD'];
const proxyUrl=env('BIGPHARMA_QA_CONNECT_PROXY_URL');
const enabled=env('BIGPHARMA_SHARING_SYNTHETIC_ONLY')==='yes'&&required.every(k=>env(k))&&proxyUrl===`${origin}/api/patient-sharing`;
const professionals=new WeakSet<SupabaseClient>();
async function login(prefix:string){
 const client=createClient(base,env('BIGPHARMA_QA_ANON_KEY'),{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Origin:origin}}});
 const {data,error}=await client.auth.signInWithPassword({email:env(`BIGPHARMA_QA_${prefix}_EMAIL`),password:env(`BIGPHARMA_QA_${prefix}_PASSWORD`)});
 if(error||!data.session)throw new Error('Synthetic test authentication failed.');
 if(['PROFESSIONAL','SECOND_PROFESSIONAL','UNAPPROVED'].includes(prefix))professionals.add(client);
 return client;
}
async function call(client:SupabaseClient,body:Record<string,unknown>){
 if(professionals.has(client)){
  const {data:{session}}=await client.auth.getSession();if(!session)throw new Error('Synthetic session missing.');
  const response=await fetch(proxyUrl,{method:'POST',headers:{Origin:origin,Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'},body:JSON.stringify(body),redirect:'error'});
  return {status:response.status,data:(response.headers.get('Content-Type')||'').startsWith('image/')?await response.blob():await response.json()};
 }
 const {data,error}=await client.functions.invoke('patient-sharing',{body});
 if(error){if(error instanceof FunctionsHttpError){const status=error.context.status;return {status,data:JSON.parse(await error.context.text())};}throw new Error('Live sharing transport unavailable.');}
 return {status:200,data};
}
Deno.test({name:'Deployed Edge: production-origin preflight and unsigned POST denial',ignore:!env('BIGPHARMA_QA_ANON_KEY'),fn:async()=>{
 const preflight=await fetch(`${base}/functions/v1/patient-sharing`,{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'authorization,apikey,content-type'}});
 assert([200,204].includes(preflight.status));assertEquals(preflight.headers.get('access-control-allow-origin'),origin);await preflight.arrayBuffer();
 const response=await fetch(`${base}/functions/v1/patient-sharing`,{method:'POST',headers:{Origin:origin,apikey:env('BIGPHARMA_QA_ANON_KEY'),'Content-Type':'application/json'},body:JSON.stringify({action:'redeem',token:'a'.repeat(64)})});
 assertEquals(response.status,401);assertEquals((await response.json()).code,'SIGN_IN_REQUIRED');
}});
Deno.test({name:'Deployed proxy + Edge: Generate identity authorization, private photo, binding and revocation',ignore:!enabled,fn:async()=>{
 const patient=await login('PATIENT'),professional=await login('PROFESSIONAL'),second=await login('SECOND_PROFESSIONAL'),unapproved=await login('UNAPPROVED');
 assertEquals((await call(professional,{action:'professional_status'})).data.approved,true);
 assertEquals((await call(second,{action:'professional_status'})).data.approved,true);
 const absent=await call(patient,{action:'create',confirmed:false,scopes:['profile'],minutes:15});assertEquals(absent.status,400);
 const invalid=await call(patient,{action:'create',confirmed:true,scopes:['credentials'],minutes:15});assertEquals(invalid.status,400);
 // A real professional JWT alone or browser flags must NOT authorize the deployed Edge.
 const {data:{session}}=await professional.auth.getSession();assert(session);
 for(const extra of [{},{verified:true,approved:true}]){
  const denied=await fetch(`${base}/functions/v1/patient-sharing`,{method:'POST',headers:{Origin:origin,apikey:env('BIGPHARMA_QA_ANON_KEY'),Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({action:'sessions',...extra})});
  assertEquals(denied.status,403);assertEquals((await denied.json()).code,'MISSING_ASSERTION');
 }
 const created=await call(patient,{action:'create',confirmed:true,scopes:[],minutes:15});assertEquals(created.status,200);assert(created.data.identity_consented_at);assertEquals(created.data.scopes,['profile']);
 assertEquals(Date.parse(created.data.expires_at)-Date.parse(created.data.created_at),900000);
 assert(/^https:\/\/bigpharma-connect-nweb365\.vercel\.app\/invite\/[a-f0-9]{64}$/.test(created.data.share_url));
 const raw=created.data.share_url.split('/invite/')[1];
 try {
  const denied=await call(unapproved,{action:'redeem',token:raw});assertEquals(denied.status,403);assertEquals(denied.data.code,'PROFESSIONAL_NOT_APPROVED');
  assertEquals((await call(professional,{action:'redeem',token:'not-a-token'})).status,404);
  const redeemed=await call(professional,{action:'redeem',token:raw});assertEquals(redeemed.status,200);assertEquals(redeemed.data.expires_at,created.data.expires_at);
  const grant=redeemed.data.grant_id;
  assertEquals((await call(professional,{action:'redeem',token:raw})).data.grant_id,grant);
  const stolen=await call(second,{action:'redeem',token:raw});assertEquals(stolen.status,409);assertEquals(stolen.data.code,'INVITATION_ALREADY_REDEEMED');
  const view=await call(professional,{action:'patient',grant_id:grant,days:30});assertEquals(view.status,200);
  assertEquals(view.data.profile.email,env('BIGPHARMA_QA_PATIENT_EMAIL'));assert(typeof view.data.profile.display_name==='string'&&view.data.profile.display_name.trim());
  for(const key of ['medications','schedule','adherence','dose_history','activity','email','user_id','token_hash','photo_path'])assertEquals(key in view.data,false);
  for(const action of ['medications','schedule','adherence','activity'])assertEquals((await call(professional,{action,grant_id:grant})).status,403);
  // The dedicated QA patient MUST have a synthetic image uploaded via the real mobile profile editor.
  assertEquals(view.data.profile.photo_available,true);
  const image=await call(professional,{action:'photo',grant_id:grant});assertEquals(image.status,200);assert(image.data instanceof Blob);assert(image.data.size>0);assert(['image/jpeg','image/png','image/webp'].includes(image.data.type));
  assertEquals((await call(second,{action:'patient',grant_id:grant})).status,404);
  const revoked=await call(patient,{action:'revoke',invitation_id:created.data.id});assertEquals(revoked.status,200);
  for(const action of ['status','patient','profile','photo']){const blocked=await call(professional,{action,grant_id:grant});assertEquals(blocked.status,410);assertEquals(blocked.data.code,'ACCESS_REVOKED');}
  assertEquals((await call(professional,{action:'redeem',token:raw})).status,410);
  assertEquals((await call(professional,{action:'sessions'})).data.items.some((s:any)=>s.grant_id===grant),false);
 } finally {await call(patient,{action:'revoke',invitation_id:created.data.id});}
}});
// Sixteen separate synthetic patients avoid bypassing or exhausting the normal per-patient hourly limit.
const matrixEnabled=enabled&&Array.from({length:16},(_,i)=>i).every(i=>env(`BIGPHARMA_QA_SCOPE_PATIENT_${i}_EMAIL`)&&env(`BIGPHARMA_QA_SCOPE_PATIENT_${i}_PASSWORD`));
Deno.test({name:'Deployed proxy + Edge: all sixteen optional-scope combinations and exact history windows',ignore:!matrixEnabled,fn:async()=>{
 const professional=await login('PROFESSIONAL'),optional=['medications','schedule','adherence','activity'];
 await new Promise(r=>setTimeout(r,61000)); // Isolate the preceding approval/replay suite's minute window.
 for(let mask=0;mask<16;mask++){
  const patient=await login(`SCOPE_PATIENT_${mask}`),scopes=['profile',...optional.filter((_,i)=>(mask&(1<<i))!==0)];
  const created=await call(patient,{action:'create',confirmed:true,scopes,minutes:15});assertEquals(created.status,200);
  try {
   const redeemed=await call(professional,{action:'redeem',token:created.data.share_url});assertEquals(redeemed.status,200);
   const grant=redeemed.data.grant_id,view=await call(professional,{action:'patient',grant_id:grant,days:30});assertEquals(view.status,200);assert(view.data.profile.email);
   for(const key of optional){assertEquals(key in view.data,scopes.includes(key));const one=await call(professional,{action:key,grant_id:grant,days:30});assertEquals(one.status,scopes.includes(key)?200:403);}
   assertEquals('dose_history' in view.data,scopes.includes('adherence'));
   if(scopes.includes('medications')){assert(view.data.medications.length>0);for(const m of view.data.medications){assert(m.name);for(const key of ['directions','recurrence','schedule','reminder_times','dose_quantity'])assertEquals(key in m,false);}}
   if(scopes.includes('schedule'))for(const m of view.data.schedule){assertEquals('name' in m,scopes.includes('medications'));assertEquals('directions' in m,scopes.includes('medications'));if(!scopes.includes('medications'))for(const key of ['name','generic_name','brand_name','rxcui','form','strength','directions'])assertEquals(key in m,false);}
   if(scopes.includes('activity'))for(const a of view.data.activity){assertEquals('name' in a,scopes.includes('medications'));assertEquals('notes' in a,false);assertEquals('details' in a,false);}
   if(scopes.includes('adherence')){
    const h=view.data.adherence;assertEquals(h.days,30);const start=Date.parse(view.data.history_window.start_at),end=Date.parse(view.data.history_window.end_at);
    const dateAt=(value:number)=>{const p=new Intl.DateTimeFormat('en',{timeZone:h.timezone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(value));return ['year','month','day'].map(k=>p.find(x=>x.type===k)?.value).join('-');};
    for(const d of h.daily)assert(d.date>=dateAt(start)&&d.date<=dateAt(end));
    for(const row of view.data.dose_history){assert(Date.parse(row.scheduled_at)>=start&&Date.parse(row.scheduled_at)<=end);assertEquals('medication_name' in row,false);}
    const totals=h.daily.reduce((a:any,d:any)=>({eligible:a.eligible+d.eligible,taken:a.taken+d.taken}),{eligible:0,taken:0});assertEquals(h.percent,totals.eligible?Math.round(totals.taken*100/totals.eligible):null);
   }
  }finally{await call(patient,{action:'revoke',invitation_id:created.data.id});}
  // Professional redemption is limited to ten/minute. Respect limits, never change them for QA.
  if(mask===7)await new Promise(r=>setTimeout(r,61000));
 }
}});
Deno.test({name:'Deployed proxy + Edge: genuine absolute expiry denies refresh, photo and invitation replay',ignore:!enabled||env('BIGPHARMA_QA_WAIT_FOR_EXPIRY')!=='yes',fn:async()=>{
 const patient=await login('PATIENT'),professional=await login('PROFESSIONAL');
 const created=await call(patient,{action:'create',confirmed:true,scopes:['profile','medications','schedule','adherence'],minutes:5});assertEquals(created.status,200);
 const redeemed=await call(professional,{action:'redeem',token:created.data.share_url});assertEquals(redeemed.status,200);
 await new Promise(r=>setTimeout(r,301000));
 for(const action of ['status','patient','photo','medications','adherence']){const r=await call(professional,{action,grant_id:redeemed.data.grant_id});assertEquals(r.status,410);assertEquals(r.data.code,'ACCESS_EXPIRED');}
 assertEquals((await call(professional,{action:'redeem',token:created.data.share_url})).status,410);
 assertEquals((await call(professional,{action:'sessions'})).data.items.some((s:any)=>s.grant_id===redeemed.data.grant_id),false);
}});
