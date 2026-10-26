// Navigation allowlist only, not a grant of extraction, display, or storage rights.
// Backend adapters must enforce their negotiated source license before any content is returned.
const referenceHosts=['drugs.com','goodrx.com','fdbhealth.com','wolterskluwer.com'];
export function safeProviderReferenceUrl(value:unknown):string|null {if(typeof value!=='string'||value.length>4096)return null;try{const url=new URL(value),host=url.hostname.toLowerCase();if(url.protocol!=='https:'||url.username||url.password||(url.port&&url.port!=='443')||!referenceHosts.some(domain=>host===domain||host.endsWith(`.${domain}`))||/[?&](api_?key|apikey|token|secret|password|authorization)=/i.test(value))return null;return value;}catch{return null;}}
