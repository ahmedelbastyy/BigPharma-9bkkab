# BigPharma — splash, optional profile, pricing, interactions and keyboard report

## Implementation delivered

- **Cold-launch splash:** Root-mounted overlay reuses the retained `WelcomeExperience` brand/logo/message phases and original black-and-white animations. Retained visual copy is `WELCOME TO` above the actual BigPharma logo, followed by `Something better\nstarts here.`; its accessible welcome label is `Welcome to BigPharma.`. No tagline was invented. Timings are 900 ms + 1100 ms + existing brief exit. It is not subscribed to background/resume events and does not replay on navigation or tabs. Authentication restoration runs underneath. Signed-out users still reach the separate original landing with `Your health\nbeautifully\nmanaged`, original assets/layout and Log In/Sign Up; signed-in users reach Home.
- **Optional new-account profile:** New OTP-created accounts receive a versioned initial-profile marker. Only verified newly versioned accounts without a completed/skipped marker see `Make It Yours`. First name and photo are independently optional. Complete saves supplied fields; Skip preserves existing profile fields and stores only completion. Both show `Looking Fresh!` for about 900 ms, then the existing AuthRouter opens Home. Existing accounts without the new marker are not forced through this flow. Photo picking is explicit, uploads use the existing private `profile-photos` bucket, cropping/size preparation and account-scoped storage policies. Failed saves display errors and can be retried; no empty/sentinel name is stored. First name/photo can be updated in Settings later. No surveys, tutorials, films or further setup screens are mounted.
- **Profile grid:** The actual two-column FlatList uses `columnGap: 16` and an explicit row ItemSeparator of height **18**. Removed the content-container gap reliance that could collapse through list cells. Rows stretch cards to equal height. Card styling/statistic calculations are unchanged. No negative margins, fixed grid height, absolute cards or extra row gaps were added.
- **Keyboard:** Shared native scroll-begin-drag policy explicitly blurs the active input and dismisses the keyboard. It neither changes text nor submits a form. Applied to the shared AuthFrame (entry, scheduling, notes, profile/auth), Home/Cabinet/Savings/condition/admin lists, refill sheets, scanner review and medication detail/dose containers. Keyboard-related medication autocomplete panels close on drag; focusing/typing reopens them with text preserved. Ordinary input taps do not invoke the dismissal policy.
- **Acquisition costs:** Existing CMS NADAC 2026 backend/cache is retained and repaired. Huge POST/OR package requests are replaced by bounded documented GET filters (at most two 24-row pages). Prefix/strength discovery is never the identity match: every displayable package must resolve through live RxNorm NDC status to the identical active SCD/SBD product, retaining strength, form, release type and brand identity. Saved strength/form mismatches are rejected; legacy saved product links are reused when a saved RxCUI is absent. Ambiguous package codes are not guessed. Single saved NDCs pin the lookup. Without a saved NDC, the UI explicitly labels a verified **reference NDC**, not the patient's manufacturer. Source release metadata refreshes daily, matched references daily, misses more frequently; client cache is one hour and versioned away from earlier results. No whole dataset is downloaded per mobile request.
- **Cost presentation:** `Estimated Drug Acquisition Cost`, identity/strength/form, compatible quantity entry, decimal per-unit rate, calculated total, CMS NADAC source and effective date are shown separately from pharmacy prices. No default 30-tablet quantity or fee is inserted. Saved quantity is prefilled only when its recorded unit is compatible. EA/tablet/capsule/patch, ML and GM conversions are guarded; puffs/doses are not silently converted to mass or volume. Required acquisition-cost disclaimer is visible. Existing provider-returned retail references are accessible in a separate Pharmacy price block; no pharmacy quote is fabricated or replaced with NADAC.
- **RxCheck:** Existing authenticated Edge Function, private key, graph and selected-two-product workflow remain intact. Added exact six-drug generic/brand candidate normalization and reading of stored generic/brand/strength/form fields. RxNorm ingredient mappings retain all combination ingredients. Provider name-search identifiers are validated through RxNorm before use; invalid/combination name rows are rejected and verified IN identifiers are used through the documented RxCUI query contract. GET requests use `X-API-Key` only server-side. Description/mechanism/references are parsed from actual responses, not authored clinical results. Explicit no-record, unresolved, malformed, network, quota and authentication errors remain distinct. A user-triggered all-active-pairs review lists coverage and unresolved medications, reuses unique ingredient results, retries incomplete results and bounds request traffic. Paused/archived/deleted/discontinued records are excluded. No whole-list safety claim is made.

## Actual production evidence inspected

Before corrections, `nadac-pricing` logs showed repeated **503** with `Signal timed out` and aborted **499** requests. They did not establish successful pricing. RxCheck logs showed an `amoxicillin + atorvastatin` request returning provider **400** and `unresolved`, despite successful Cabinet identity loading. These were inspected rather than treated as negative interactions. A later PostgreSQL log inspection reported no error logs; absence of logs is not an end-to-end test.

The public RxCheck OpenAPI contract was retrieved at `https://api.rxcheck.dev/openapi.json`; its `/v1/interactions` GET, `drug1`/`drug2`, full response option, `X-API-Key` header and `/v1/drugs/search?q=` endpoint were verified. Public search succeeded for all six generic names, but important deficiencies were found:

| Search | Observed identifier | Verification |
| --- | --- | --- |
| atorvastatin | 262095 | RxNorm maps to atorvastatin IN 83367 |
| levothyroxine | 1189106 | RxNorm maps to levothyroxine IN 10582 |
| lisinopril | 104375 | RxNorm maps to lisinopril IN 29046 |
| metformin | 1043567 | **Combination metformin + saxagliptin**, not valid evidence of metformin-only identity; rejected |
| amlodipine | Exact result has null RxCUI; separate levamlodipine result | Null/different ingredient must not be selected as amlodipine; use verified IN 17767 and validate actual interaction response |
| losartan | 2709046 | RxNorm maps to losartan IN 52175 |

**These are name-discovery tests, not successful authenticated interaction tests.** The corrected backend must still complete real keyed requests before being called a verified RxCheck integration. There is no hardcoded finding for lisinopril/losartan or any other pair.

## Public source tests actually passed

CMS metadata returned the requested NADAC 2026 dataset, modified `2026-10-20T12:01:01+00:00`. Filtered public source GETs returned actual `2026-10-21` rates for all six generic drugs. Each following package was independently checked against the live RxNorm NDC status endpoint and returned ACTIVE/YES with the listed product RxCUI.

| Source fixture — not a patient default or retail quote | NDC | Exact product RxCUI | CMS rate / EA | 30-EA arithmetic fixture |
| --- | --- | --- | --- | --- |
| Atorvastatin 20 mg oral tablet | 67877051290 | 617310 | 0.02858 | $0.86 |
| Levothyroxine 137 mcg oral tablet | 69238183701 | 966270 | 0.06326 | $1.90 |
| Lisinopril 20 mg oral tablet | 68001033500 | 314077 | 0.02491 | $0.75 |
| Metformin 1000 mg immediate-release oral tablet | 82009004710 | 861004 | 0.02332 | $0.70 |
| Amlodipine 5 mg oral tablet | 76282023890 | 197361 | 0.01015 | $0.30 |
| Losartan 25 mg oral tablet | 65862020190 | 979485 | 0.02232 | $0.67 |

All six fixed-decimal arithmetic fixtures passed a read-only SQL assertion block. This tests arithmetic only, not the mobile implementation or authenticated Edge pipeline.

The exact GET filter shape used by the corrected provider (keys, limit, offset, count=false, schema=false, effective/as-of bounds and plural `sorts`) was also exercised publicly for metformin 500 mg. It returned both:
- `00378600291`, **osmotic extended-release** tablet, rate 0.18913, independently verified as RxCUI **1807917**.
- `00378718505`, **immediate-release** tablet, rate 0.01483, independently verified as RxCUI **861007**.

This confirms why textual name/strength matching alone is insufficient. The corrected matcher rejects a package unless the exact requested product RxCUI matches. These observed source snapshots are documentation/test evidence only; no fixture prices were added as runtime fallbacks.

## Verification status and remaining limitations

| Test category | Status |
| --- | --- |
| CMS public metadata + filtered current records | **Passed through live public HTTP fetches** |
| Six public package identity checks + separate metformin IR/ER identities | **Passed through live public RxNorm HTTP fetches** |
| Six arithmetic source-fixture assertions | **Passed in read-only SQL** |
| All six public RxCheck name-discovery requests + erroneous metformin/amlodipine findings investigated | **Passed/inspected**, not clinical interaction coverage |
| Post-correction authenticated `nadac-pricing` responses for saved medications/all strengths/brand packages | **Not executed** |
| Post-correction keyed RxCheck interactions, complete pair review, error/unknown/no-record/combination flows | **Not executed** |
| Cold launch signed in/out, background return, signup/OTP/profile/photo/skip/confirmation, Home | **Source reviewed; device/E2E not executed** |
| Exact rendered profile gaps at 375×667 target logical viewport | **Authored visual measurement test; not executed** |
| Native keyboard dismissal, focus removal, text retention on iOS/Android | **Implemented; device not executed** |
| TypeScript/build/test suite and installed native builds | **Not run — no shell/build/browser/device runner is available in this editor session** |
| Physical-device features verified in this session | **None** |

Code is updated in the application and Edge Function source paths. OnSpace activation occurs when the editing batch is applied; **no independent post-activation production request or deployment ID was obtained**, so deployment activation and corrected runtime success are not claimed. Expected log markers: RxCheck `20261026-verified-rx-identifiers-v2`, NADAC match `20261026-nadac-filtered-get-v3`.

A bounded query can legitimately return unavailable for absent source rates, mismatched records, unsupported formulations, ambiguous NDCs or insufficient catalog identity. It is not evidence of zero cost. Upstream outages/timeouts produce retryable service errors. Public RxCheck name-search deficiencies may still cause a real IN-identifier request to return unresolved; this must be reported, never relabeled no-record. Current corrections must not be considered fully accepted until the pending runtime tests pass.

## Tests authored / updated

- `tests/splash-profile-medication-qa.spec.ts`: new-account gating, skip preservation, retained splash/landing, exact aliases, strength/release/package mismatch rejection, quantity/unit math, safe response distinctions, keyboard policy and opt-in authenticated profile gap measurements.
- `tests/priority-medication-source-live.spec.ts`: opt-in actual CMS/RxNorm/RxCheck discovery transports and an authenticated corrected Edge interaction test that fails on unresolved/failed outcomes instead of accepting HTTP 200 alone.
- Updated intentional old assertions in original welcome, final-feature, NADAC and map-first regression files to reflect the specifically requested splash, optional profile, quantity estimates and separate retail references. No successful test run is claimed.

Exported-project runner examples (do not commit credentials):

```sh
npx playwright test tests/splash-profile-medication-qa.spec.ts
BIGPHARMA_PUBLIC_SOURCE_QA=1 npx playwright test tests/priority-medication-source-live.spec.ts
```

Authenticated tests need an authorized QA storage state/token and running preview/backend. Native acceptance needs installed iOS/Android builds. Verify cold-only splash, valid/expired OTP, optional name/photo/both/neither, Complete/Skip, upload errors, fresh transition, existing-login/session behavior, exact row gaps, drag-to-blur on all long forms, real matching prices and real keyed interaction outcomes. Existing notification scheduling, scanner confirmation, medication records and BigPharma Connect authorization/data paths were preserved; their prior unverified device cases are not newly claimed as tested.
