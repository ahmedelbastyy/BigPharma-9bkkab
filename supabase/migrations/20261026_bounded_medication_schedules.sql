-- Add one-time schedules and inclusive therapy end dates to the existing recurrence predicate.
-- No medication rows, histories, reminders, authentication or sharing permissions are changed.
begin;
create or replace function public.medication_occurs_on(rule jsonb, day date) returns boolean
language plpgsql immutable as $$
declare anchor date; kind text; interval_days integer;
begin
 anchor:=(rule->>'startDate')::date; kind:=rule->>'kind';
 if day<anchor or kind='as-needed' or (nullif(rule->>'endDate','') is not null and day>(rule->>'endDate')::date) then return false; end if;
 if kind='once' then return day=anchor; end if;
 if kind='daily' or kind='hourly' then return true; end if;
 if kind='alternate' then return (day-anchor)%2=0; end if;
 if kind in ('weekly','days') then return coalesce(rule->'weekdays','[]'::jsonb) @> to_jsonb(array[extract(dow from day)::integer]); end if;
 if kind='custom' then interval_days:=greatest(1,(rule->>'intervalDays')::integer);return (day-anchor)%interval_days=0; end if;
 return false;
end $$;
notify pgrst,'reload schema';
commit;
