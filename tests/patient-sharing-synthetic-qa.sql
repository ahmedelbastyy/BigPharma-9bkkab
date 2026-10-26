-- Repeatable runtime synthetic fixture tests. No real patients, accounts, grants or writes.
begin;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
do $$ declare scopes text[];optional text[]:=array['medications','schedule','adherence','activity'];mask integer;j integer;r jsonb;definition text;begin
 for mask in 0..15 loop
 scopes:=array['profile'];for j in 1..4 loop if (mask & (1<<(j-1)))<>0 then scopes:=array_append(scopes,optional[j]);end if;end loop;
 r:=public.patient_share_synthetic_payload(scopes,'all',30,'2026-10-25 22:00Z',null);
 if r->>'data_class'<>'synthetic_demo_v1' or r->'profile'->>'email'<>'synthetic.patient@example.invalid' or r->'profile'->>'photo_available'<>'false' then raise exception 'Fixture identity failed';end if;
 for j in 1..4 loop if (r ? optional[j]) is distinct from (optional[j]=any(scopes)) then raise exception 'Scope matrix failed';end if;end loop;
 if 'schedule'=any(scopes) and not('medications'=any(scopes)) and ((r->'schedule'->0) ? 'name' or (r->'schedule'->0) ? 'directions') then raise exception 'Schedule identity leak';end if;
 if 'activity'=any(scopes) and not('medications'=any(scopes)) and (r->'activity'->0) ? 'name' then raise exception 'Activity identity leak';end if;
 if 'adherence'=any(scopes) and (r->'adherence'->>'percent'<>'67' or jsonb_array_length(r->'dose_history')<>3) then raise exception 'Fixture history failed';end if;
 end loop;
 for j in 1..1000 loop if not public.claim_patient_share_request('00000000-0000-0000-0000-000000000001','create') then raise exception 'Quota remains';end if;end loop;
 definition:=pg_get_functiondef('public.create_patient_share_v2(uuid,text,text[],integer)'::regprocedure);
 if position('RATE_LIMITED' in definition)>0 or position('ACTIVE_INVITATION_LIMIT' in definition)>0 then raise exception 'Creation quotas remain';end if;
 if has_function_privilege('authenticated','public.execute_patient_share_connect(uuid,text,timestamptz,text,text,uuid,integer,timestamptz,boolean,text)','execute') then raise exception 'Browser bridge access';end if;
 if has_column_privilege('authenticated','public.patient_share_invitations','data_class','update') then raise exception 'Browser reclassification';end if;
 if exists(select 1 from storage.buckets where id='profile-photos' and public) then raise exception 'Photo bucket public';end if;
end $$;
commit;
