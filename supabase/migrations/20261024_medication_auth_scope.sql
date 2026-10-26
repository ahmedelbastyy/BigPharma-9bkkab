-- Application trigger privilege repair for 42501 permission denied for schema auth.
-- No managed authentication tables/ACLs or patient records are modified.
alter function public.refresh_calendar_after_prescription() security definer;
alter function public.refresh_calendar_after_prescription() set search_path = public, pg_temp;
alter function public.append_bigpharma_reminders(uuid,jsonb) security definer;
alter function public.append_bigpharma_reminders(uuid,jsonb) set search_path = public, pg_temp;
do $$ declare definition text; begin
 select pg_get_functiondef('public.append_bigpharma_reminders(uuid,jsonb)'::regprocedure) into definition;
 definition:=replace(definition,'if owner is null or owner <> auth.uid()','if auth.uid() is null or owner is null or owner <> auth.uid()');
 execute definition;
end $$;
revoke all on function public.refresh_calendar_after_prescription() from public,anon,authenticated;
revoke all on function public.append_bigpharma_reminders(uuid,jsonb) from public,anon;
grant execute on function public.append_bigpharma_reminders(uuid,jsonb) to authenticated;
