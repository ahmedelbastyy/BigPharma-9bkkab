# BigPharma sharing — simplified implementation verification

Updated 2026-10-25. API: docs/bigpharma-connect-sharing-contract.md.

## What changed

- Kept one patient-sharing Edge and all existing patient/profile/medication/history tables.
- Recipient requests can now use the existing server-only Connect credential plus the actual recipient JWT. No new signing contract, key or professional-verification workflow was introduced. Legacy signed callers remain compatible.
- Mobile has four optional permissions and one normal Generate flow; identity is baseline sharing after a fixed notice, without an identity checkbox.
- Mobile validates the returned QR URL, scopes, dataset and original duration before rendering it.
- Removed the developer synthetic button from the patient interface. Explicit synthetic API fixtures remain for QA and the previously agreed test-account restriction remains synthetic-only.
- Background invitation refresh no longer rereads account/profile identity repeatedly. Normal creation no longer duplicates frontend/backend identity network validation.
- Kept private photo bytes, independent deadline/revocation enforcement, recipient binding, polling, optional-scope projections and no application QR quotas.

## Database actually applied

Equivalent SQL from supabase/migrations/20261025_patient_share_simple_service.sql executed successfully. Existing rows were not changed. Patient-class creation delegates to the existing account-validating creator. Synthetic invitations are inserted as synthetic from the beginning, without reading actual profile/medication/photo content or relabeling records. No new tables or public policies were created.

## Actually executed checks

Non-mutating SQL passed all16 synthetic scope masks, name/instruction/activity redaction, selected history counts, authenticated owner requirements, required profile scope,1,000 quota-free admission calls, empty-history behavior, exact expiry/revocation boundaries, restricted hashes/RPCs/RLS/private bucket, clinical identity/scope/recheck invariants and revoke-to-grant invalidation.

These were fixture-runtime/installed-function checks, not an authenticated end-to-end patient retrieval or photo download. No actual patient records, secret values or signed-in tokens were read/printed for testing.

Existing deployed Edge responded to unauthenticated GET with405 in actual invocation logs, confirming reachability but not release version or POST behavior. HTTP SQL probes failed at the platform's curl option handling; no successful authenticated POST/preflight was asserted.

## Deployment and external integration still unverified

Existing patient-sharing source/config are submitted through managed project completion. There is no independent deployment command in this editor. Confirm the exact release via X-Sharing-Service-Version:20261025-simple-sharing-v1 or the patient_sharing_service_ready startup marker. A reachable prior endpoint is not proof that the revised release is active.

BigPharma Connect's Vercel code was not modified. Its server must validate the recipient JWT, check current protected professional approval and forward each request with the existing private server credential. Browser approval flags alone cannot authorize access. Copy-ready browser adapter remains services/connectSharingService.ts; no private keys or signing code exist in that file.

Authored but not executed: _shared/connectServerAuthorization.test.ts, tests/simple-patient-sharing.spec.ts, _shared/simplePatientSharingLive.test.ts. The HTTP suite checks actual deployed version,16 scope combinations, multiple simultaneously active invitations, revocation and optional five-minute expiration using dedicated synthetic accounts. QA login credentials were unavailable here. The synthetic fixture has no photo; actual authorized private-image retrieval and Blob cleanup still need device/browser acceptance.

## Limits

Backend revoke denial begins when the revoke transaction commits; Connect detects it on the next2-second poll plus latency. No server push is claimed. External infrastructure can still return429 despite quota-free application logic. The previous license-free test account remains prohibited from patient-class records. Operational key rotation/log redaction/retention remain relevant; no regulatory certification or screenshot retraction is claimed.
