\set ON_ERROR_STOP on
-- Disposable PG only: real 026 -> 028, minimal unrelated dependencies (not full 001->028).
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
CREATE TABLE profiles(id uuid PRIMARY KEY);
CREATE TABLE niches(id uuid PRIMARY KEY);
CREATE TABLE jobs(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), type text, payload jsonb, priority integer);
CREATE FUNCTION test_ok(ok boolean, label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAIL: %', label; END IF; END $$;
CREATE FUNCTION test_error(stmt text, expected text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE actual text; BEGIN
 BEGIN EXECUTE stmt; EXCEPTION WHEN OTHERS THEN GET STACKED DIAGNOSTICS actual = RETURNED_SQLSTATE; END;
 IF actual IS DISTINCT FROM expected THEN RAISE EXCEPTION 'Expected %, got %: %', expected, actual, stmt; END IF;
END $$;
CREATE FUNCTION test_snapshot() RETURNS jsonb LANGUAGE sql IMMUTABLE AS $$
 SELECT jsonb_build_object('schema_version', 1, 'gaps',(SELECT jsonb_agg(jsonb_build_object('question', i)) FROM generate_series(1,10) i)) $$;
INSERT INTO profiles VALUES (md5('owner')::uuid), (md5('other')::uuid);
INSERT INTO niches VALUES (md5('niche')::uuid);
INSERT INTO jobs(id,type) VALUES (md5('job')::uuid, 'run_audit');
\ir ../../packages/supabase/migrations/026_package_orders.sql
INSERT INTO package_orders(id,owner_id,package,amount_rub,niche_id,city,email,status,paid_at)
VALUES(md5('legacy')::uuid,md5('owner')::uuid,'audit_start',100,md5('niche')::uuid,'Москва','test@example.invalid','paid','2025-01-01T00:00:00Z');
\ir ../../packages/supabase/migrations/028_audit_delivery.sql
SELECT test_ok(sla_deadline_at='2025-01-01T01:00:00Z'::timestamptz,'legacy deadline') FROM package_orders WHERE id=md5('legacy')::uuid;
INSERT INTO package_orders(id,owner_id,package,amount_rub,niche_id,city,email,status,paid_at)
SELECT md5(i::text)::uuid,md5('owner')::uuid,'audit_start',100,md5('niche')::uuid,'Москва','test@example.invalid','paid',
 clock_timestamp()-CASE WHEN i=2 THEN interval '61 minutes' ELSE interval '1 minute' END FROM generate_series(1,9) i;
UPDATE package_orders SET owner_id=md5('other')::uuid WHERE id=md5('7')::uuid;
SELECT test_error($q$UPDATE package_orders SET status='invented' WHERE id=md5('6')::uuid$q$,'23514');
SELECT test_error($q$UPDATE package_orders SET status='delivered' WHERE id=md5('6')::uuid$q$,'23514');
SELECT test_error($q$UPDATE package_orders SET status='pending',job_id=md5('job')::uuid WHERE id=md5('6')::uuid$q$,'23514');
SELECT test_error($q$SELECT complete_package_audit(md5('6')::uuid,'{}','full')$q$,'23514');
SELECT test_error($q$SELECT complete_package_audit(md5('6')::uuid,jsonb_set(test_snapshot(),'{gaps}',(test_snapshot()->'gaps')-0),'full')$q$,'23514');
SELECT test_error($q$SELECT complete_package_audit(md5('6')::uuid,test_snapshot(),'bad')$q$,'23514');
SELECT test_error($q$SELECT complete_package_audit(md5('6')::uuid,test_snapshot(),NULL)$q$,'23514');
SELECT test_error($q$UPDATE package_orders SET paid_at=paid_at+interval '1 minute' WHERE id=md5('6')::uuid$q$,'P0001');
UPDATE package_orders SET sla_deadline_at=clock_timestamp()+interval '1 day' WHERE id=md5('6')::uuid;
SELECT test_ok(sla_deadline_at=paid_at+interval '60 minutes','deadline cannot extend') FROM package_orders WHERE id=md5('6')::uuid;
SELECT test_ok(complete_package_audit(md5('1')::uuid,test_snapshot(),'full')='delivered','delivery');
SELECT test_ok(notification_status='pending' AND notification_next_attempt_at IS NOT NULL,'durable email') FROM package_orders WHERE id=md5('1')::uuid;
SELECT test_ok(complete_package_audit(md5('1')::uuid,'{}','bad')='already_delivered','idempotent');
SELECT test_error($q$UPDATE package_orders SET report='{}' WHERE id=md5('1')::uuid$q$,'P0001');
SELECT test_error($q$UPDATE package_orders SET report_mode='degraded' WHERE id=md5('1')::uuid$q$,'P0001');
UPDATE package_orders SET status='refunded',refunded_at=clock_timestamp() WHERE id=md5('1')::uuid;
SELECT test_ok(report=test_snapshot() AND refund_status='succeeded','refund preserves snapshot') FROM package_orders WHERE id=md5('1')::uuid;
SELECT test_ok(complete_package_audit(md5('2')::uuid,test_snapshot(),'full')='sla_breached','stale delivery');
SELECT test_ok(status='failed' AND report IS NULL AND refund_status='pending','stale queues refund') FROM package_orders WHERE id=md5('2')::uuid;
UPDATE package_orders SET job_id=md5('job')::uuid WHERE id=md5('3')::uuid;
SELECT test_ok(fail_package_audit(md5('3')::uuid,'engine failed',false),'fail wins');
SELECT test_ok(complete_package_audit(md5('3')::uuid,test_snapshot(),'full')='ignored','late delivery ignored');
SELECT test_ok(complete_package_audit(md5('4')::uuid,test_snapshot(),'degraded')='delivered','delivery wins');
SELECT test_ok(NOT fail_package_audit(md5('4')::uuid,'late failure',false),'cannot undo delivery');
SELECT test_ok(NOT fail_package_audit(md5('5')::uuid,'premature SLA',true),'fresh sweep no-op');
SELECT test_ok(ensure_package_audit_job(md5('5')::uuid) IS NOT NULL,'orphan payment job recovered');
SELECT test_ok(ensure_package_audit_job(md5('5')::uuid)=job_id,'recovery idempotent') FROM package_orders WHERE id=md5('5')::uuid;
SELECT test_error($q$UPDATE package_orders SET status='paid' WHERE id=md5('3')::uuid$q$,'P0001');
GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;
GRANT SELECT,INSERT,UPDATE,DELETE ON package_orders TO authenticated,service_role;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',md5('owner'),false);
SELECT test_ok((SELECT count(*)=1 FROM package_orders WHERE id=md5('6')::uuid),'owner sees own');
SELECT test_ok((SELECT count(*)=0 FROM package_orders WHERE id=md5('7')::uuid),'other owner hidden');
WITH changed AS (UPDATE package_orders SET status='failed' WHERE id=md5('6')::uuid RETURNING id) SELECT test_ok(count(*)=0,'owner cannot update') FROM changed;
SELECT test_error($q$SELECT complete_package_audit(md5('6')::uuid,test_snapshot(),'full')$q$,'42501');
SELECT test_error($q$SELECT fail_package_audit(md5('6')::uuid,'forged',false)$q$,'42501');
RESET ROLE;
SET ROLE anon;
SELECT test_error($q$SELECT complete_package_audit(md5('6')::uuid,test_snapshot(),'full')$q$,'42501');
RESET ROLE;
SET ROLE service_role;
SELECT test_ok(complete_package_audit(md5('8')::uuid,test_snapshot(),'full')='delivered','service RPC');
RESET ROLE;
CREATE EXTENSION dblink;
SELECT dblink_connect('failure','dbname='||current_database()||' host='||current_setting('unix_socket_directories')||' port='||current_setting('port'));
SELECT dblink_connect('delivery','dbname='||current_database()||' host='||current_setting('unix_socket_directories')||' port='||current_setting('port'));
BEGIN;
SELECT id FROM package_orders WHERE id=md5('9')::uuid FOR UPDATE;
SELECT dblink_send_query('failure',$q$SELECT fail_package_audit(md5('9')::uuid,'race',false)$q$);
SELECT dblink_send_query('delivery',$q$SELECT complete_package_audit(md5('9')::uuid,test_snapshot(),'full')$q$);
COMMIT;
CREATE TEMP TABLE race_failure AS SELECT * FROM dblink_get_result('failure') AS t(won boolean);
CREATE TEMP TABLE race_delivery AS SELECT * FROM dblink_get_result('delivery') AS t(result text);
SELECT test_ok(((SELECT won FROM race_failure) AND (SELECT result='ignored' FROM race_delivery)) OR
 ((SELECT NOT won FROM race_failure) AND (SELECT result='delivered' FROM race_delivery)),'one concurrent winner');
SELECT dblink_disconnect('failure');
SELECT dblink_disconnect('delivery');
SELECT 'PASS: G-019 schema 026 -> 028 and real concurrent finalization';
