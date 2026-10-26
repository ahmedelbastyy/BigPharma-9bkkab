// Server-only adapter for Connect's existing payload.signature authorization.
// No approval workflow, browser role flag, public patient access or new secret.
import {connectOrigin,hashInvitationToken,validShareUuid} from './patientSharingContract.ts';
import {connectAuthorizationAudience,connectAuthorizationHeader,verifyConnectAuthorization,type ConnectAccessMode,type ConnectAuthorizationResult,type ConnectAuthorizationClaims} from './connectAuthorization.ts';
export const connectAssertionHeaders=['x-bigpharma-connect-assertion','x-connect-authorization'] as const;
// Exact production Next.js issuer/audience. Retain the existing URL-based pair for callers
// already using it; mixing the two pairs or accepting arbitrary values is forbidden.
export const connectAssertionIssuer='bigpharma-connect';
export const connectAssertionAudience='onspace-patient-sharing';
const invalid=(code='INVALID_ASSERTION_FORMAT'):ConnectAuthorizationResult=>({ok:false,code});
function decode(value:string):Uint8Array {
 const standard=value.replace(/-/g,'+').replace(/_/g,'/');
 return Uint8Array.from(atob(standard+'='.repeat((4-standard.length%4)%4)),c=>c.charCodeAt(0));
}
function mode(value:unknown):ConnectAccessMode|null {
 if(value==='professional'||value==='pharmacist')return 'professional';
 if(value==='synthetic_only'||value==='synthetic_test')return 'synthetic_only';
 if(value==='authenticated')return 'authenticated';
 return null;
}
// This role is meaningful ONLY after signature verification with the private server key.
// Connect attests the recipient mode on every request. Authenticated prototype recipients
// are NOT professionals; the database additionally requires patient invitation consent.
export async function verifyConnectHexAssertion(assertion:string,secret:string,actor:string,jwt:string,rawBody:string,nowMs=Date.now(),authenticatedEmail?:string):Promise<ConnectAuthorizationResult> {
 if(!/^[a-f0-9]{64}$/i.test(secret))return {ok:false,code:'SERVICE_UNAVAILABLE'};
 if(assertion.length>4096)return invalid();
 if(!validShareUuid(actor))return invalid('INVALID_SUBJECT');
 try {
  const parts=assertion.split('.');
  if(parts.length!==2||!/^[A-Za-z0-9_-]+$/.test(parts[0])||!/^[A-Za-z0-9_-]{43}$/.test(parts[1]))return invalid();
  // Buffer.from(secret, 'hex') on Next.js = these 32 bytes, NOT the 64 UTF-8 characters.
  const bytes=Uint8Array.from(secret.match(/../g)!,pair=>parseInt(pair,16));
  const key=await crypto.subtle.importKey('raw',bytes,{name:'HMAC',hash:'SHA-256'},false,['verify']);
  if(!await crypto.subtle.verify('HMAC',key,decode(parts[1]),new TextEncoder().encode(parts[0])))return invalid('INVALID_SIGNATURE');
  const c:Record<string,unknown>=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(decode(parts[0])));
  if(!c||Array.isArray(c)||typeof c!=='object'||(c.v!==undefined&&c.v!==1))return invalid();
  const productionFormat=c.iss===connectAssertionIssuer;
  if(!productionFormat&&c.iss!==connectOrigin)return invalid('INVALID_ISSUER');
  if(c.aud!==(productionFormat?connectAssertionAudience:connectAuthorizationAudience))return invalid('INVALID_AUDIENCE');
  const subject=c.sub??c.user_id;
  if(!validShareUuid(subject)||subject!==actor||(c.sub!==undefined&&c.user_id!==undefined&&c.sub!==c.user_id))return invalid('INVALID_SUBJECT');
  // The independent Auth API result is authoritative; signed email never replaces it.
  if(c.email!==undefined&&(typeof c.email!=='string'||!c.email.trim()||
   (authenticatedEmail!==undefined&&c.email.trim().toLowerCase()!==authenticatedEmail.trim().toLowerCase())))return invalid('INVALID_SUBJECT');
  if(typeof c.iat!=='number'||typeof c.exp!=='number'||!Number.isSafeInteger(c.iat)||!Number.isSafeInteger(c.exp))return invalid('EXPIRED_ASSERTION');
  const now=nowMs/1000;
  // At most one minute of issuer validity. Each database operation gets at most 30 seconds;
  // the patient's absolute invitation/grant deadline is checked independently, never extended.
  if(c.exp<=now||c.iat>now+2||c.iat<now-60||c.exp<=c.iat||c.exp-c.iat>60||c.exp>now+62)return invalid('EXPIRED_ASSERTION');
  if(c.nbf!==undefined&&(typeof c.nbf!=='number'||!Number.isSafeInteger(c.nbf)||c.nbf>now+2))return invalid('EXPIRED_ASSERTION');
  const assertedRoles=[c.access_mode,c.access_role,c.role].filter(value=>value!==undefined);
  if(!assertedRoles.length)return invalid('INVALID_ROLE');
  const accessMode=mode(assertedRoles[0]);
  if(!accessMode||assertedRoles.some(value=>mode(value)!==accessMode))return invalid('INVALID_ROLE');
  // All these fields are inspected only AFTER mandatory HMAC verification. The actual
  // Next.js format explicitly attests approval; a signed professional role alone is insufficient.
  if(accessMode==='professional'){
   if((productionFormat||c.professional_approved!==undefined)&&c.professional_approved!==true)return invalid('PROFESSIONAL_NOT_AUTHORIZED');
   if((productionFormat||c.synthetic_only!==undefined)&&c.synthetic_only!==false)return invalid('INVALID_ROLE');
  }else if(accessMode==='authenticated'){
   // Explicit prototype role: neither professional approval nor synthetic-only status.
   // Require both false flags even for URL-format callers; never upgrade another role.
   if(c.professional_approved!==false||c.synthetic_only!==false)return invalid('INVALID_ROLE');
  }else{
   if((productionFormat||c.synthetic_only!==undefined)&&c.synthetic_only!==true)return invalid('INVALID_ROLE');
   if((productionFormat||c.professional_approved!==undefined)&&c.professional_approved!==false)return invalid('INVALID_ROLE');
  }
  // Existing request-bound callers retain their body/JWT binding. Identity assertions are
  // still bound to the independently verified recipient JWT subject and consumed once.
  const bodyHash=await hashInvitationToken(rawBody),jwtHash=await hashInvitationToken(jwt);
  if(c.body_sha256!==undefined&&(typeof c.body_sha256!=='string'||c.body_sha256!==bodyHash))return invalid('INVALID_REQUEST_BINDING');
  if(c.jwt_sha256!==undefined&&(typeof c.jwt_sha256!=='string'||c.jwt_sha256!==jwtHash))return invalid('INVALID_REQUEST_BINDING');
  if(c.jti!==undefined&&(typeof c.jti!=='string'||!/^[a-zA-Z0-9_-]{16,128}$/.test(c.jti)))return invalid();
  // The signed bytes themselves identify a single request when Connect omits jti.
  const nonce=typeof c.jti==='string'?c.jti:assertion;
  const claims:ConnectAuthorizationClaims={v:1,iss:c.iss as string,aud:c.aud as string,sub:actor,
   access_mode:accessMode,iat:c.iat,exp:c.exp,jti:nonce,body_sha256:bodyHash,jwt_sha256:jwtHash};
  const until=Math.min(c.exp,Math.floor(now)+30);
  return {ok:true,claims,nonceHash:await hashInvitationToken(nonce),until:new Date(until*1000).toISOString()};
 }catch{return invalid();}
}
export async function verifyConnectRequestAssertion(headers:Headers,secret:string,actor:string,jwt:string,rawBody:string,nowMs=Date.now(),authenticatedEmail?:string):Promise<ConnectAuthorizationResult> {
 const aliases=connectAssertionHeaders.map(name=>headers.get(name)).filter((value):value is string=>value!==null);
 const legacy=headers.get(connectAuthorizationHeader);
 if(aliases.length){
  if(aliases.some(value=>value!==aliases[0])||(legacy!==null&&legacy!==aliases[0]))return invalid('ASSERTION_HEADER_CONFLICT');
  if(!aliases[0])return invalid('MISSING_ASSERTION');
  return verifyConnectHexAssertion(aliases[0],secret,actor,jwt,rawBody,nowMs,authenticatedEmail);
 }
 if(!legacy)return invalid('MISSING_ASSERTION');
 // The canonical header can carry the current hex-key format too. Old UTF-8-key callers
 // remain compatible ONLY on this existing legacy header, with all original bindings.
 const current=await verifyConnectHexAssertion(legacy,secret,actor,jwt,rawBody,nowMs,authenticatedEmail);
 if(current.ok||current.code!=='INVALID_SIGNATURE')return current;
 const compatible=await verifyConnectAuthorization(legacy,secret,actor,jwt,rawBody,nowMs);
 return compatible.ok?compatible:current;
}
