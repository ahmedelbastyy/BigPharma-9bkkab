# BigPharma functional repair — 25 October 2026

## Actual findings and verification

- Public Anakin catalog discovery returned all three requested contracts: `dc_drug_prices(drug: string)`, `dc_drug_interactions(drug: string)`, and `dc_condition_drugs(condition: string)`. All are active, asynchronous, public read actions with `auth_mode: none` (no target-site account). The keyed Wire API still requires the server-side Anakin key.
- The saved backend connection is `verified`, timestamp `2026-10-25T00:55:40.492-05:00`. This is a previously recorded credential check, not a fresh authenticated test performed in this editor session.
- Exact present blocker: `anakin_wire_permissions.approved=false`, `cache_approved=false`, no permission evidence URL, and **zero Anakin jobs**. Drugs.com Terms §3 explicitly prohibit automated extraction, storage and redistribution without written consent. Anakin API access and the public catalog do not establish those source rights. No evidence was fabricated, permissions were not silently enabled, and no paid content task was submitted.
- SQL confirmed **13 medication records and 249 reminder records unchanged**. No patient records were inserted, edited or deleted by this session's tools.
- New receipt table has RLS; anonymous callers cannot lease jobs and authenticated clients cannot reserve server jobs.
- Read-only persisted-category counts: All 9, Active 9, PRN 0, Expiring 1, Archived 4, Paused 0. PRN/paused edge cases are covered by authored fixtures, not fabricated patient records.
- Read-only reminder audit: zero duplicate *current active future* medication instants. Across all saved versions there are 92 repeated-instant groups and 119 inactive future uncompleted rows. Those records are retained; app/native scheduling excludes inactive records and the notification planner independently deduplicates medication/instant pairs.
- Real PostgreSQL timezone checks for America/Detroit: 09:00 local becomes 14:00 UTC on 13 March 2027 and 13:00 UTC on 14 March; 13:00 UTC on 31 October 2026 and 14:00 UTC on 1 November. Advance arithmetic is exactly 10 minutes. These verify conversion arithmetic, **not native notification delivery**.
- PostgreSQL error logs returned no errors. Live Preview network inspection returned no requests. There was no available rendered-screen, terminal or physical-device runner in this session.
- Observed pre-change `saved-prices` invocation durations were approximately **206–1,202 ms**, returning no pricing data. This is a baseline observation, not a measured improvement or completed action latency. FPS, avatar paint latency, webhook delivery and native delivery have not been measured.

## Implemented in the application

### One Anakin lifecycle

`_shared/anakinWire.ts` owns the credentialed transport, parameter-contract verification, signing-secret retrieval, strict result-URL validation, nested payload normalization and redaction. All three screens use `services/anakinService.ts` and the same authenticated Edge Function.

- Verify each action against catalog discovery before submission; cache discovery for one hour.
- Submit `action_id` plus actual normalized `params` to authenticated POST `/v1/wire/task`. A processing response only starts a job; it never becomes a successful result card.
- Persist owner, fingerprint, normalized input, actual provider job ID, canonical poll URL, state, HTTP status, safe provider error, timestamps, credit metadata and result metadata.
- Owner-level PostgreSQL advisory locks make deduplication, two outstanding jobs and a 40-credit/hour allowance atomic. Uncertain submissions are retained and not automatically resubmitted. An administrator must resolve uncertain upstream submissions before releasing their capacity.
- Exclusive 20-second job leases prevent webhook/client races. Status polling backs off between 2 and 30 seconds, stops on terminal status, and has a three-minute foreground wait budget and bounded server poll count. Jobs/results remain saved after the screen closes.
- Prefer per-request `webhook_url`, signed using the account default signing secret retrieved with the existing server key. Validate HMAC-SHA256 against the exact raw bytes, delivery ID, timestamp, event type and known job. Accept the documented `data.jobId`; validate `data.result_url` and fetch its authenticated canonical status/result endpoint. Inline results are not required.
- Delivery receipts are idempotent; overlapping deliveries use the same lease. Return retryable failure when results are temporarily unavailable rather than falsely acknowledging completion. Completed/failed states cannot be downgraded by a late event.
- Normalize nested completed action envelopes before rendering. Results above the bounded 95 KB inline cache limit fail explicitly rather than silently filling UI cards with unsupported data.
- Removed arbitrary minimum scope-note length and a mandatory expiration date as activation conditions. Actual reviewed source permission evidence is still required. Reviewed non-expiring rights can be represented with a null `valid_until`.
- Administrator-only Medication Library diagnostics show normalized inputs, request/provider IDs, HTTP status, safe provider error, polling count, reported duration, callback mode and normalized JSON. Ordinary screens show concise errors and authorized external alternatives.
- Realtime is unavailable in this OnSpace tenant; bounded status polling is used. There is no supported pg_cron/pg_net scheduler in this tenant. **Autonomous completion while the app is closed depends on successful signed webhook delivery.** If webhook setup fails, polling resumes when the user returns; do not describe that fallback as an always-running background scheduler.

### Home

- Separate greeting/name spans with explicit LTR outer flex ordering, native RTL Arabic shaping inside the greeting span, correct punctuation, natural width and wrapping.
- Compact responsive banner (144–168 px requested minimum, accommodating accessibility/content height); removed the old hard-coded 216 px minimum and unnecessary spacer. Original full-bleed photograph, mounted slideshow layers, preloading, overlay and stationary text remain.

### Savings

- Map remains 340 px and independently mounted. Category/list changes do not replace its component. Centered activity indicator appears over a softly darkened map and fades away.
- Locations sorted by calculated geographic proximity; first three by default, Show More/Show Less for the remaining list. Clean rounded cards include category, address, Copy Address and Open in Maps. A selected marker outside the visible subset may show its selected-place card. No driving/walking route estimate is implied. Geoapify/OpenStreetMap attribution remains.
- Pricing cards use standard dosage-form art on the left, short name/form beside it and returned total/range on the right. Quantity, unit price, actual source and returned dates remain explicit. A different formulation is flagged; absent strength is not borrowed from the prescription and represented as source-verified.
- Up to five numeric lower-bound-ranked entries, preserving displayed ranges and quantity/form differences. No pharmacy or purchase destination is invented.
- One owner-scoped snapshot per app process/session. No focus, filter, scroll or rerender event submits paid requests. New sessions reuse saved values and refresh at most two stale/missing distinct guides; explicit Search/medication selection can initiate a freshness-controlled lookup. Five-minute repeat suppression and backend freshness/deduplication remain in force.
- Native View Price Guide opens the exact returned source URL in the system in-app browser with a separate Open in Browser control. This avoids framing/rehosting Drugs.com without permission. Web uses the external browser alternative.

### Interaction/condition screens

- Match returned interactions only against current verified active ingredients, including canonical ingredient relationships for combination products. Changing the active medication set invalidates prior pairs and in-progress UI results.
- Shared lifecycle/caches for both features. Unsupported symptoms are not sent as inferred diagnoses. Changing the condition query clears stale UI results; Search is the request trigger.
- Limited-check wording and pharmacist confirmation remain; unavailable/unknown-format results do not become an all-clear.
- Scientific graph uses UI-thread Gesture Handler pan, per-node drag, pinch (0.7–3×), collision-aware coordinates and tap inspection. Neutral pre-check connections remain distinct from supported severity edges. One fullscreen button; fullscreen uses the same shared positions, pan and zoom, with safe areas and a close control. Closing does not reset layout. Twelve nodes are visible; the ingredient check is not limited to those twelve.

### Cabinet and history

- Shared category rules/counts from the same state. All excludes archives but includes paused saved records; Active excludes paused and PRN. PRN checks recurrence/status/schedule. Expiring requires a recorded date within 14 days. Archived includes soft-deleted records.
- Confirmed Delete archives active medications and preserves history. Restore calls the existing authoritative restore RPC, including clearing soft-delete state. Archived permanent deletion has two confirmations and preserves the record on retention/FK failure.
- Immediate shared-state updates; filter changes do not fetch/remount the page. Paused/archived future events are suppressed and native schedules reconciled.

### Avatar and controls

- Startup avatar preloader, shared signed-URL promise/cache, persisted cache and expo-image memory/disk caching. New uploads are cropped to 256 px. URLs renew with a 15-minute safety margin, coordinated with the existing 50-minute mounted refresh check. Home/Profile reuse resolved URLs without fallback resets on tab changes.
- Shared native input metrics used across medication/timezone fields, request/refill/review forms, auth, survey and admin inputs. Date/selection values use centered rows and native font metrics; edit fields remain left-aligned and multiline sizes remain configurable. Search has an actual submit handler. No arbitrary timezone-only offset was added.

### Notifications

- Retained native date scheduling, not in-app delivery timers, ten-minute default advance, user settings, private/local preference persistence and finite pending window of 60.
- Added medication/instant deduplication, PRN exclusion and permission-check reconciliation revision. Test confirmation is no longer overwritten by a generic permission message.
- Android exact-alarm manifest permission declared; install a new native build and grant Alarms & reminders where the OS requires it. Scheduling failures give permission guidance rather than fake success.
- Dose, low-inventory, refill and expiration switches remain functioning preference/reconciliation paths. Old records are preserved but never generate alerts while inactive. Cross-device changes apply when this device next synchronizes.

## What has NOT been verified/completed

- **Actual completed API tests for all three actions: zero.** Source extraction/display/cache authorization is genuinely missing; publishing real responses was not tested or bypassed. Credit balance and action execution failures cannot be inferred from the existing credential check.
- Signed webhook reachability, default-secret access, delivery retries, callback result fetching and real provider envelopes need a permitted end-to-end run. `supabase/config.toml` disables gateway JWT only for this function; the function explicitly authenticates app calls and verifies callback signatures. Confirm the deployment respects this setting before relying on closed-app completion.
- No real rendered Arabic transition, map expansion, browser, graph gesture, filter persistence, avatar paint or keyboard test was run. No physical iOS/Android notification test was run.
- New fixtures/source-contract tests are authored, not executed: `tests/bigpharma-functional-repair.spec.ts`, updated final-polish tests and `_shared/anakinWire.test.ts`. They are not real medical data or live API-response tests.
- Real-device release verification must cover near-future scheduled dose (10-minute advance), granted/denied/provisional permission, Android channel and exact-alarm settings, paused/archive/schedule cancellation, duplicate prevention, daily/weekly schedules, DST, background/closed-app delivery and Test Notification.
- Android in-app maps still require the pre-existing native Maps configuration. The fallback list/external map remains available; no sensitive provider key was moved into the app.

## Next verification gate

Record genuine reviewed source rights (including storage permission for the requested durable cache) through the project owner's Cloud administration process. Then use Medication Library credential/contract diagnostics and permitted real cabinet inputs to test each action. Inspect actual completed JSON and provider delivery logs before marking the API work verified. Run the authored tests and installed-device/rendered QA matrix; record real measurements rather than estimated success claims.
