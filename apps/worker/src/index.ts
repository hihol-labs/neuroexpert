import { supabase } from "./supabase.js";
import { handleGenerateContent } from "./jobs/generate-content.js";
import { handleValidateContent } from "./jobs/validate-content.js";
import { handleCollectDemand } from "./jobs/collect-demand.js";
import { handleFindGaps } from "./jobs/find-gaps.js";
import { handleExpandQuery } from "./jobs/expand-query.js";
import { handleGenerateOrders } from "./jobs/generate-orders.js";
import { handleTrackCitations } from "./jobs/track-citations.js";
import { handleTrackSerp } from "./jobs/track-serp.js";
import { handleCalculateTrustScore } from "./jobs/calculate-trust-score.js";
import { handleSubmitSitemap } from "./jobs/submit-sitemap.js";
import { handleRefreshContent } from "./jobs/refresh-content.js";
import { handleCheckCwv } from "./jobs/check-cwv.js";

const POLL_INTERVAL = Number(process.env.WORKER_POLL_INTERVAL_MS) || 5000;
const MAX_RETRIES = 3;

type JobHandler = (payload: Record<string, unknown>) => Promise<unknown>;

const handlers: Record<string, JobHandler> = {
  collect_demand: handleCollectDemand,
  find_gaps: handleFindGaps,
  expand_query: handleExpandQuery,
  generate_orders: handleGenerateOrders,
  generate_content: handleGenerateContent,
  validate_content: handleValidateContent,
  track_citations: handleTrackCitations,
  track_serp: handleTrackSerp,
  calculate_trust_score: handleCalculateTrustScore,
  submit_sitemap: handleSubmitSitemap,
  refresh_content: handleRefreshContent,
  check_cwv: handleCheckCwv,
};

// Заглушки
const STUB_TYPES = [
  "transcribe", "crosspost", "crosspost_social",
  "send_email_digest", "optimize_images",
];

for (const type of STUB_TYPES) {
  handlers[type] = async (payload) => {
    console.log(`[worker] Stub handler for '${type}':`, JSON.stringify(payload).slice(0, 200));
    return { stub: true };
  };
}

async function pollAndProcess(): Promise<void> {
  const { data: jobs, error: fetchErr } = await supabase
    .rpc("claim_job", { handler_types: Object.keys(handlers) });

  if (fetchErr?.code === "42883") {
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
    const result = await handler(payload);
    await supabase.from("jobs").update({ status: "completed", result: result as Record<string, unknown>, completed_at: new Date().toISOString() }).eq("id", jobId);
    console.log(`[worker] ${jobType} (${jobId}) completed`);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`[worker] ${jobType} (${jobId}) failed:`, errorMessage);
    const maxAttempts = (job.max_attempts as number) ?? MAX_RETRIES;
    const shouldRetry = attempts < maxAttempts;
    await supabase.from("jobs").update({
      status: shouldRetry ? "pending" : "failed",
      error: errorMessage,
      ...(shouldRetry ? {} : { completed_at: new Date().toISOString() }),
    }).eq("id", jobId);
    if (shouldRetry) console.log(`[worker] ${jobType} (${jobId}) will retry (${attempts}/${maxAttempts})`);
  }
}

async function main(): Promise<void> {
  const realHandlers = Object.keys(handlers).filter((t) => !STUB_TYPES.includes(t));
  console.log("[worker] Starting...");
  console.log(`[worker] Active handlers: ${realHandlers.join(", ")}`);
  console.log(`[worker] Stub handlers: ${STUB_TYPES.length} types`);
  console.log(`[worker] Poll interval: ${POLL_INTERVAL}ms`);

  while (true) {
    try { await pollAndProcess(); } catch (err) { console.error("[worker] Unexpected error:", err); }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
  }
}

main();
