-- Synthetic-only Connect testing and unlimited application-level QR operations.
-- Existing medical/account rows are never reclassified. Synthetic data is a fixed fixture,
-- not a projection of the owner's cabinet, identity, photos or clinical history.
begin;
alter table public.patient_share_invitations add column if not exists data_class text not null default 'patient' check(data_class in ('patient','synthetic_demo_v1'));
comment on column public.patient_share_invitations.data_class is 'Immutable invitation dataset: patient records or fixed fictional demo. A browser cannot label cabinet records synthetic.';

-- Preserve the existing four-argument create API, removing only invitation quotas.
do $$ declare definition text;changed text;begin
 definition:=pg_get_functiondef('public.create_patient_share_v2(uuid,text,text[],integer)'::regprocedure);
 changed:=regexp_replace(definition,'if \(select count\(\*\) from public.patient_share_invitations where user_id=p_actor and created_at>clock_timestamp\(\)-interval ''1 hour''\)>=10 then return jsonb_build_object\(''error'',''RATE_LIMITED''\);end if;','');
 changed:=regexp_replace(changed,'if \(select count\(\*\) from public.patient_share_invitations where user_id=p_actor and revoked_at is null and expires_at>clock_timestamp\(\)\)>=5 then return jsonb_build_object\(''error'',''ACTIVE_INVITATION_LIMIT''\);end if;','');
 if position('RATE_LIMITED' in changed)>0 or position('ACTIVE_INVITATION_LIMIT' in changed)>0 then raise exception 'Unrecognized invitation quota definition';end if;
 execute changed;
end $$;
create or replace function public.claim_patient_share_request(p_actor uuid,p_group text) returns boolean
language plpgsql security definer set search_path=public,pg_temp as $$ begin
 if coalesce(auth.role(),'')<>'service_role' then raise exception 'Server authorization required';end if;
 -- No per-minute/hour/active-invitation application quotas. JWT/consent/proof/nonce checks remain.
 return p_actor is not null and p_group in ('create','redeem','read','status','review','revoke','photo');
end $$;
revoke all on function public.claim_patient_share_request(uuid,text) from public,anon,authenticated;
grant execute on function public.claim_patient_share_request(uuid,text) to service_role;

-- Explicit dataset creation uses the same invitations, consent, hashing and expiration.
-- Only a newly inserted invitation is assigned the demo class, in the same transaction.
create or replace function public.create_patient_share_v2(p_actor uuid,p_hash text,p_scopes text[],p_minutes integer,p_dataset text) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$ declare result jsonb;begin
 if coalesce(auth.role(),'')<>'service_role' then raise exception 'Server authorization required';end if;
 if p_dataset is null or p_dataset not in ('patient','synthetic_demo_v1') then return jsonb_build_object('error','INVALID_REQUEST');end if;
 result:=public.create_patient_share_v2(p_actor,p_hash,p_scopes,p_minutes);
 if result ? 'error' then return result;end if;
 if p_dataset='synthetic_demo_v1' then
  update public.patient_share_invitations set data_class=p_dataset where id=(result->>'id')::uuid and user_id=p_actor;
 end if;
 return result||jsonb_build_object('data_class',p_dataset);
end $$;
revoke all on function public.create_patient_share_v2(uuid,text,text[],integer,text) from public,anon,authenticated;
grant execute on function public.create_patient_share_v2(uuid,text,text[],integer,text) to service_role;

-- A pure, visibly fictional fixture. No patient table, auth metadata or storage is read here.
create or replace function public.patient_share_synthetic_payload(p_scopes text[],p_section text,p_days integer,p_asof timestamptz,p_before timestamptz default null) returns jsonb
language plpgsql immutable set search_path=public,pg_temp as $$
declare result jsonb:='{}';day date:=(p_asof at time zone 'UTC')::date-1;start_at timestamptz:=(((p_asof at time zone 'UTC')::date-(p_days-1))::timestamp at time zone 'UTC');med jsonb;dose_history jsonb;events jsonb;begin
 result:=jsonb_build_object('data_class','synthetic_demo_v1','synthetic',true);
 if 'profile'=any(p_scopes) and p_section in ('all','profile') then result:=result||jsonb_build_object('profile',jsonb_build_object('display_name','Synthetic Demo Patient','email','synthetic.patient@example.invalid','photo_available',false));end if;
 med:=jsonb_build_object('id','11111111-1111-4111-8111-111111111111','name','Synthetic medication A','generic_name',null,'brand_name',null,'strength','Demo only','form','Demo tablet','rxcui',null,'status','active','paused',false);
 if 'medications'=any(p_scopes) and p_section in ('all','medications') then result:=result||jsonb_build_object('medications',jsonb_build_array(med));end if;
 if 'schedule'=any(p_scopes) and p_section in ('all','schedule') then result:=result||jsonb_build_object('schedule',jsonb_build_array(jsonb_build_object('medication_id',med->>'id','dose_quantity',1,'quantity_unit','tablets','paused',false,'schedule','Three Times Daily','reminder_times',jsonb_build_array('09:00','15:00','21:00'),'recurrence',jsonb_build_object('kind','daily','timezone','UTC','startDate',day,'times',jsonb_build_array('09:00','15:00','21:00'),'weekdays',jsonb_build_array(),'intervalHours',null,'intervalDays',null))||case when 'medications'=any(p_scopes) then jsonb_build_object('name',med->>'name','strength','Demo only','form','Demo tablet','rxcui',null,'directions','Fictional schedule for testing only. Not medical advice.') else jsonb_build_object('directions_redacted',true) end));end if;
 if 'adherence'=any(p_scopes) and p_section in ('all','adherence') then
  select coalesce(jsonb_agg(jsonb_build_object('id',case n when 1 then '22222222-2222-4222-8222-222222222221' when 2 then '22222222-2222-4222-8222-222222222222' else '22222222-2222-4222-8222-222222222223' end,'medication_id',med->>'id','scheduled_at',instant,'scheduled_date',day,'scheduled_time',time_text,'completed',n<3,'skipped',n=3,'completed_at',case when n<3 then instant else null end) order by instant desc),'[]'::jsonb) into dose_history from (select n,(day+make_time(3+6*n,0,0)) at time zone 'UTC' instant,lpad((3+6*n)::text,2,'0')||':00' time_text from generate_series(1,3) n) d where p_before is null or instant<p_before;
  result:=result||jsonb_build_object('adherence',jsonb_build_object('days',p_days,'timezone','UTC','as_of',p_asof,'daily',jsonb_build_array(jsonb_build_object('date',day,'eligible',3,'taken',2,'skipped',1,'unrecorded',0,'recorded_near_time',2)),'totals',jsonb_build_object('eligible',3,'taken',2,'skipped',1,'unrecorded',0,'recorded_near_time',2),'percent',67),'dose_history',dose_history);
 end if;
 if 'activity'=any(p_scopes) and p_section in ('all','activity') then
  events:=case when p_before is not null and (day+time '08:00') at time zone 'UTC'>=p_before then '[]'::jsonb else jsonb_build_array(jsonb_build_object('id','33333333-3333-4333-8333-333333333333','medication_id',med->>'id','kind','added','created_at',(day+time '08:00') at time zone 'UTC')||case when 'medications'=any(p_scopes) then jsonb_build_object('name',med->>'name') else '{}'::jsonb end) end;
  result:=result||jsonb_build_object('activity',events);
 end if;
 if ('adherence'=any(p_scopes) and p_section in ('all','adherence')) or ('activity'=any(p_scopes) and p_section in ('all','activity')) then result:=result||jsonb_build_object('history_window',jsonb_build_object('days',p_days,'timezone','UTC','start_at',start_at,'end_at',p_asof));end if;
 return result;
end $$;
revoke all on function public.patient_share_synthetic_payload(text[],text,integer,timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.patient_share_synthetic_payload(text[],text,integer,timestamptz,timestamptz) to service_role;

-- Test email can never use professional mode, even with a correctly signed production assertion.
create or replace function public.patient_share_professional_approved(p_actor uuid) returns boolean
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare until_time timestamptz;mode text:=current_setting('request.bigpharma_connect_mode',true);account_email text;begin
 if coalesce(auth.role(),'')<>'service_role' or p_actor is null or current_setting('request.bigpharma_connect_actor',true) is distinct from p_actor::text then return false;end if;
 begin until_time:=nullif(current_setting('request.bigpharma_connect_until',true),'')::timestamptz;exception when others then return false;end;
 if until_time is null or until_time<=clock_timestamp() or mode is null or mode not in ('professional','synthetic_only') then return false;end if;
 select lower(u.email) into account_email from auth.users u join public.user_profiles p on p.id=u.id where u.id=p_actor and u.email_confirmed_at is not null and length(coalesce(u.encrypted_password,''))>0;
 if account_email is null then return false;end if;
 if account_email='ahmedmohamedelbasty20@gmail.com' then return mode='synthetic_only';end if;
 return mode='professional';
end $$;
revoke all on function public.patient_share_professional_approved(uuid) from public,anon,authenticated;
grant execute on function public.patient_share_professional_approved(uuid) to service_role;

-- Add an explicit verified access-mode argument without deleting the old internal dispatcher.
-- Old direct calls have no installed mode and cannot pass the authorization helper.
create or replace function public.execute_patient_share_connect(p_actor uuid,p_nonce_hash text,p_until timestamptz,p_action text,p_hash text,p_grant uuid,p_days integer,p_before timestamptz,p_recheck boolean,p_access_mode text) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$ declare result jsonb;begin
 if coalesce(auth.role(),'')<>'service_role' then raise exception 'Server authorization required';end if;
 if p_access_mode is null or p_access_mode not in ('professional','synthetic_only') then return jsonb_build_object('error','CONNECT_AUTH_INVALID');end if;
 perform set_config('request.bigpharma_connect_mode',p_access_mode,true);
 result:=public.execute_patient_share_connect(p_actor,p_nonce_hash,p_until,p_action,p_hash,p_grant,p_days,p_before,p_recheck);
 if result ? 'error' then return result;end if;
 if p_action='professional_status' and p_access_mode='synthetic_only' then result:=result||jsonb_build_object('approved',false,'test_authorized',true);end if;
 return result||jsonb_build_object('access_mode',p_access_mode);
end $$;
revoke all on function public.execute_patient_share_connect(uuid,text,timestamptz,text,text,uuid,integer,timestamptz,boolean,text) from public,anon,authenticated;
grant execute on function public.execute_patient_share_connect(uuid,text,timestamptz,text,text,uuid,integer,timestamptz,boolean,text) to service_role;

-- Incremental guards in the existing locking/redemption/check/session implementations.
do $migration$ declare fn regprocedure;definition text;marker text;changed text;begin
 foreach fn in array array['public.redeem_patient_share_v2(uuid,text)'::regprocedure,'public.check_patient_share_v2(uuid,uuid)'::regprocedure] loop
  definition:=pg_get_functiondef(fn);marker:='state:=public.patient_share_access_decision';
  if position('TEST_DATA_ONLY' in definition)=0 then
   if position(marker in definition)=0 then raise exception 'Missing dataset-guard insertion point: %',fn;end if;
   definition:=replace(definition,marker,'if current_setting(''request.bigpharma_connect_mode'',true)=''synthetic_only'' and i.data_class<>''synthetic_demo_v1'' then return jsonb_build_object(''error'',''TEST_DATA_ONLY'');end if;'||chr(10)||marker);
  end if;
  if position('''data_class'',i.data_class' in definition)=0 then definition:=replace(definition,'''status'',''ACTIVE''','''status'',''ACTIVE'',''data_class'',i.data_class');end if;
  execute definition;
 end loop;
 definition:=pg_get_functiondef('public.list_patient_share_v2(uuid,boolean)'::regprocedure);
 if position('request.bigpharma_connect_mode' in definition)=0 then
  if position('i.sharing_version=2' in definition)=0 then raise exception 'Missing sessions dataset filter insertion point';end if;
  definition:=replace(definition,'i.sharing_version=2','i.sharing_version=2 and (current_setting(''request.bigpharma_connect_mode'',true)=''professional'' or i.data_class=''synthetic_demo_v1'')');
  definition:=replace(definition,'''status'',''ACTIVE''','''status'',''ACTIVE'',''data_class'',i.data_class');
  definition:=regexp_replace(definition,'redeemed_at,\s*identity_consented_at,\s*sharing_version,','redeemed_at,identity_consented_at,sharing_version,data_class,');
  execute definition;
 end if;
 definition:=pg_get_functiondef('public.read_patient_share_v2(uuid,uuid,text,integer,timestamptz)'::regprocedure);
 if position('patient_share_synthetic_payload' in definition)=0 then
  marker:='select user_id into owner from public.patient_share_grants';
  if position(marker in definition)=0 then raise exception 'Missing read dataset insertion point';end if;
  changed:=replace(definition,marker,'if access->>''data_class''=''synthetic_demo_v1'' then'||chr(10)||' recheck:=public.check_patient_share_v2(p_actor,p_grant);if recheck ? ''error'' then return recheck;end if;'||chr(10)||' if p_section=''photo'' then return jsonb_build_object(''error'',''PHOTO_UNAVAILABLE'');end if;'||chr(10)||' insert into public.patient_share_security_events(actor_id,grant_id,action,outcome) values(p_actor,p_grant,''read:''||p_section,''SYNTHETIC'');'||chr(10)||' return recheck||public.patient_share_synthetic_payload(scopes,p_section,p_days,clock_timestamp(),p_before);'||chr(10)||'end if;'||chr(10)||marker);
  execute changed;
 end if;
end $migration$;
notify pgrst,'reload schema';
commit;
