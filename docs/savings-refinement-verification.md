# BigPharma — Home, Savings and Cabinet refinement

Date: October 25, 2026

## Implemented

- Six bespoke bundled images: three pharmacy/wellness backgrounds and three sharp editorial center visuals. They are illustrative wellness motifs, not representations of a specific prescription.
- All hero layers stay mounted. Assets are preloaded; switching waits for every image's load callback. Background and center visuals crossfade together every 3.8 seconds over 650 ms. Text/navigation stay fixed. Reduced-motion and inactive/background states pause automatic motion.
- Greeting is a left-anchored row with a narrower fixed phrase slot and a stationary user name. Only the translated phrase transitions, every 3 seconds; Arabic writing direction applies only to that phrase.
- Home avatar already navigated to Profile; this correct behavior was retained. The launch's WELCOME TO line moved another 8 points downward without changing the approved capsule/brand flow.
- Discounts now displays as Savings, with the existing coupons route preserved. Tutorial and tab accessibility labels were updated without changing navigation identity.
- The old photograph/ZIP-price area is replaced by a rounded nearby-care module. It checks foreground location permission, obtains device coordinates only after permission, searches pharmacies or healthcare places within 5 km, and shows real returned place names, addresses and straight-line distances. Place/marker selection, copy-address confirmation and external Maps actions are wired.
- Web map: dynamically loaded Leaflet/OpenStreetMap, avoiding server-render DOM access. iOS map: native Apple Maps with red markers. Android: safe list/external-map fallback unless the build already has native Maps configuration; no unconfigured Android MapView is instantiated.
- Loading, denied-permission, location-timeout, no-results, provider-error and retry states are included. Permission is rechecked on focus/foreground. No background location tracking is enabled.
- Selected medication automatically requests dc_drug_prices through the existing authenticated Anakin connector. Unselected Cabinet medications are not requested. Returned explicit totals/per-unit prices retain form, quantity and source metadata. Form/quantity filters show up to three lowest returned totals within a common returned currency group; unknown currency is identified, never guessed.
- Price destinations must be secure, actual returned Drugs.com links with a non-root path. No homepage or fabricated price-guide destination is presented as a product offer. Nearby places are not falsely linked to pharmacy inventory or price availability.
- Anakin completed-result cache hits can return immediately from submit, eliminating the previous compulsory polling delay. Existing saved jobs, fingerprints, hourly quotas, uncertain-submission protection and explicit redistribution/storage permissions are preserved.
- Cabinet actions have 16-point row/column spacing; the surrounding layout has clearer 16-point separation. Carousel rotates every 2.5 seconds with 250-ms transform animation, permanent keyed tiles, shared asset preloading, focused center and subtle iOS side blur. One medication stays centered; two repeat across visual slots only; three or more cycle through their products. Swipe and center-tap remain wired.
- Inventory refill/correction actions now have separate outlined pill targets, icons, 48-point minimum height and hover/press feedback. Existing refill advice, dose recording and RefillSheet operations were retained.

## API-key boundary

- GEOAPIFY_API_KEY is read only in supabase/functions/nearby-pharmacies/index.ts. Provider requests, URL construction and credentials remain within that Edge Function.
- ANAKIN_API_KEY remains read only inside the existing Edge Function connector/shared Wire module.
- No provider keys were added to frontend source, Expo public environment variables, app.json, returned place fields, or logs. Geoapify response strings are additionally scrubbed of configured secret values.
- Client calls use the existing signed-in Supabase client and functions.invoke. Server validates JWTs. OPTIONS is handled first; all responses have shared CORS headers. Provider errors are generic and do not echo upstream URLs or bodies.
- Nearby search rounds coordinates to approximately 100-m grid cells before contacting Geoapify. Coordinates are not persisted to a profile/database or application logs. The provider receives approximate location and its own service may retain request metadata; this is disclosed beside the permission action.
- Short-lived in-memory place cache: five minutes, bounded to 100 cells. Owner-scoped server-only allowance: 30 requests/hour. The allowance table has RLS, no client policies/grants, and a service-role-only RPC.
- Anakin server result caching still requires the existing cache_approved permission. The screen retains a short-lived in-memory result for display and deduplication, not persistent on-device price storage.

## Verified in this session

Executed read-only SQL audits before and after changes:

| Check | Result |
| --- | --- |
| Existing medication records | 12 before; 12 after |
| Existing reminder/dose events | 154 before; 154 after |
| New allowance-table RLS | enabled |
| Anonymous table SELECT | denied |
| Authenticated client table SELECT | denied |
| service_role allowance RPC execution | allowed |
| Anonymous/authenticated allowance RPC execution | denied |
| Existing Anakin content permission | false; not overridden |
| Existing Anakin persistent-cache permission | false; not overridden |

Cross-project source searches confirmed no provider-key consumers in frontend code. Only the intended public Supabase anon-key references were found among EXPO_PUBLIC key references. Generated-image tool results confirmed all six image files were created and included in the hero's asset arrays. Reviewed imports, route identity, callback wiring, effect cleanup, cached-result flow and native/web map guards. No medication/profile/authentication/notification data mutation was performed by this session's SQL.

## Not verified / remaining

- No terminal, test runner, simulator or installed-device interaction tool was available. The authored regression suite tests/savings-refinement.spec.ts has **not been executed**; no build, screenshots, frame-rate, clipboard, permission-dialog or notification test is claimed.
- Geoapify's authenticated end-to-end lookup still needs a signed-in preview/device and actual granted location permission. Confirm allowed API-key restrictions permit server requests. Browser iframe/OS permission restrictions may deny location; the UI explains and supports retry/settings.
- Anakin live pricing is intentionally blocked by the existing unapproved content-redistribution permission. Configuring a credential does not approve those rights. Verify documented permission, scope, reviewer, expiry and storage rights in the existing admin workflow before enabling price results; this session neither modified nor bypassed them.
- Real returned dc_drug_prices payloads, credit usage, job failure/resume, server cache hits and resulting destination links cannot be certified while permission is blocked. Unsupported formats yield honest no-usable-prices states. No credit-consuming sample jobs were submitted.
- Anakin polling is the implemented completion mechanism; no unverified webhook handler/signature implementation was introduced.
- Android in-app Maps requires separate native SDK configuration not present in app.json. The nearby list, copy and Open maps flow are still implemented. No Google Maps/native-provider key was added or requested in this session.
- After rebuild/deployment, test small iPhones at 320/375/390 points, landscape, large text, reduce-motion enabled, offline images, 1/2/3/6/10 carousel items, rapid medication/filter changes, tab switches, location revocation and price-job resumption. Verify hero and carousel motion visually before making a zero-stutter claim.

## Release checks

1. Sign in with an existing account; verify its medication list, profile, refill balances and reminders are unchanged.
2. Visit Home: confirm greeting/name alignment in all four languages, stationary text during hero fades, avatar-to-Profile navigation, and correct images under slow/offline connections.
3. Visit Savings: grant/deny location access; select red markers and list rows; copy address and open maps; try both categories, no-results and retry states.
4. Select a Cabinet medication. With current rights settings, expect the explicit approval-pending state and no submitted price task. Once independently approved, validate a real asynchronous response and compare displayed fields directly to the provider payload.
5. Test carousel single/two/many variants, both swipe directions, center-tap and focus/background pauses without screen refresh or database duplication.
6. Open medication inventory, hover/press each outlined action and confirm refill/correction still uses the existing secure flow.
7. Run the existing and new regression suites, native builds and device checks before declaring release readiness.
