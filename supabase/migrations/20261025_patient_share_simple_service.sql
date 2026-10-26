-- Simplify the existing sharing service: quota-free creation and independent synthetic QA.
-- No new tables, public policies, credentials, approval workflows or existing-row changes.
begin;

-- Keep the authoritative four-argument patient creator and remove any legacy quota branches.
do $$ declare definition text;changed text;begin
 definition:=pg_get_functiondef('public.create_patient_share_v2(uuid,text,text[],integer)'::regprocedure);
 changed:=regexp_replace(definition,'if \(select count\(\*\) from public.patient_share_invitations where user_id=p_actor and created_at>clock_timestamp\(\)-interval ''1 hour''\)>=10 then return jsonb_build_object\(''error'',''RATE_LIMITED''\);end if;','');
 changed:=regexp_replace(changed,'if \(select count\(\*\) from public.patient_share_invitations where user_id=p_actor and revoked_at is null and expires_at>clock_timestamp\(\)\)>=5 then return jsonb_build_object\(''error'',''ACTIVE_INVITATION_LIMIT''\);end if;','');
 if position('RATE_LIMITED' in changed)>0 or position('ACTIVE_INVITATION_LIMIT' in changed)>0 then raise exception 'Unknown invitation quota branch; migration stopped';end if;
 if changed<>definition then execute changed;end if;
end $$;

-- Normal creation reuses existing real-account validation. Explicit QA invitations are inserted
-- as fictional from the beginning: never read real profile/medication records, never relabel rows.
create or replace function public.create_patient_share_v2(p_actor uuid,p_hash text,p_scopes text[],p_minutes integer,p_dataset text) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare i public.patient_share_invitations;legacy text[];issued timestamptz;result jsonb;
begin
 if coalesce(auth.role(),'')<>'service_role' then raise exception 'Server authorization required';end if;
 if p_dataset='patient' then
  result:=public.create_patient_share_v2(p_actor,p_hash,p_scopes,p_minutes);
  if result ? 'error' then return result;end if;
  return result||jsonb_build_object('data_class','patient');
 end if;
 if p_dataset is distinct from 'synthetic_demo_v1' or p_actor is null or p_hash is null or p_hash !~ '^[a-f0-9]{64}$'
  or p_minutes is null or p_minutes not in (5,15,30,60) or p_scopes is null
  or cardinality(p_scopes) not between 1 and 5 or not(p_scopes<@array['profile','medications','schedule','adherence','activity']::text[])
  or array_position(p_scopes,null) is not null or not('profile'=any(p_scopes))
  or cardinality(p_scopes)<>(select count(distinct x) from unnest(p_scopes) x)
 then return jsonb_build_object('error','INVALID_REQUEST');end if;
 if not exists(select 1 from public.user_profiles p join auth.users u on u.id=p.id where p.id=p_actor and u.email_confirmed_at is not null)
 then return jsonb_build_object('error','SIGN_IN_REQUIRED');end if;
 select array_agg(distinct s) into legacy from unnest(p_scopes) s where s in ('medications','schedule','adherence');
 issued:=clock_timestamp();
 insert into public.patient_share_invitations(user_id,token_hash,scopes,sharing_scopes,sharing_version,created_at,expires_at,identity_consented_at,data_class)
 values(p_actor,p_hash,coalesce(legacy,array['medications']),p_scopes,2,issued,issued+make_interval(mins=>p_minutes),issued,'synthetic_demo_v1') returning * into i;
 insert into public.patient_share_access_log(invitation_id,user_id,actor_id,action) values(i.id,p_actor,p_actor,'issued');
 return jsonb_build_object('id',i.id,'scopes',i.sharing_scopes,'created_at',i.created_at,'expires_at',i.expires_at,
  'identity_consented_at',i.identity_consented_at,'data_class',i.data_class,'server_now',clock_timestamp());
end $$;
revoke all on function public.create_patient_share_v2(uuid,text,text[],integer,text) from public,anon,authenticated;
grant execute on function public.create_patient_share_v2(uuid,text,text[],integer,text) to service_role;
notify pgrst,'reload schema';
commit;
