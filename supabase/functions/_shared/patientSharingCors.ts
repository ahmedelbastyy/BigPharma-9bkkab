import { corsHeaders } from './cors.ts';
import { connectOrigin } from './patientSharingContract.ts';
// CORS is not authorization. Native clients send no Origin; every operation still requires a JWT.
export function patientSharingCors(origin: string | null): {allowed: boolean; headers: Record<string, string>} {
 const allowed = !origin || origin === connectOrigin || origin === 'https://onspace.ai' || origin === 'https://www.onspace.ai' ||
 /^https:\/\/[a-z0-9-]+\.onspace\.(ai|app)$/.test(origin) ||
 ['http://localhost:3000', 'http://localhost:8081'].includes(origin);
 const headers: Record<string, string> = {
  'Access-Control-Allow-Headers': corsHeaders['Access-Control-Allow-Headers'] + ', x-bigpharma-connect-authorization, x-bigpharma-connect-assertion, x-connect-authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  // The server-key header is intentionally NOT enabled for browser CORS requests.
  'Access-Control-Expose-Headers': 'Date, Retry-After, X-Sharing-Expires-At, X-Sharing-Server-Now, X-Sharing-Service-Version',
  'Vary': 'Origin', 'Cache-Control': 'no-store, private, max-age=0',
  'Pragma': 'no-cache', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
 };
 if (allowed && origin) headers['Access-Control-Allow-Origin'] = origin;
 return {allowed, headers};
}
