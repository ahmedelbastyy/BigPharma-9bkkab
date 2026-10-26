import {assertEquals, assertNotEquals, assert} from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {connectOrigin, generateInvitationToken, hashInvitationToken, normalizeInvitationToken, validSharingSelection, validShareUuid, sharingErrorStatus} from './patientSharingContract.ts';
import {patientSharingCors} from './patientSharingCors.ts';
Deno.test('256-bit invitation token and SHA-256 hash are distinct; no patient identity', async()=>{
 const a=generateInvitationToken(),b=generateInvitationToken();assert(/^[a-f0-9]{64}$/.test(a));assertNotEquals(a,b);
 const hash=await hashInvitationToken(a);assert(/^[a-f0-9]{64}$/.test(hash));assertNotEquals(hash,a);assertEquals(await hashInvitationToken(a),hash);
});
Deno.test('manual code and exact camera HTTPS URL normalize to the same token',()=>{
 const token='a'.repeat(64);assertEquals(normalizeInvitationToken(token),token);assertEquals(normalizeInvitationToken(`${connectOrigin}/invite/${token}`),token);
 for(const bad of ['', 'a'.repeat(63), 'https://evil.example/invite/'+token, connectOrigin+'/invite/'+token+'?next=evil',connectOrigin+'/invite/'+token+'#secret','onspaceapp://auth','../'+token])assertEquals(normalizeInvitationToken(bad),null);
});
Deno.test('all five scopes and durations, rejection of missing/extra scopes and expiry manipulation',()=>{
 for(const minutes of [5,15,30,60])assertEquals(validSharingSelection(['profile','medications','schedule','adherence','activity'],minutes),true);
 for(const scopes of [[],['medications'],['schedule','adherence'],['credentials'],['profile','profile'],[null],['refills']])assertEquals(validSharingSelection(scopes,15),false);
 for(const minutes of [0,1,16,61,'15',null])assertEquals(validSharingSelection(['profile'],minutes),false);
});
Deno.test('all sixteen optional permission combinations preserve mandatory profile independently',()=>{
 const optional=['medications','schedule','adherence','activity'];
 for(let mask=0;mask<16;mask++){
  const scopes=['profile',...optional.filter((_,i)=>(mask & (1<<i))!==0)];
  assertEquals(validSharingSelection(scopes,15),true);
  assertEquals(validSharingSelection(scopes.filter(s=>s!=='profile'),15),false);
 }
});
Deno.test('grant ids are identifiers, not arbitrarily accepted paths',()=>{
 assert(validShareUuid('12345678-1234-1234-1234-123456789012'));assertEquals(validShareUuid('bad'),false);
});
Deno.test('expiry and revocation are terminal HTTP410; unapproved professionals HTTP403',()=>{
 assertEquals(sharingErrorStatus('ACCESS_EXPIRED'),410);assertEquals(sharingErrorStatus('ACCESS_REVOKED'),410);assertEquals(sharingErrorStatus('PROFESSIONAL_NOT_APPROVED'),403);
});
Deno.test('All safe Connect assertion diagnostics are HTTP403 without exposing credentials',()=>{
 for(const code of ['MISSING_ASSERTION','INVALID_SIGNATURE','INVALID_ISSUER','INVALID_AUDIENCE','INVALID_SUBJECT','EXPIRED_ASSERTION','INVALID_ROLE','PROFESSIONAL_NOT_AUTHORIZED','INVALID_ASSERTION_FORMAT','ASSERTION_HEADER_CONFLICT','INVALID_REQUEST_BINDING'])assertEquals(sharingErrorStatus(code),403);
});
Deno.test('Vercel and native origin permitted; unrelated external origins denied',()=>{
 assertEquals(patientSharingCors(connectOrigin).allowed,true);assertEquals(patientSharingCors(null).allowed,true);assertEquals(patientSharingCors('https://evil.example').allowed,false);
 assertEquals(patientSharingCors(connectOrigin).headers['Cache-Control'],'no-store, private, max-age=0');
 assert(patientSharingCors(connectOrigin).headers['Access-Control-Allow-Headers'].includes('x-bigpharma-connect-authorization'));
 assertEquals(patientSharingCors('https://evil.example').headers['Access-Control-Allow-Origin'],undefined);
});
