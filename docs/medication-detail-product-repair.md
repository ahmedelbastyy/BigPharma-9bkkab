# Medication detail and product system repair — 2026-10-24

## Diagnosed failures
- Hero artwork was an absolute sibling of the ScrollView, at zIndex 1 behind content at zIndex 2, translated horizontally into the heading lane. It had no relationship to actual title height and could sit behind cards.
- Missing approved summaries only called an enqueue RPC. No ordinary authenticated action dispatched a worker. Eight jobs were pending with zero attempts at inspection.
- Actual live worker GET attempts returned HTTP 500 / BootFailure. The deployment graph contained imports into project services; the content contract used extensionless imports. Server contracts, source extraction and display validation now live in the deployable `_shared` directory with explicit `.ts` imports. Client services re-export the same pure contracts. A successful live invocation after activation has not been established.
- Patient text validation incorrectly treated a multi-sentence paragraph as one sentence for its 46-word check. Interim indication selection also consumed regulatory headings with the first source sentence. Both have been corrected without character truncation.

## Implemented
- Header → reserved centered hero lane → What It Does → Know Before Taking → Use It Well, all inside one normal-flow scroll container. No absolute artwork layer, lateral translation, rotation, opacity disappearance or under-content positioning remains. Scale is bounded to 0.86–1 within the reserved lane.
- Three bundled transparent SVG illustrations: amber prescription bottle / white cap, inhaler, nasal spray. No background rectangle or baked-in text. Two native, centered, font-fitting label lines use short display names and actual strengths or supplied product details. Form and route selection are shared throughout Cabinet, search, Home, reminders, confirmation, dose guide and detail artwork. Optional verified supporting images remain opt-in.
- Approved-first, exact-product RPC, persistent device cache, in-flight deduplication, status-aware safe interim cards and bounded background checks. Approved products never dispatch a preparation request; review-required drafts are reused, not regenerated.
- Authenticated `ensure` action validates the real session and catalog product, respects rate limits, persists the shared job and dispatches work using a globally exclusive lease. Work is targeted to the product being opened, not a random queue item. Three-attempt limits remain.
- DailyMed is the clinical text source. openFDA only cross-checks identity; text from a potentially different openFDA label version is not merged into patient statements. Exact XML ingredient strengths and formulation are verified for inhalers as well as solids; canonical RxNorm mg/ACTUAT and mg/mL expressions avoid guessing percentage conversions.
- Only requested clinical sections are used for generation. Full XML remains in private source Storage. Full labeling remains accessible independently.
- Shared structured schema, at most five bullets and ten sentences per card, statement-level exact evidence, an independent source audit, exact product/source association and identified human approval. A newly generated AI draft is never mislabeled approved. Missing or rejected sections have explicit safe guidance instead of blank boxes. Mechanism, warnings, contraindications and population precautions use separate cards so they do not overflow shared display budgets.
- Added updated_at stamping and safe minimal preparation metadata without changing RLS or granting patient write privileges.

## Actual verified results
- Saved prescriptions preserved: **11**.
- Existing approved product profiles readable through authenticated database permissions: **5**. Metformin 500 mg (RxCUI 861007) returns its saved structured purpose.
- Lisinopril 2.5 mg (311353): **1 existing matched label**, SETID 705582ed-da8c-418f-8bb2-fc0b74ed0a88. Its complete first indication sentence is source-backed and readable under the authenticated role; no new approved profile was manufactured for it.
- Asmanex inhaler (2196792): live DailyMed discovery returned SETID 0c6d63da-41bc-4894-bead-198e66c848ac, version 9; openFDA independently returned that exact RxCUI. It still had **0 persisted labels** at the final database check. The new matching path has not been run successfully in the hosted worker.
- Saved Allerest nasal spray (1000994): live DailyMed RxCUI discovery returned **zero labels**. No other brand or generic label was silently substituted. It must retain a safe source-unavailable state until an appropriate source association is established.
- New AI drafts generated during this session: **0**. Worker jobs attempted: **0** at the final persistence check. Observed worker requests failed during boot; fixing the deployment graph is not evidence of a successful generation run.
- Patient publishing remains denied; anonymous access to the approved-profile RPC remains denied; RLS remains enabled.
- Database-only approved profile query: **8.647 ms** measured with explain analyze. This is not mobile repeat-view latency or an end-to-end performance guarantee.

## Tests added, not reported as executed
`tests/medicationProductChecks.ts` and `tests/medication-product-system.spec.ts` cover three asset kinds, label bounds, canonical formulation matching, summary validation, safe interim extraction, non-overlapping hero geometry at 320/390/768 px and approved-summary persistence without preparation requests on reopening.

Real authenticated browser/device tests and post-activation hosted worker verification have not been completed. New drafts still require clinical review. Automatic pg_cron scheduling remains unavailable in this tenant; existing explicit source-refresh actions are preserved. No live generation, three-product approval, measured mobile rendering or successful full end-to-end workflow is claimed.
