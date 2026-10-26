-- Remove email-based sharing roles in the existing authorization helper only.
-- No patient rows, invitations, grants, scopes or deadlines are modified.
begin;
create or replace function public.patient_share_professional_approved(p_actor uuid) returns boolean
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare until_time timestamptz;mode text:=current_setting('request.bigpharma_connect_mode',true);begin
 if coalesce(auth.role(),'')<>'service_role' or p_actor is null or current_setting('request.bigpharma_connect_actor',true) is distinct from p_actor::text then return false;end if;
 begin until_time:=nullif(current_setting('request.bigpharma_connect_until',true),'')::timestamptz;exception when others then return false;end;
 if until_time is null or until_time<=clock_timestamp() or mode is null or mode not in ('professional','synthetic_only') then return false;end if;
 -- Mode is installed only by the restricted dispatcher after trusted server verification.
 -- Email identifies an authenticated account, never its authorization level.
 return exists(select 1 from auth.users u join public.user_profiles p on p.id=u.id where u.id=p_actor and u.email_confirmed_at is not null and length(coalesce(u.encrypted_password,''))>0);
end $$;
revoke all on function public.patient_share_professional_approved(uuid) from public,anon,authenticated;
grant execute on function public.patient_share_professional_approved(uuid) to service_role;
notify pgrst,'reload schema';
commit;
