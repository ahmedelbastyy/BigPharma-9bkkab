-- Fast shared guide processing: durable discovery queue, bounded leases and read-only status metadata.
-- Existing authentication, prescriptions, approved profiles and source references are preserved.
alter table public.medication_content_jobs add column if not exists stage text not null default 'queued';
alter table public.medication_content_jobs add column if not exists progress jsonb not null default '{}'::jsonb;
alter table public.medication_content_jobs add column if not exists priority integer not null default 0;
alter table public.medication_content_jobs add column if not exists revision_token uuid;
-- Revision token remains fixed across retries, so explicit refresh never overwrites an approval.
create or replace function public.request_bigpharma_content_revision(product_id uuid) returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform pg_advisory_xact_lock(91261025);
 if exists(select 1 from public.medication_content_jobs where medication_id=product_id and status='generating' and lease_until>now()) then return false; end if;
 insert into public.medication_content_jobs(medication_id,status,kind,attempts,stage,revision_token) values(product_id,'pending','forced',0,'queued',gen_random_uuid()) on conflict(medication_id) do update set status='pending',kind='forced',attempts=0,stage='queued',revision_token=gen_random_uuid(),next_attempt_at=now(),lease_token=null,lease_until=null,progress='{}'::jsonb,last_error=null;
 return true;
end $$;
revoke all on function public.request_bigpharma_content_revision(uuid) from public,anon,authenticated;
grant execute on function public.request_bigpharma_content_revision(uuid) to service_role;
create or replace function public.enqueue_catalog_patient_content() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if new.retired or new.suppressed is true then return new; end if;
 insert into public.medication_content_jobs(medication_id,priority) values(new.id,case when new.full_name ~* 'losartan|lisinopril|metformin|atorvastatin|amlodipine|omeprazole' then 100 else 0 end) on conflict(medication_id) do nothing;
 return new;
end $$;
do $$ begin if not exists(select 1 from pg_trigger where tgname='enqueue_catalog_patient_content' and tgrelid='public.medication_catalog_products'::regclass) then create trigger enqueue_catalog_patient_content after insert on public.medication_catalog_products for each row execute function public.enqueue_catalog_patient_content(); end if; end $$;
revoke all on function public.enqueue_catalog_patient_content() from public,anon,authenticated;
create or replace function public.recover_medication_content_leases() returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare recovered integer;
begin
 update public.medication_content_jobs set status='failed',stage='lease_expired',lease_token=null,lease_until=null,last_error='Worker lease expired before committing a result; persisted checkpoints retained',next_attempt_at=now(),updated_at=now() where status='generating' and (lease_until is null or lease_until<now());
 get diagnostics recovered=row_count;return recovered;
end $$;
revoke all on function public.recover_medication_content_leases() from public,anon,authenticated;
grant execute on function public.recover_medication_content_leases() to service_role;
create or replace function public.claim_medication_content_job(requested_product uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare j public.medication_content_jobs;
begin
 perform pg_advisory_xact_lock(91261025);
 perform public.recover_medication_content_leases();
 if (select count(*) from public.medication_content_jobs where status='generating' and lease_until>now())>=2 then return null; end if;
 select q.* into j from public.medication_content_jobs q join public.medication_catalog_products p on p.id=q.medication_id where (requested_product is null or q.medication_id=requested_product) and q.attempts<3 and q.next_attempt_at<=now() and q.status in ('pending','failed') and not p.retired and p.suppressed is not true order by (p.rxcui in ('979492','311353','205326','617312','861007','197361','199119')) desc,q.priority desc,q.next_attempt_at,q.medication_id for update of q skip locked limit 1;
 if not found then return null; end if;
 update public.medication_content_jobs set status='generating',stage='source',attempts=attempts+1,lease_token=gen_random_uuid(),lease_until=now()+interval '2 minutes',updated_at=now() where medication_id=j.medication_id returning * into j;
 return to_jsonb(j);
end $$;
revoke all on function public.claim_medication_content_job(uuid) from public,anon,authenticated;
grant execute on function public.claim_medication_content_job(uuid) to service_role;
create or replace function public.medication_content_preparation_state(product_id uuid) returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select jsonb_build_object('status',case when j.status='generating' and coalesce(j.lease_until,now())<=now() then 'failed' else coalesce(j.status,'missing') end,'attempts',coalesce(j.attempts,0),'stage',j.stage,'source_changed',coalesce(j.source_changed,false),'safety_review_required',coalesce(j.safety_review_required,false),'updated_at',j.updated_at,'approved_version',(select c.id from public.medication_content c where c.medication_id=product_id and c.status='approved' order by c.reviewed_at desc nulls last,c.generated_at desc,c.id limit 1),'retry_exhausted',coalesce(j.attempts,0)>=3,'scheduler_active',exists(select 1 from pg_extension where extname='pg_cron')) from (select product_id as id) p left join public.medication_content_jobs j on j.medication_id=p.id;
$$;
revoke all on function public.medication_content_preparation_state(uuid) from public,anon;
grant execute on function public.medication_content_preparation_state(uuid) to authenticated,service_role;
insert into public.medication_content_jobs(medication_id,priority) select id,case when full_name ~* 'losartan|lisinopril|metformin|atorvastatin|amlodipine|omeprazole' then 100 else 0 end from public.medication_catalog_products where not retired and suppressed is not true on conflict(medication_id) do nothing;
