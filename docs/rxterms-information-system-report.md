# RxTerms medication information system — actual implementation and verification

## Documentation examined

Read NLM RxTerms terminology documentation, every relevant RxTerms API method (allinfo, allconcepts, version), Clinical Tables RxTerms v3 query/output documentation, DailyMed v2 overview and the SPL listing, SETID XML and media endpoint documentation. Checked the October 2026 release notes.

Important distinctions implemented:
- The current documentation lists **RxTerms202610.zip**. Release notes report 10,837 SCD, 8,077 SBD, 551 GPCK and 717 BPCK supported concepts: **20,182 clinical product RxCUIs**, not 20,182 distinct ingredients.
- Main release columns are the documented 18 fields. `STRENGTHS_AND_FORMS` is a Clinical Tables derived field, not a column in the monthly main file.
- Ingredients mapping has RXCUI, INGREDIENT and ING_RXCUI. Suppressed/retired rows are excluded from supported selection.
- Clinical Tables returns positional arrays. Its default codes are DISPLAY_NAME strings, not product RxCUIs; RXCUIS and STRENGTHS_AND_FORMS must be aligned by both result index and option index.
- Clinical Tables pagination is limited to offset + count <= 7,500 and totals are capped; it is not used to enumerate the whole catalog.
- DailyMed SPL listing/media pages have a maximum page size of 100. SPL SETID retrieval returns XML, not JSON. A product RxCUI identifies a clinical concept, not a manufacturer's bottle.
- NLM updates RxTerms monthly after RxNorm. Availability is an approximation, not confirmation of prescribing suitability or local stock.

## Database counts verified during this session

| Measurement | Actual database count |
|---|---:|
| Clinical product concepts | **100** |
| Unique external identifiers across existing ingredient and product catalogs | **121** |
| Existing ingredient identities preserved | **21** |
| Products imported from the monthly ZIP release | **0** |
| Completed, ledger-validated monthly ZIP imports | **0** |
| Products with a product-associated verified label | **1** |
| Existing ingredient-level sourced clinical excerpts | **6** |
| Newly structured SPL XML label records | **0** |
| Approved licensed product/packaging photographs | **0** |
| Products eligible for generic illustrations | **100** |
| Official media candidates pending review | **16** |
| Existing approved video resources | **1** |
| Approved medication-specific videos | **0** |
| Original saved medication records preserved | **2** |
| Legacy records mapped without editing originals | **1** |

The illustration count is eligibility, not a claim that 100 pages were manually opened or that un-enriched formulations are known. Unknown types use an explicitly generic medication illustration.

## Work actually executed

The previously deployed API worker successfully archived 21,247 allconcepts product candidates and committed an atomic **50-product batch** (50 genuinely new products), bringing the product table from 50 to 100. This was the **legacy allconcepts API**, not the requested monthly ZIP release. The allconcepts endpoint includes potentially suppressed concepts, so these are not claimed as a completed supported release.

The saved Atorvastatin entry was checked against exact RxTerms allinfo: **617312, atorvastatin 10 MG Oral Tablet, Oral Pill route**. An append-only mapping links that record to the clinical product. Its original name, generic field, reminders and history were not edited. The deployed worker retrieved a product-associated DailyMed/openFDA label and MedlinePlus links; 16 label media candidates were copied into the uncertain-media review queue, without approval or rehosting.

## Implemented application changes

- Monthly release importer dynamically reads the newest ZIP URL from the official documentation, downloads/archives it in private storage, parses documented main/ingredient fields, records source/version/hash and imports all supported products. First transaction is 50 rows, later transactions up to 100. Each transaction has an expiring lease, idempotent merge, checkpoint and ledger. Completion validates the full source count; monthly retirement changes terminology visibility, not user history.
- Normalized product groups, formulations, ingredient mappings, aliases, label candidates and media records extend the existing tables rather than replacing user data.
- Add Medication has 200ms grouped autocomplete, local indexes and Clinical Tables fallback across the current US dataset. Users expand a medication/route group and select a strength/form option. RxNorm approximate suggestions are clearly marked. Backend allinfo verification is required before saving an actual clinical product. Existing missing-medication request functionality remains connected.
- Insert and identity-changing update guards reject arbitrary names or altered product strengths/forms. Notes/status updates do not require rewriting legacy identity fields.
- Detail pages provide source-scoped expandable official clinical sections, marketed-strength warnings, reference manufacturer/label selection, explicit unavailable states and separate MedlinePlus links. Existing AI summaries are now optional rather than automatically loaded as the primary medical record.
- SPL XML enrichment examines bounded label candidate pages, validates RxCUI/SETID/version/brand/route associations against openFDA, archives original XML, extracts clinical sections and queues media. Candidate failures remain auditable and do not block terminology availability.
- Seven reusable monochrome generic illustrations plus an unknown-type illustration use expo-image and are expressly labelled as illustrations, not real pill appearances. Exact photographs require approved reuse evidence and matching recorded NDC, product and SETID.
- Administrator media review classifies photographs, packaging and diagrams separately and requires license evidence. Existing key-free video playback and moderated library are preserved. No new videos were invented or auto-approved.

## Runtime diagnosis and remaining work

The live endpoint returned **rxterms-batches-v1** throughout these tool checks, including after new monthly worker files were written. The available old worker returned HTTP 200, committed the bootstrap batch and enriched Atorvastatin. There is **no evidence of a current memory limit, timeout or database write failure** in those operations. Earlier 403 responses must not be presented as proof of a memory/runtime limit.

The new ZIP worker could not be observed running before this session's code publication. Its fresh monthly job is pending. **The monthly ZIP has not been verified as downloaded/extracted/imported; full-catalog import is incomplete.** The administrator's complete-release import panel drives repeated, resumable requests while open and supports safe pause/resume and subsequent monthly merges. This is not an installed unattended scheduler.

No assertion is made that all candidate pages, all products, all medical facts or all videos have been researched. Missing verified labels, licensed imagery and medication-specific video coverage remain substantial. The new structured XML pipeline needs live deployment verification; the existing Atorvastatin label came from the prior FDA-backed enrichment path.

## Tests actually performed vs pending

Executed read-only database count, duplicate-RxCUI, mapping and permission queries; exact/prefix/typo/brand database search checks for Lisinopril, Metformin, Atorvastatin, Lisinproil and Lipitor. Retrieved live Clinical Tables responses for Lisinopril, Metformin, Atorvastatin, Losartan, Semaglutide and Lipitor, demonstrating separate strengths/routes and their real product codes. Retrieved RxNorm approximate matching confirming Lisinproil -> Lisinopril.

Added pure positional-parser/illustration assertions and extended read-only SQL regression/completion checks. **These new TypeScript checks were not executed**, because this editing session has no command/test runner.

Physical iPhone/Android/tablet layout tests, actual medication-save UI tests, browser/native build checks, full SPL matching tests, licensed-photo loading and YouTube regional/fullscreen playback tests remain **unverified**. No fabricated success claims are made for them.
