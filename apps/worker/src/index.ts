import { supabase } from "./supabase.js";
import { handleRunAudit, sweepAuditDelivery, reconcilePayments, notifyOperator } from "./jobs/run-audit.js";
import { handleCollectDemand } from "./jobs/collect-demand.js";
import { handleFindGaps } from "./jobs/find-gaps.js";
import { handleExpandQuery } from "./jobs/expand-query.js";
import { handleGenerateOrders } from "./jobs/generate-orders.js";
import { handleTranscribe } from "./jobs/transcribe.js";
import { handleGenerateContent } from "./jobs/generate-content.js";
import { handleValidateContent } from "./jobs/validate-content.js";
import { handleTrackCitations } from "./jobs/track-citations.js";
import { handleTrackSerp } from "./jobs/track-serp.js";
import { handleCalculateTrustScore } from "./jobs/calculate-trust-score.js";
import { handleSubmitSitemap } from "./jobs/submit-sitemap.js";
import { handleRefreshContent } from "./jobs/refresh-content.js";
import { handleCheckCwv } from "./jobs/check-cwv.js";
import { handleCrosspost } from "./jobs/crosspost.js";
import { handleCrosspostSocial } from "./jobs/crosspost-social.js";
import { handleSendEmailDigest } from "./jobs/send-email-digest.js";
import { handleNotifyExpert } from "./jobs/notify-expert.js";
import { handleOptimizeImages } from "./jobs/optimize-images.js";
import {
  handleAnalyzeBehaviorSignals,
  handleCalculateUnitEconomics,
  handleGenerateAgencyReport,
  handleGenerateB2BPageDraft,
  handleGenerateDailyGrowthTasks,
  handleGenerateLocalWeeklyReport,
} from "./jobs/demand-to-revenue-os.js";

const POLL_INTERVAL = Number(process.env.WORKER_POLL_INTERVAL_MS) || 5000;
const MAX_RETRIES = 3;
const LLM_JOB_TYPES = new Set([
  "find_gaps",
  "expand_query",
  "generate_content",
  "validate_content",
  "track_citations",
]);

type JobHandler = (payload: Record<string, unknown>, context?: {attempts:number;maxAttempts:number;jobId:string}) => Promise<unknown>;

// Все обработчики — реальная логика
const handlers: Record<string, JobHandler> = {
  run_audit: handleRunAudit,
  collect_demand: handleCollectDemand,
  find_gaps: handleFindGaps,
  expand_query: handleExpandQuery,
  generate_orders: handleGenerateOrders,
  transcribe: handleTranscribe,
  generate_content: handleGenerateContent,
  validate_content: handleValidateContent,
  track_citations: handleTrackCitations,
  track_serp: handleTrackSerp,
  calculate_trust_score: handleCalculateTrustScore,
  submit_sitemap: handleSubmitSitemap,
  refresh_content: handleRefreshContent,
  check_cwv: handleCheckCwv,
  crosspost: handleCrosspost,
  crosspost_social: handleCrosspostSocial,
  send_email_digest: handleSendEmailDigest,
  notify_expert: handleNotifyExpert,
  optimize_images: handleOptimizeImages,
  generate_daily_growth_tasks: handleGenerateDailyGrowthTasks,
  generate_local_weekly_report: handleGenerateLocalWeeklyReport,
  generate_b2b_page_draft: handleGenerateB2BPageDraft,
  analyze_behavior_signals: handleAnalyzeBehaviorSignals,
  calculate_unit_economics: handleCalculateUnitEconomics,
  generate_agency_report: handleGenerateAgencyReport,
};

async function pollAndProcess(): Promise<void> {
  const { data: jobs, error: fetchErr } = await supabase
    .rpc("claim_job", { handler_types: Object.keys(handlers) });

  // 42883 — Postgres native: function does not exist
  // PGRST202 — PostgREST: function not found in schema cache
  if (fetchErr?.code === "42883" || fetchErr?.code === "PGRST202") {
    await pollFallback();
    return;
  }

  if (fetchErr) {
    console.error("[worker] Poll error:", fetchErr.message);
    return;
  }

  if (!jobs || (Array.isArray(jobs) && jobs.length === 0)) return;
  const job = Array.isArray(jobs) ? jobs[0] : jobs;
  await processJob(job);
}

async function pollFallback(): Promise<void> {
  const { data: job, error: findErr } = await supabase
    .from("jobs")
    .select("*")
    .eq("status", "pending")
    .in("type", Object.keys(handlers))
    .lte("scheduled_at", new Date().toISOString())
    .order("priority", { ascending: true })
    .order("scheduled_at", { ascending: true })
    .limit(1)
    .single();

  if (findErr?.code === "PGRST116" || !job) return;
  if (findErr) {
    console.error("[worker] Fallback poll error:", findErr.message);
    return;
  }

  const { data: claimed, error: claimErr } = await supabase
    .from("jobs")
    .update({ status: "processing", started_at: new Date().toISOString(), attempts: job.attempts + 1 })
    .eq("id", job.id)
    .eq("status", "pending")
    .select()
    .single();

  if (claimErr || !claimed) return;
  await processJob(claimed);
}

async function processJob(job: Record<string, unknown>): Promise<void> {
  const jobId = job.id as string;
  const jobType = job.type as string;
  const payload = (job.payload ?? {}) as Record<string, unknown>;
  const attempts = (job.attempts as number) ?? 1;

  console.log(`[worker] Processing ${jobType} (${jobId}), attempt ${attempts}`);

  const handler = handlers[jobType];
  if (!handler) {
    await supabase.from("jobs").update({ status: "failed", error: `No handler: ${jobType}`, completed_at: new Date().toISOString() }).eq("id", jobId);
    return;
  }

  try {
    const result = await handler(payload, {attempts,maxAttempts:(job.max_attempts as number)??MAX_RETRIES,jobId});
    await supabase.from("jobs").update({ status: "completed", result: result as Record<string, unknown>, completed_at: new Date().toISOString() }).eq("id", jobId);
    console.log(`[worker] ${jobType} (${jobId}) completed`);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`[worker] ${jobType} (${jobId}) failed:`, errorMessage);
    const maxAttempts = (job.max_attempts as number) ?? MAX_RETRIES;
    const retryPlan = getRetryPlan(jobType, errorMessage, attempts, maxAttempts);
    await supabase.from("jobs").update({
      status: retryPlan.shouldRetry ? "pending" : "failed",
      error: errorMessage,
      ...(retryPlan.scheduledAt ? { scheduled_at: retryPlan.scheduledAt } : {}),
      ...(retryPlan.shouldRetry ? {} : { completed_at: new Date().toISOString() }),
    }).eq("id", jobId);
    if (retryPlan.shouldRetry) {
      console.log(`[worker] ${jobType} (${jobId}) will retry (${attempts}/${maxAttempts}) at ${retryPlan.scheduledAt}`);
    } else {
      // R-02: тихий провал job по квоте/биллингу или лимиту провайдера — алерт оператору (B-AUTO-23).
      const n = errorMessage.toLowerCase();
      // fire-and-forget: notifier не бросает; ожидание таймаута Telegram не должно задерживать подбор следующей job.
      if (LLM_JOB_TYPES.has(jobType) && (n.includes("insufficient_quota") || n.includes("quota") || n.includes("billing"))) {
        void notifyOperator("quota_exhausted", jobType, { job: jobType, id: jobId, ошибка: errorMessage.slice(0, 300) });
      } else if (LLM_JOB_TYPES.has(jobType) && (n.includes("429") || n.includes("rate limit") || n.includes("too many requests"))) {
        void notifyOperator("rate_limited", jobType, { job: jobType, id: jobId, попыток: attempts, ошибка: errorMessage.slice(0, 300) });
      }
    }
  }
}

/**
 * R-02: watcher health — раз в 15 минут читает /api/health web'а (внутренний URL) и при
 * status !== "ok" шлёт алерт health_degraded с кратким составом (дедуп 1 час в БД).
 */
async function watchHealth(): Promise<void> {
  const base = process.env.AUDIT_INTERNAL_URL || "http://web:3000";
  let payload: Record<string, unknown> | null = null;
  try {
    const res = await fetch(new URL("/api/health", base), { signal: AbortSignal.timeout(30000) });
    payload = (await res.json()) as Record<string, unknown>;
  } catch (e) {
    await notifyOperator("health_degraded", null, { причина: `health недоступен: ${e instanceof Error ? e.message : String(e)}` });
    return;
  }
  if (payload?.status === "ok") return;
  const auth = (payload?.auth as { status?: string } | undefined)?.status;
  const summary = payload?.providers_summary as { reasons?: string[] } | undefined;
  const delivery = payload?.audit_delivery as Record<string, unknown> | undefined;
  await notifyOperator("health_degraded", null, {
    status: String(payload?.status ?? "unknown"), auth: auth ?? null,
    providers: summary?.reasons?.join("; ") ?? null,
    sla_breached: (delivery?.sla_breached as number | undefined) ?? null, pending_stale: (delivery?.pending_stale as number | undefined) ?? null,
  });
}

function getRetryPlan(
  jobType: string,
  errorMessage: string,
  attempts: number,
  maxAttempts: number,
): { shouldRetry: boolean; scheduledAt?: string } {
  if (attempts >= maxAttempts) return { shouldRetry: false };

  const normalized = errorMessage.toLowerCase();
  const isLLMJob = LLM_JOB_TYPES.has(jobType);
  const isProviderBillingBlocked =
    normalized.includes("insufficient_quota") ||
    normalized.includes("quota") ||
    normalized.includes("billing");

  if (isLLMJob && isProviderBillingBlocked) {
    return { shouldRetry: false };
  }

  const isRateLimited =
    normalized.includes("429") ||
    normalized.includes("rate limit") ||
    normalized.includes("too many requests");

  if (isLLMJob && isRateLimited) {
    const delayMs = calculateBackoffMs(attempts);
    return {
      shouldRetry: true,
      scheduledAt: new Date(Date.now() + delayMs).toISOString(),
    };
  }

  return { shouldRetry: true };
}

function calculateBackoffMs(attempts: number): number {
  const baseMs = Number(process.env.WORKER_LLM_RETRY_BASE_MS) || 5 * 60 * 1000;
  const maxMs = Number(process.env.WORKER_LLM_RETRY_MAX_MS) || 60 * 60 * 1000;
  const exponentialMs = Math.min(maxMs, baseMs * 2 ** Math.max(0, attempts - 1));
  const jitterMs = Math.floor(Math.random() * Math.min(30_000, exponentialMs * 0.1));
  return exponentialMs + jitterMs;
}

async function main(): Promise<void> {
  // Independent timer: a slow audit request cannot delay SLA/refund processing.
  let sweeping = false;
  const sweep = async () => {
    if(sweeping)return;
    sweeping=true;
    try {await sweepAuditDelivery();} catch(e) {console.error("[audit-delivery] sweep failed", e instanceof Error ? e.message : String(e));}
    finally {sweeping=false;}
  };
  void sweep();
  setInterval(()=>{void sweep();},5*60*1000);
  // R-01: сверка платежей с кассой — потерянный webhook и брошенные корзины (каждые 15 минут).
  let reconciling = false;
  const reconcile = async () => {
    if(reconciling)return;
    reconciling=true;
    try {const s=await reconcilePayments(); if(s.scanned>0)console.log(`[reconcile] scanned=${s.scanned} paid=${s.paid} failed=${s.failed} expired=${s.expired} kept=${s.kept} errors=${s.errors}`);}
    catch(e) {console.error("[reconcile] run failed", e instanceof Error ? e.message : String(e));}
    finally {reconciling=false;}
  };
  void reconcile();
  setInterval(()=>{void reconcile();},15 * 60 * 1000);
  // R-02: watcher health (degraded -> алерт оператору), первый прогон через минуту после старта.
  let watching = false; // reentrancy-guard, как у sweep/reconcile
  const health = async () => {
    if (watching) return;
    watching = true;
    try { await watchHealth(); } catch (e) { console.error("[alerts] health watcher failed", e instanceof Error ? e.message : String(e)); }
    finally { watching = false; }
  };
  setTimeout(()=>{void health();}, 60 * 1000);
  setInterval(()=>{void health();},15 * 60 * 1000);
  console.log("[worker] Starting...");
  console.log(`[worker] ${Object.keys(handlers).length} handlers: ${Object.keys(handlers).join(", ")}`);
  console.log(`[worker] Poll interval: ${POLL_INTERVAL}ms`);

  while (true) {
    try { await pollAndProcess(); } catch (err) { console.error("[worker] Unexpected error:", err); }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
  }
}

main();
