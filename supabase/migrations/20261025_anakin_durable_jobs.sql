-- Durable secure Anakin jobs and signed delivery receipts. No medication/profile/reminder rows are modified.
alter table public.anakin_wire_jobs add column if not exists input_params jsonb not null default '{}'::jsonb;
alter table public.anakin_wire_jobs add column if not exists poll_attempts integer not null default 0;
alter table public.anakin_wire_jobs add column if not exists lease_token uuid;
alter table public.anakin_wire_jobs add column if not exists lease_until timestamptz;
alter table public.anakin_wire_jobs add column if not exists http_status integer;
alter table public.anakin_wire_jobs add column if not exists provider_error text;
alter table public.anakin_wire_jobs add column if not exists poll_url text;
alter table public.anakin_wire_jobs add column if not exists webhook_enabled boolean not null default false;
create index if not exists anakin_provider_job_lookup on public.anakin_wire_jobs(provider_job_id);
create table if not exists public.anakin_webhook_deliveries(delivery_id text primary key,job_id uuid not null references public.anakin_wire_jobs(id),event_type text not null,received_at timestamptz not null default now(),processed_at timestamptz);
alter table public.anakin_webhook_deliveries enable row level security;
-- Delivery receipt writes and reads are exclusively server-owned.
revoke all on public.anakin_webhook_deliveries from anon,authenticated;
grant all on public.anakin_webhook_deliveries to service_role;
create or replace function public.reserve_anakin_job(p_owner uuid,p_hash text,p_action text,p_params jsonb,p_product text,p_credits integer) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare j public.anakin_wire_jobs; n integer;
begin
 if coalesce(auth.role(),'') <> 'service_role' then raise exception 'Server access required'; end if;
 -- One owner lock serializes fingerprint deduplication, credit allowance and concurrent reservations.
 perform pg_advisory_xact_lock(hashtextextended(p_owner::text,0));
 select * into j from public.anakin_wire_jobs where user_id=p_owner and request_hash=p_hash and ((status='completed' and result_json is not null and expires_at>now()) or status in ('submitting','processing','uncertain') or (status='failed' and created_at>now()-interval '10 minutes')) order by created_at desc limit 1;
 if found then return jsonb_build_object('fresh',false,'job',to_jsonb(j)); end if;
 select coalesce(sum(credits_estimated),0) into n from public.anakin_wire_jobs where user_id=p_owner and created_at>now()-interval '1 hour';
 if n+p_credits>40 then raise exception 'Usage limit'; end if;
 select count(*) into n from public.anakin_wire_jobs where user_id=p_owner and status in ('processing','submitting','uncertain');
 if n>=2 then raise exception 'Concurrency limit'; end if;
 insert into public.anakin_wire_jobs(user_id,request_hash,action_id,input_params,product_rxcui,request_target,credits_estimated,status) values(p_owner,p_hash,p_action,p_params,p_product,coalesce(p_params->>'drug',p_params->>'condition',p_params->>'query'),p_credits,'submitting') returning * into j;
 return jsonb_build_object('fresh',true,'job',to_jsonb(j));
end $$;
revoke all on function public.reserve_anakin_job(uuid,text,text,jsonb,text,integer) from public,anon,authenticated;
grant execute on function public.reserve_anakin_job(uuid,text,text,jsonb,text,integer) to service_role;
create or replace function public.lease_anakin_job(p_id uuid,p_force boolean default false) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare j public.anakin_wire_jobs;
begin
 if coalesce(auth.role(),'') <> 'service_role' then raise exception 'Server access required'; end if;
 update public.anakin_wire_jobs set lease_token=gen_random_uuid(),lease_until=now()+interval '20 seconds',poll_attempts=poll_attempts+1 where id=p_id and status='processing' and (lease_until is null or lease_until<now()) and (p_force or next_poll_at is null or next_poll_at<=now()) returning * into j;
 return case when found then to_jsonb(j) else null end;
end $$;
revoke all on function public.lease_anakin_job(uuid,boolean) from public,anon,authenticated;
grant execute on function public.lease_anakin_job(uuid,boolean) to service_role;
