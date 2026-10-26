# BigPharma clinical information repair — October 24, 2026

## Confirmed root causes

1. At diagnosis, 102 clinical products existed but only **2 products had label records** (5 label rows); 100 products had no associated clinical information. RxTerms is terminology, not a clinical labeling database.
2. The SPL parser required `section.text`. Many Physician Labeling Rule parent sections contain their actual narrative inside `component/section` children. This dropped indications, administration and adverse reactions despite successful XML HTTP requests.
3. The LOINC mapping was incorrect: 34069-5 (How Supplied) was assigned to contraindications; 34070-3 (Contraindications) was assigned to warnings; 34082-8 (Geriatric Use) was assigned to clinical pharmacology; other population mappings were also incorrect. The corrected map uses FDA's official section-heading table.
4. Enrichment was only invoked by a manual button. Opening an unenriched product did not retrieve its clinical data.
5. The previous pipeline treated openFDA harmonization as mandatory, although a verified DailyMed product-associated label can exist without that FDA RxCUI mapping. One existing candidate recorded an actual openFDA 404.
6. The old worker accepted GET action/jobId but discarded productId and RxCUI. An actual diagnostic GET returned 404 `Product not found`. The new batch action returned 400 `Unknown release action` from the previous deployed protocol. These were request/protocol problems, not evidence of memory exhaustion.

**Permissions were not the demonstrated problem:** authenticated users have SELECT privilege and an enabled SELECT policy on product labels. Existing product foreign keys and the saved Atorvastatin link were valid. Database assertions found no orphan labels.

## Five product traces and actual persisted repair

All five products use exact clinical RxCUIs, not their ingredient RxCUIs. Clinical information is stored in the existing `medication_catalog_product_labels.content.sections` object and linked by `product_id`.

| Medication/product | RxCUI | DailyMed SETID | Actual SPL version | Populated sections | Status |
|---|---|---|---|---:|---|
| Atorvastatin 10 mg oral tablet | 617312 | d9adb9e4-c495-9530-e5e3-7e3b01d53e4c | 35 | 9 | Enriched |
| Lisinopril 30 mg oral tablet | 205326 | 0e6364a4-6d66-4151-8197-d45e2a762895 | 27 | 10 | Enriched |
| Metformin hydrochloride 500 mg oral tablet | 861007 | 5073c482-952c-400c-afff-64380f133bc8 | 4 | 9 | Partial |
| Amlodipine 5 mg oral tablet | 197361 | 204f27e9-5041-4677-b313-866ca69abad9 | 18 | 8 | Partial |
| Omeprazole 10 mg delayed-release oral capsule | 199119 | c5af5f4b-17be-7245-b281-f27c87831242 | 7 | 7 | Partial |

**Actually inserted: 5 corrected profiles, 43 nonempty clinical sections.** All five contain distinct uses, adverse reactions, warnings, contraindications, label-supported interactions and administration excerpts. Each section has an actual DailyMed citation, verification timestamp and label update date. Atorvastatin and Lisinopril also have verified storage passages. Storage for the other three was not present in the excerpts accessible during this session and was not invented. The partial statuses also distinguish additional missing mechanism/education fields from populated core sections.

The five repairs are manually reviewed original-label excerpts from the actual public DailyMed responses, **not a claim that the new automated XML worker already processed five products**. Existing incorrect parser output is retained for audit; append-only review revisions have a local `:reviewed-v1` suffix and separately preserve the genuine SPL version in `content.labelVersion`. The frontend shows that genuine version. No patient records were added or edited by these imports.

### Verified sources read

- FDA LOINC map: https://www.fda.gov/industry/structured-product-labeling-resources/section-headings-loinc
- Exact RxTerms allinfo for 861007, 197361 and 199119, along with existing verified identities for 617312 and 205326.
- DailyMed product-RxCUI listings for Lisinopril, Metformin, Amlodipine and Omeprazole; matching label pages were opened and their clinical sections reviewed.
- https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=d9adb9e4-c495-9530-e5e3-7e3b01d53e4c
- https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=0e6364a4-6d66-4151-8197-d45e2a762895
- https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=5073c482-952c-400c-afff-64380f133bc8
- https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=204f27e9-5041-4677-b313-866ca69abad9
- https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=c5af5f4b-17be-7245-b281-f27c87831242
- An exact SETID/RxCUI openFDA query returned real Omeprazole indications and administration data. A separate Metformin label query returned HTTP 200 with **zero DailyMed records**, demonstrating why HTTP success is not proof of matching content.

## Data flow after repair

1. RxTerms/Clinical Tables still identify the selected exact clinical product.
2. `loadMedicationProfile` follows saved product links, reads existing labels and enrichment status, and ranks validated content above faulty old parser output.
3. All sections come from one selected reference label. Content from different manufacturers/versions is not silently combined.
4. `clinicalContentService` explicitly maps source fields to Overview, Uses, Side Effects, Warnings, Contraindications, Interactions, How to Take, Storage and additional sections. Dates and citations survive the transformation.
5. The detail hook automatically retrieves clinical labeling for an unvalidated product on open. Request errors remain visible; users can retry and continue through candidate pages.
6. Old misclassified parser output is not rendered as trusted facts. Missing fields are summarized as genuine source gaps rather than empty accordion bodies.

## Corrected backend pipeline

- FDA-correct LOINC headings, nested section traversal, entity handling, valid XML checks, SETID/version extraction and explicit openFDA field transformation.
- Product association verified using DailyMed's product RxCUI listing, exact SPL strength/form/ingredient evidence and, when available, harmonized FDA RxCUI/SETID/brand/route evidence. Uncertain candidates remain pending; they are not falsely attached.
- XML originals remain in private Storage; bounded clinical excerpts and per-section provenance stay in PostgreSQL.
- Database status synchronization derives Enriched/Partial from stored fields, not merely HTTP 200.
- Existing catalog is queued in `medication_clinical_enrichment`. A protected backend worker claims **one product per invocation**, processes a bounded candidate page, persists failures and checkpoints, and supports background continuations plus resume. The existing Medication Library panel starts the worker and shows actual status counts. This is not an installed monthly scheduler.

## Imagery and videos

DailyMed media responses for Omeprazole, Amlodipine and Metformin were actually retrieved; four real source assets were inserted into the existing uncertain-media queue. These are **not approved photographs**. Chemical diagrams and product packaging remain distinct, and no unknown license was assumed. Patient pages retain labeled generic illustrations unless an approved image matches the recorded NDC and selected SETID.

Video retrieval now receives the saved RxCUI so the existing conservative ingredient/route matching can run. Existing approved videos are preserved. No unrelated videos or new video IDs were invented.

## Verification and remaining limits

Executed database assertions verified all five products have nonempty distinct clinical content, per-section citations/dates, valid foreign keys and protected worker permissions. Final actual counts: **106 clinical products; 5 validated profiles; 43 populated clinical sections; 2 Enriched and 3 Partial profiles; 99 Pending queue entries; 0 Failed queue entries; 0 approved photographs; 1 existing approved video resource; 4 saved records present and untouched.** A total of 101 products still lack validated repaired profiles; two products added while the session was active will enter the next catalog-wide queue pass. The 0 Failed count does not mean attempted worker calls succeeded—the old-protocol HTTP errors are reported separately. The TypeScript transformation checks and XML nesting/LOINC fixtures were written but **not run**: this editing session has no command/test runner. No browser screenshot tool or physical-device runner was available, so rendered screen, save-flow and small-iPhone tests are **not claimed as executed**.

The live function still reported `monthly-release-v2` when tested before publication. A call to actually start catalog enrichment returned 400 `Unknown release action` from that old deployment. **The remaining full-catalog automated enrichment was attempted but is not verified as executed.** The five source-backed data repairs were inserted directly instead of waiting for worker publication. The new worker must be verified after publication and resumed for the remaining catalog.

Do not read Pending as successfully enriched, or read missing interaction content as “no interactions.” Source availability, manufacturer-specific references, label revisions, licensed photographs and curated video coverage remain independent limitations.
