-- Read-only regression and completion checks for the ACTUAL BigPharma catalog.
-- Run in Cloud SQL tooling as the project owner; these queries do not alter patient data.
-- Whole-release completion requires monthly ZIP records, not old API bootstrap or manually entered identities.
select source_version,release_url,source_count,cursor,processed,added,updated_records,status,
       status='completed' and processed=source_count and release_url like '%RxTerms%.zip' as full_monthly_release_verified
from public.medication_rxterms_imports order by created_at desc;
select count(*) as product_identities,
       count(distinct rxcui) as unique_product_rxcuis,
       count(*)=count(distinct rxcui) as no_duplicate_products
from public.medication_catalog_products;

select count(*) as all_unique_identities, count(*)>=500 as target_reached
from (select rxcui from public.medication_catalog union select rxcui from public.medication_catalog_products) verified;

select 'lisinopril' as search, generic_name,rxcui,spelling_suggestion from public.search_bigpharma_medications('Lisinopril')
union all select 'metformin',generic_name,rxcui,spelling_suggestion from public.search_bigpharma_medications('Metformin')
union all select 'atorvastatin',generic_name,rxcui,spelling_suggestion from public.search_bigpharma_medications('Atorvastatin')
union all select 'misspelling',generic_name,rxcui,spelling_suggestion from public.search_bigpharma_medications('Lisinproil')
union all select 'brand',generic_name,rxcui,spelling_suggestion from public.search_bigpharma_medications('Eylea');

select not has_function_privilege('authenticated','public.commit_bigpharma_rxterms_batch(uuid,uuid,integer,jsonb)','execute') as users_cannot_import,
       not has_function_privilege('authenticated','public.claim_bigpharma_rxterms(uuid,text)','execute') as users_cannot_claim;

select id,baseline,target,cursor,added,status,last_error,source_count
from public.medication_rxterms_imports order by created_at desc;
select count(*) as saved_medications_preserved from public.user_medications;
select count(*) as preserved_records_mapped from public.medication_catalog_saved_links;
select count(distinct product_id) as verified_label_products from public.medication_catalog_product_labels where content->>'clinicalDataStatus'='exact_product_label';
select review_status,image_type,count(*) from public.medication_product_media group by review_status,image_type;
select not has_function_privilege('anon','public.review_rxterms_media(uuid,text,text,text,text,text,text,text)','execute') as anonymous_cannot_review_media;
