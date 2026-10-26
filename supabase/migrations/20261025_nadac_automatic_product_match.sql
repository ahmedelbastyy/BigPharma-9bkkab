-- NADAC shared product matches and independent source burst protection. No prescription rows changed.
create table if not exists public.nadac_product_matches (
 match_key text primary key, product_rxcui text not null,
 payload jsonb not null check(pg_column_size(payload)<95000), dataset_modified text not null,
 checked_at timestamptz not null default now(), next_check_at timestamptz not null
);
alter table public.nadac_product_matches enable row level security;
revoke all on public.nadac_product_matches from anon,authenticated;
grant all on public.nadac_product_matches to service_role;
create table if not exists public.nadac_request_windows (
 user_id uuid not null references public.user_profiles(id) on delete cascade,
 window_start timestamptz not null,requests integer not null default 0,
 primary key(user_id,window_start)
);
alter table public.nadac_request_windows enable row level security;
revoke all on public.nadac_request_windows from anon,authenticated;
grant all on public.nadac_request_windows to service_role;
create or replace function public.claim_nadac_request(p_owner uuid) returns boolean
language plpgsql security definer set search_path=public,pg_temp as $$
declare n integer;
begin
 if coalesce(auth.role(),'')<>'service_role' then raise exception 'Server access required'; end if;
 insert into public.nadac_request_windows(user_id,window_start,requests)
 values(p_owner,date_trunc('minute',now()),1)
 on conflict(user_id,window_start) do update set requests=nadac_request_windows.requests+1
 where nadac_request_windows.requests<40 returning requests into n;
 return found;
end $$;
revoke all on function public.claim_nadac_request(uuid) from public,anon,authenticated;
grant execute on function public.claim_nadac_request(uuid) to service_role;
