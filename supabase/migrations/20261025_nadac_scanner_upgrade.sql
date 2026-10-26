-- Server-only CMS benchmark caches and isolated scanner rate protection.
-- No existing prescription, schedule, permission, or reminder rows are modified.
create table if not exists public.nadac_benchmarks (ndc text primary key check(ndc ~ '^[0-9]{11}$'), payload jsonb not null check(pg_column_size(payload)<100000), effective_date date, as_of_date date, pricing_unit text, source text not null, retrieved_at timestamptz not null default now(), checked_at timestamptz not null default now(), next_check_at timestamptz not null);
alter table public.nadac_benchmarks enable row level security;
revoke all on public.nadac_benchmarks from anon,authenticated;
grant all on public.nadac_benchmarks to service_role;
create table if not exists public.nadac_release_state (id boolean primary key default true check(id), dataset_id text not null, payload jsonb not null, checked_at timestamptz not null, next_check_at timestamptz not null);
alter table public.nadac_release_state enable row level security;
revoke all on public.nadac_release_state from anon,authenticated;
grant all on public.nadac_release_state to service_role;
create table if not exists public.scanner_request_windows (user_id uuid not null references public.user_profiles(id) on delete cascade, window_start timestamptz not null, requests integer not null default 0, primary key(user_id,window_start));
alter table public.scanner_request_windows enable row level security;
revoke all on public.scanner_request_windows from anon,authenticated;
grant all on public.scanner_request_windows to service_role;
create or replace function public.consume_bigpharma_scan_request(request_user uuid) returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare w timestamptz:=date_trunc('minute',now()); n integer;
begin
 if coalesce(auth.role(),'')<>'service_role' then raise exception 'Server access required'; end if;
 perform pg_advisory_xact_lock(hashtextextended('scan:'||request_user::text,0));
 select coalesce(sum(requests),0) into n from public.scanner_request_windows where user_id=request_user and window_start>=date_trunc('day',now());
 if n>=60 then return false; end if;
 insert into public.scanner_request_windows(user_id,window_start,requests) values(request_user,w,1) on conflict(user_id,window_start) do update set requests=scanner_request_windows.requests+1 where scanner_request_windows.requests<6 returning requests into n;
 return found;
end $$;
revoke all on function public.consume_bigpharma_scan_request(uuid) from public,anon,authenticated;
grant execute on function public.consume_bigpharma_scan_request(uuid) to service_role;
