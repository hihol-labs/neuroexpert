#!/usr/bin/env node

process.env.NEXT_PUBLIC_SUPABASE_URL ||= "http://127.0.0.1:54321";
process.env.SUPABASE_SERVICE_ROLE_KEY ||= "local-smoke-service-role-key";

const handlers = await import("../apps/worker/dist/jobs/demand-to-revenue-os.js");

const checks = [
  ["generate_daily_growth_tasks", handlers.handleGenerateDailyGrowthTasks],
  ["generate_local_weekly_report", handlers.handleGenerateLocalWeeklyReport],
  ["generate_b2b_page_draft", handlers.handleGenerateB2BPageDraft],
  ["analyze_behavior_signals", handlers.handleAnalyzeBehaviorSignals],
  ["calculate_unit_economics", handlers.handleCalculateUnitEconomics],
  ["generate_agency_report", handlers.handleGenerateAgencyReport],
];

let failed = 0;

for (const [name, handler] of checks) {
  try {
    await handler({});
    console.error(`[FAIL] ${name}: expected missing business_id precondition error`);
    failed++;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message !== "business_id is required") {
      console.error(`[FAIL] ${name}: unexpected error: ${message}`);
      failed++;
      continue;
    }
    console.log(`[OK] ${name}: ${message}`);
  }
}

if (failed > 0) {
  process.exitCode = 1;
} else {
  console.log("[OK] Demand-to-Revenue handler precondition smoke passed");
}
