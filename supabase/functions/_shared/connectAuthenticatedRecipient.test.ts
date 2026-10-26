// Pure fake-credential regression tests; not authenticated deployment evidence.
import {assert,assertEquals} from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {verifyConnectRequestAssertion} from './connectAssertion.ts';
const secret='8'.repeat(64),actor='00000000-0000-4000-8000-000000000001';
const now=1792972800000,jwt='fake-jwt',body='{"action":"redeem","token":"'+ 'a'.repeat(64)+'"}';
const base={sub:actor,iss:'bigpharma-connect',aud:'onspace-patient-sharing',iat:now/1000,exp:now/1000+60,
 role:'authenticated',professional_approved:false,synthetic_only:false};
const b64=(bytes:Uint8Array)=>btoa(Array.from(bytes,b=>String.fromCharCode(b)).join('')).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
async function signed(change:Record<string,unknown>={}){
 const encoded=b64(new TextEncoder().encode(JSON.stringify({...base,...change})));
 const key=await crypto.subtle.importKey('raw',Uint8Array.from(secret.match(/../g)!,p=>parseInt(p,16)),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return encoded+'.'+b64(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(encoded))));
}
async function verify(change:Record<string,unknown>={}){
 return verifyConnectRequestAssertion(new Headers({'x-connect-authorization':await signed(change)}),secret,actor,jwt,body,now);
}
Deno.test('Exact authenticated prototype claims retain authenticated mode on both forwarding headers',async()=>{
 const assertion=await signed();
 for(const header of ['x-connect-authorization','x-bigpharma-connect-assertion']){
  const proof=await verifyConnectRequestAssertion(new Headers({[header]:assertion}),secret,actor,jwt,body,now);
  assert(proof.ok);if(proof.ok)assertEquals(proof.claims.access_mode,'authenticated');
 }
});
Deno.test('Authenticated recipients cannot assert approval, synthetic access or a conflicting role',async()=>{
 for(const change of [{professional_approved:true},{synthetic_only:true},{professional_approved:undefined},
  {synthetic_only:undefined},{access_mode:'professional'},{access_mode:'synthetic_only'},{role:'admin'},
  {role:'professional'},{role:'synthetic_test'}])assertEquals((await verify(change)).ok,false);
 assertEquals(await verify({sub:'00000000-0000-4000-8000-000000000002'}),{ok:false,code:'INVALID_SUBJECT'});
 assertEquals(await verify({exp:now/1000}),{ok:false,code:'EXPIRED_ASSERTION'});
});
Deno.test('Professional and synthetic roles preserve their exact existing flags and modes',async()=>{
 for(const [role,approved,synthetic,mode] of [['professional',true,false,'professional'],['synthetic_test',false,true,'synthetic_only']] as const){
  const proof=await verify({role,professional_approved:approved,synthetic_only:synthetic});
  assert(proof.ok);if(proof.ok)assertEquals(proof.claims.access_mode,mode);
 }
});
Deno.test('Missing or forged authenticated assertions never authorize a recipient',async()=>{
 assertEquals(await verifyConnectRequestAssertion(new Headers(),secret,actor,jwt,body,now),{ok:false,code:'MISSING_ASSERTION'});
 const good=await signed();
 const forged=b64(new TextEncoder().encode(JSON.stringify({...base,professional_approved:true})))+'.'+good.split('.')[1];
 assertEquals(await verifyConnectRequestAssertion(new Headers({'x-connect-authorization':forged}),secret,actor,jwt,body,now),{ok:false,code:'INVALID_SIGNATURE'});
 assertEquals(await verifyConnectRequestAssertion(new Headers({'x-connect-authorization':good}),'9'.repeat(64),actor,jwt,body,now),{ok:false,code:'INVALID_SIGNATURE'});
});
