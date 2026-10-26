-- Read-only production installation checks; no real user's doses or balances are modified by this test.
select relname,relrowsecurity from pg_class where oid in ('public.medication_inventory_transactions'::regclass,'public.medication_activity_log'::regclass,'public.user_notification_preferences'::regclass,'public.medication_scan_records'::regclass);
select not has_table_privilege('authenticated','public.medication_inventory_transactions','insert') as ledger_is_server_only;
select tgname from pg_trigger where tgrelid='public.reminder_events'::regclass and not tgisinternal;
select count(*) as negative_balances from public.medication_inventory_transactions where balance<0;
-- Installed-device/manual QA (NOT marked executed):
-- 1. On a dedicated QA account create a verified tablet prescription: inventory 1, dose quantity 1.
-- 2. Confirm one reminder twice: exactly one taken transaction and remaining 0.
-- 3. Undo: remaining 1; repeat undo: unchanged. Reconfirm: remaining 0.
-- 4. Refill twice with the same operation UUID: one refill transaction, expiration updated once.
-- 5. Try another user's prescription id: RLS/RPC must reject. No cross-account photo URL may load.
-- 6. Test liquid/mL and inhaler/puffs quantities using confirmed prescription units.
-- 7. Verify archival only after the five-day stock timestamp; preserve all log entries.
-- 8. The scheduler is not active in this tenant; app-closed five-day archival is NOT verified.
