// Actual deployed Edge HTTP acceptance with Connect's hex-key HMAC assertions.
// Uses dedicated synthetic accounts ONLY; ignored without explicit QA credentials.
// This suite never logs credentials or requests real patients' medication/photo data.
import {assert,assertEquals} from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {createClient} from 'npm:@supabase/supabase-js@2';
import {sharingServiceVersion} from './patientSharingContract.ts';
const env=(name:string)=>Deno.env.get(name)||'';
const base='https://ibmovdnyqtzlbxtuibmo.backend.onspace.ai';
const endpoint=base+'/functions/v1/patient-sharing';
const origin='https://bigpharma-connect-nweb365.vercel.app';
const required=['BIGPHARMA_QA_ANON_KEY','BIGPHARMA_QA_PATIENT_EMAIL','BIGPHARMA_QA_PATIENT_PASSWORD','BIGPHARMA_QA_TEST_EMAIL','BIGPHARMA_QA_TEST_PASSWORD','BIGPHARMA_CONNECT_AUTH_SECRET'];
const enabled=env('BIGPHARMA_SHARING_SYNTHETIC_ONLY')==='yes'&&required.every(name=>env(name));
Deno.test({name:'Deployed simple sharing: QR, server authorization, 16 permission masks, quota-free creation and revocation',ignore:!enabled,fn:async()=>{
 const anon=env('BIGPHARMA_QA_ANON_KEY'),serverKey=env('BIGPHARMA_CONNECT_AUTH_SECRET');
 const owner=createClient(base,anon,{auth:{persistSession:false,autoRefreshToken:false}});
 const recipient=createClient(base,anon,{auth:{persistSession:false,autoRefreshToken:false}});
 const p=await owner.auth.signInWithPassword({email:env('BIGPHARMA_QA_PATIENT_EMAIL'),password:env('BIGPHARMA_QA_PATIENT_PASSWORD')});
 const r=await recipient.auth.signInWithPassword({email:env('BIGPHARMA_QA_TEST_EMAIL'),password:env('BIGPHARMA_QA_TEST_PASSWORD')});
 assert(!p.error&&p.data.session);assert(!r.error&&r.data.session);
 assert(p.data.user?.id!==r.data.user?.id,'Use a dedicated, separate fictional patient owner.');
 const b64=(bytes:Uint8Array)=>btoa(Array.from(bytes,b=>String.fromCharCode(b)).join('')).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
 // Mirror the production website exactly: no v, jti, method or body/JWT hash fields.
 // Its assertions are single-use; without jti, mint each sequential request in a fresh
 // Unix second rather than reusing identical signed bytes and hiding replay failures.
 const lastIssued=new Map<string,number>();
 const call=async(jwt:string,body:Record<string,unknown>,credential?:string,alias?:string)=>{
  const raw=JSON.stringify(body);
  const headers:Record<string,string>={Authorization:'Bearer '+jwt,apikey:anon,'Content-Type':'application/json'};
  if(credential!==undefined){
   const isTester=jwt===r.data.session!.access_token;
   const user=isTester?r.data.user!:p.data.user!;
   let now=Math.floor(Date.now()/1000);
   while(now<=(lastIssued.get(user.id)??0)){
    await new Promise(resolve=>setTimeout(resolve,Math.max(1,(now+1)*1000-Date.now()+10)));
    now=Math.floor(Date.now()/1000);
   }
   lastIssued.set(user.id,now);
   const payload={sub:user.id,email:user.email,iss:'bigpharma-connect',aud:'onspace-patient-sharing',
    iat:now,exp:now+60,role:isTester?'synthetic_test':'professional',
    professional_approved:!isTester,synthetic_only:isTester};
   const encoded=b64(new TextEncoder().encode(JSON.stringify(payload)));
   const keyBytes=Uint8Array.from(credential.match(/../g)!,pair=>parseInt(pair,16));
   const key=await crypto.subtle.importKey('raw',keyBytes,{name:'HMAC',hash:'SHA-256'},false,['sign']);
   const assertion=encoded+'.'+b64(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(encoded))));
   if(alias)headers[alias]=assertion;
   else {headers['x-bigpharma-connect-assertion']=assertion;headers['x-connect-authorization']=assertion;}
  }
  const response=await fetch(endpoint,{method:'POST',headers,body:raw,redirect:'error'});
  assertEquals(response.headers.get('X-Sharing-Service-Version'),sharingServiceVersion);
  const type=response.headers.get('Content-Type')||'';
  return {status:response.status,data:type.startsWith('image/')?await response.blob():await response.json()};
 };
 const patientCall=(body:Record<string,unknown>)=>call(p.data.session!.access_token,body);
 const connectCall=(body:Record<string,unknown>)=>call(r.data.session!.access_token,body,serverKey);
 const preflight=await fetch(endpoint,{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'authorization,apikey,content-type'}});
 assertEquals(preflight.status,204);assertEquals(preflight.headers.get('Access-Control-Allow-Origin'),origin);
 const unauth=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:'{"action":"sessions"}'});
 assertEquals(unauth.status,401);
 const missing=await call(r.data.session!.access_token,{action:'sessions',verified:true});
 assertEquals(missing.status,403);assertEquals(missing.data.code,'MISSING_ASSERTION');
 const badSignature=await call(r.data.session!.access_token,{action:'sessions'},'0'.repeat(64));
 assertEquals(badSignature.status,403);assertEquals(badSignature.data.code,'INVALID_SIGNATURE');
 const optional=['medications','schedule','adherence','activity'];
 const invitations:string[]=[];
 try{
  for(const alias of ['x-bigpharma-connect-assertion','x-connect-authorization']){
   const authorized=await call(r.data.session!.access_token,{action:'sessions'},serverKey,alias);
   assertEquals(authorized.status,200);
  }
  // Dedicated fictional owner's profile-only patient-class invitation must still be denied
  // to the license-free tester before ANY account/medical/photo information is returned.
  const restricted=await patientCall({action:'create',confirmed:true,scopes:['profile'],minutes:5,dataset:'patient'});
  assertEquals(restricted.status,200);invitations.push(restricted.data.id);
  const denied=await connectCall({action:'redeem',token:restricted.data.share_url});
  assertEquals(denied.status,403);assertEquals(denied.data.code,'TEST_DATA_ONLY');
  for(let mask=0;mask<16;mask++){
   const scopes=['profile',...optional.filter((_,index)=>(mask&(1<<index))!==0)];
   const created=await patientCall({action:'create',confirmed:true,scopes,minutes:5,dataset:'synthetic_demo_v1'});
   assertEquals(created.status,200);invitations.push(created.data.id);
   assert(/^https:\/\/bigpharma-connect-nweb365\.vercel\.app\/invite\/[a-f0-9]{64}$/.test(created.data.share_url));
   assertEquals(Date.parse(created.data.expires_at)-Date.parse(created.data.created_at),300000);
   const grant=await connectCall({action:'redeem',token:created.data.share_url});
   assertEquals(grant.status,200);assertEquals(grant.data.expires_at,created.data.expires_at);
   assertEquals(grant.data.access_mode,'synthetic_only');
   const body={grant_id:grant.data.grant_id};
   const info=await connectCall({action:'patient',...body,days:30});
   assertEquals(info.status,200);assertEquals(info.data.synthetic,true);
   assertEquals(info.data.profile.display_name,'Synthetic Demo Patient');
   assertEquals(info.data.profile.email,'synthetic.patient@example.invalid');
   assertEquals(info.data.profile.photo_available,false);
   assertEquals((await connectCall({action:'status',...body})).status,200);
   // A different authenticated recipient cannot use the returned UUID.
   const wrongActor=await call(p.data.session!.access_token,{action:'patient',...body},serverKey);
   assertEquals(wrongActor.status,404);assertEquals(wrongActor.data.code,'ACCESS_UNAVAILABLE');
   for(const scope of optional){
    assertEquals(scope in info.data,scopes.includes(scope));
    if(!scopes.includes(scope))assertEquals((await connectCall({action:scope,...body})).data.code,'SCOPE_DENIED');
   }
   if(!scopes.includes('medications')){
    assertEquals('name' in (info.data.schedule?.[0]||{}),false);
    assertEquals('directions' in (info.data.schedule?.[0]||{}),false);
    assertEquals('name' in (info.data.activity?.[0]||{}),false);
   }
   if(scopes.includes('adherence')){assertEquals(info.data.adherence.percent,67);assertEquals(info.data.dose_history.length,3);}
   assertEquals((await connectCall({action:'photo',...body})).data.code,'PHOTO_UNAVAILABLE');
   assertEquals((await patientCall({action:'revoke',invitation_id:created.data.id})).status,200);
   assertEquals((await connectCall({action:'status',...body})).data.code,'ACCESS_REVOKED');
   assertEquals((await connectCall({action:'patient',...body})).data.code,'ACCESS_REVOKED');
   assertEquals((await connectCall({action:'photo',...body})).data.code,'ACCESS_REVOKED');
   assertEquals((await connectCall({action:'redeem',token:created.data.share_url})).data.code,'ACCESS_REVOKED');
  }
  // Exercise the old active-invitation cap as well as the hourly count: six at once.
  const activeGrants:string[]=[];
  for(let i=0;i<6;i++){
   const created=await patientCall({action:'create',confirmed:true,scopes:['profile'],minutes:5,dataset:'synthetic_demo_v1'});
   assertEquals(created.status,200);invitations.push(created.data.id);
   const grant=await connectCall({action:'redeem',token:created.data.share_url});
   assertEquals(grant.status,200);activeGrants.push(grant.data.grant_id);
   const other=await call(p.data.session!.access_token,{action:'redeem',token:created.data.share_url},serverKey);
   assertEquals(other.status,403);assertEquals(other.data.code,'SELF_REDEMPTION_DENIED');
  }
  const sessions=await connectCall({action:'sessions'});assertEquals(sessions.status,200);
  assert(sessions.data.items.every((g:{data_class:string})=>g.data_class==='synthetic_demo_v1'));
  for(const id of activeGrants)assert(sessions.data.items.some((g:{grant_id:string})=>g.grant_id===id));
  if(env('BIGPHARMA_QA_WAIT_FOR_EXPIRY')==='yes'){
   const c=await patientCall({action:'create',confirmed:true,scopes:['profile'],minutes:5,dataset:'synthetic_demo_v1'});
   assertEquals(c.status,200);invitations.push(c.data.id);
   const g=await connectCall({action:'redeem',token:c.data.share_url});assertEquals(g.status,200);
   const remaining=Date.parse(g.data.expires_at)-Date.parse(g.data.server_now);
   await new Promise(resolve=>setTimeout(resolve,Math.max(0,remaining)+1000));
   for(const action of ['status','patient','photo'])assertEquals((await connectCall({action,grant_id:g.data.grant_id})).data.code,'ACCESS_EXPIRED');
   assertEquals((await connectCall({action:'redeem',token:c.data.share_url})).data.code,'ACCESS_EXPIRED');
  }
 }finally{
  for(const id of invitations)await patientCall({action:'revoke',invitation_id:id});
  await owner.auth.signOut();await recipient.auth.signOut();
 }
}});
