import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

// These fixtures test the documented *static* boundary, not delivery behavior.
// Runtime behavior is covered by delivery.test.cjs and real PostgreSQL tests.
const files = {
  'packages/supabase/migrations/028_audit_delivery.sql': 'package_orders_job_requires_paid complete_package_audit fail_package_audit sla_deadline_at payment_test notification_sent_at refund_id',
  'packages/shared/src/delivery/index.ts': 'decideDeliveryMode buildReportSnapshot isSlaBreached decideRefund unavailable',
  'apps/web/app/api/audit/route.ts': 'AUDIT_INTERNAL_TOKEN x-audit-internal source_question_id collected_at platforms_tried analyzer_model',
  'apps/worker/src/jobs/run-audit.ts': 'handleRunAudit',
  'apps/worker/src/services/audit-delivery.ts': 'complete_package_audit fail_package_audit api.yookassa.ru/v3 refund- notification_sent_at signInWithOtp',
  'apps/worker/src/index.ts': 'run_audit: handleRunAudit sweepAuditDelivery',
  'apps/web/app/orders/[id]/page.tsx': 'data-order-report delivered owner_id !== user.id',
  'apps/web/app/api/orders/[id]/route.ts': 'report: order.report owner_id !== user.id',
  'apps/web/app/api/health/route.ts': 'audit_delivery paid_waiting sla_breached refunded',
};
const oracle = resolve('scripts/verify-selfserve-path.mjs');
function run(mutation, fixtureMutation) {
  const root = mkdtempSync(join(tmpdir(), 'delivery-oracle-'));
  try {
    for (const [name, text] of Object.entries(files)) {
      const path = join(root, name); mkdirSync(dirname(path), {recursive:true});
      writeFileSync(path, mutation ? mutation(name, text) : text);
    }
    const fixtures = {
      'health.json': {audit_delivery:{paid_waiting:0, delivered:1, failed:0, refunded:1, sla_breached:0}},
      'audit-paid.json': {status:401}, 'orders-get.json': {status:401},
    };
    if (fixtureMutation) fixtureMutation(fixtures);
    for (const [name, content] of Object.entries(fixtures)) writeFileSync(join(root,name),JSON.stringify(content));
    return spawnSync(process.execPath,[oracle,'--stage=delivery','--repo-root',root,'--fixture-dir',root],{encoding:'utf8'});
  } finally { rmSync(root,{recursive:true,force:true}); }
}
test('delivery static surface and read-only live fixtures pass',()=> { const r=run(); assert.equal(r.status,0,r.stderr); });
for (const [path, marker] of [
  ['packages/supabase/migrations/028_audit_delivery.sql','complete_package_audit'],
  ['packages/supabase/migrations/028_audit_delivery.sql','notification_sent_at'],
  ['packages/shared/src/delivery/index.ts','decideDeliveryMode'],
  ['apps/web/app/api/audit/route.ts','AUDIT_INTERNAL_TOKEN'],
  ['apps/web/app/api/audit/route.ts','collected_at'],
  ['apps/worker/src/services/audit-delivery.ts','refund-'],
  ['apps/worker/src/index.ts','run_audit: handleRunAudit'],
  ['apps/worker/src/index.ts','sweepAuditDelivery'],
  ['apps/web/app/orders/[id]/page.tsx','owner_id !== user.id'],
  ['apps/web/app/api/health/route.ts','sla_breached'],
]) test(`detect missing ${marker}`,()=> { const r=run((p,s)=>p===path?s.replace(marker,'REMOVED'):s);assert.equal(r.status,1,r.stderr); });
test('paid endpoint must reject unauthenticated use',()=>assert.equal(run(null,f=>f['audit-paid.json'].status=200).status,1));
test('owner endpoint must reject unauthenticated use',()=>assert.equal(run(null,f=>f['orders-get.json'].status=200).status,1));
test('unknown health counts cannot look healthy',()=>assert.equal(run(null,f=>f['health.json'].audit_delivery.refunded=null).status,1));
