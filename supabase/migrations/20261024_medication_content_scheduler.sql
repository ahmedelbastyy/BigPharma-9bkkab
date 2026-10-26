-- Optional supported scheduler activation. Does not change prescriptions, auth or approved content.
-- OnSpace tenant restriction: pg_cron can only be installed in database postgres.
-- This migration deliberately leaves scheduling INACTIVE when cron/net are unavailable.
create table if not exists public.medication_content_scheduler_state (
 id boolean primary key default true check(id), enabled boolean not null default false,
 last_dispatched_at timestamptz, last_error text
);
alter table public.medication_content_scheduler_state enable row level security;
revoke all on public.medication_content_scheduler_state from anon,authenticated;
grant select,insert,update on public.medication_content_scheduler_state to service_role;
insert into public.medication_content_scheduler_state(id,last_error) values(true,'Required pg_cron/pg_net scheduler APIs are unavailable in this tenant') on conflict do nothing;
create or replace function public.dispatch_bigpharma_content_tick() returns bigint language plpgsql security definer set search_path=public,pg_temp as $$
declare capability uuid; request_id bigint;
begin
 if to_regprocedure('net.http_get(text,jsonb,jsonb,integer)') is null then
  raise exception 'Supported pg_net HTTP dispatcher is unavailable';
 end if;
 insert into public.medication_content_worker_access(expires_at) values(now()+interval '3 minutes') returning id into capability;
 execute 'select net.http_get(url := $1, timeout_milliseconds := 55000)' into request_id using
 'https://ibmovdnyqtzlbxtuibmo.backend.onspace.ai/functions/v1/medication-content?access='||capability::text||'&scheduled=1&remaining=2';
 update public.medication_content_scheduler_state set last_dispatched_at=now(),last_error=null where id=true;
 return request_id;
end $$;
revoke all on function public.dispatch_bigpharma_content_tick() from public,anon,authenticated;
grant execute on function public.dispatch_bigpharma_content_tick() to service_role;
do $$
begin
 if to_regprocedure('cron.schedule(text,text,text)') is not null and to_regprocedure('net.http_get(text,jsonb,jsonb,integer)') is not null then
  perform cron.schedule('bigpharma-content-every-minute','* * * * *','select public.dispatch_bigpharma_content_tick()');
  update public.medication_content_scheduler_state set enabled=true,last_error=null where id=true;
 else
  raise notice 'Scheduling remains inactive; platform administrator must supply supported cron and net APIs';
 end if;
end $$;
