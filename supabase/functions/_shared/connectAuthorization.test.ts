import {assertEquals,assert} from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {verifyConnectAuthorization,connectAuthorizationAudience,type ConnectAuthorizationClaims} from './connectAuthorization.ts';
import {connectOrigin,hashInvitationToken} from './patientSharingContract.ts';
const secret='a'.repeat(64),actor='00000000-0000-0000-0000-000000000001',jwt='synthetic-jwt-not-a-login',body='{"action":"sessions"}',now=1792972800000;
function b64(bytes:Uint8Array){return btoa(Array.from(bytes,b=>String.fromCharCode(b)).join('')).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');}
async function signed(change:Partial<ConnectAuthorizationClaims>={}){
 const payload:ConnectAuthorizationClaims={access_mode:'professional',v:1,iss:connectOrigin,aud:connectAuthorizationAudience,sub:actor,iat:now/1000,exp:now/1000+20,jti:'b'.repeat(32),body_sha256:await hashInvitationToken(body),jwt_sha256:await hashInvitationToken(jwt),...change};
 const encoded=b64(new TextEncoder().encode(JSON.stringify(payload)));
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return encoded+'.'+b64(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(encoded))));
}
Deno.test('Synthetic request-bound assertion accepts only correct actor, raw bytes, JWT and server secret',async()=>{
 const token=await signed();assert((await verifyConnectAuthorization(token,secret,actor,jwt,body,now)).ok);
 for(const args of [[token,'c'.repeat(64),actor,jwt,body],[token,secret,'00000000-0000-0000-0000-000000000002',jwt,body],[token,secret,actor,'different-jwt',body],[token,secret,actor,jwt,'{"action":"patient"}']])assertEquals((await verifyConnectAuthorization(args[0],args[1],args[2],args[3],args[4],now)).ok,false);
 assertEquals((await verifyConnectAuthorization(null,secret,actor,jwt,body,now)).ok,false);
});
Deno.test('Only the signed access mode determines role, independently of email',async()=>{
 const proof=await verifyConnectAuthorization(await signed({access_mode:'synthetic_only'}),secret,actor,jwt,body,now);
 assert(proof.ok);if(proof.ok)assertEquals(proof.claims.access_mode,'synthetic_only');
 const professional=await verifyConnectAuthorization(await signed({access_mode:'professional'}),secret,actor,jwt,body,now);
 assert(professional.ok);if(professional.ok)assertEquals(professional.claims.access_mode,'professional');
 const malformed={access_mode:'real-and-test'} as unknown as Partial<ConnectAuthorizationClaims>;
 assertEquals((await verifyConnectAuthorization(await signed(malformed),secret,actor,jwt,body,now)).ok,false);
});
Deno.test('Rejects expired/future/overlong assertions, wrong issuer/audience, forged signatures and browser flags',async()=>{
 for(const change of [{exp:now/1000},{iat:now/1000+10,exp:now/1000+20},{exp:now/1000+60},{iss:'https://evil.example'},{aud:'other-api'},{jti:'short'}])assertEquals((await verifyConnectAuthorization(await signed(change),secret,actor,jwt,body,now)).ok,false);
 assertEquals((await verifyConnectAuthorization('verified:true',secret,actor,jwt,body,now)).ok,false);
 const token=await signed();assertEquals((await verifyConnectAuthorization(token.slice(0,-4)+'AAAA',secret,actor,jwt,body,now)).ok,false);
});
