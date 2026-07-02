import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type JobStatus = "pending" | "processing" | "completed" | "failed";

async function checkAuthHealth(baseUrl: string, apiKey?: string): Promise<"ok" | "failed"> {
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/auth/v1/health`, {
      cache: "no-store",
      headers: apiKey ? { apikey: apiKey } : undefined,
      signal: AbortSignal.timeout(3000),
    });
    return response.ok ? "ok" : "failed";
  } catch {
    return "failed";
  }
}

function emptyJobStats() {
  return {
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
  };
}

function buildWorkerStats(
  jobs: Array<{ type: string | null; status: string | null; scheduled_at: string | null; error: string | null }> = [],
) {
  const byType: Record<string, ReturnType<typeof emptyJobStats>> = {};
  const totals = emptyJobStats();
  const retrySchedule: Array<{ type: string; scheduled_at: string; error: string | null }> = [];

  for (const job of jobs) {
    const type = job.type || "unknown";
    const status = job.status as JobStatus;
    if (!["pending", "processing", "completed", "failed"].includes(status)) continue;

    byType[type] ??= emptyJobStats();
    byType[type][status] += 1;
    totals[status] += 1;

    if (status === "pending" && job.scheduled_at && new Date(job.scheduled_at).getTime() > Date.now()) {
      retrySchedule.push({
        type,
        scheduled_at: job.scheduled_at,
        error: job.error ? job.error.slice(0, 160) : null,
      });
    }
  }

  retrySchedule.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

  return {
    totals,
    by_type: Object.fromEntries(
      Object.entries(byType).sort(([a], [b]) => a.localeCompare(b)),
    ),
    scheduled_retries: retrySchedule.slice(0, 10),
    sample_size: jobs.length,
  };
}

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { count } = await supabase
    .from("content_packages")
    .select("id", { count: "exact", head: true })
    .eq("status", "published");

  const [{ count: pendingJobs }, { count: failedJobs }, { data: workerJobs }, authHealth] = await Promise.all([
    supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "failed"),
    supabase
      .from("jobs")
      .select("type,status,scheduled_at,error")
      .in("status", ["pending", "processing", "completed", "failed"])
      .order("created_at", { ascending: false })
      .range(0, 9999),
    checkAuthHealth(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  ]);

  const smtpConfigured = Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    process.env.SMTP_ADMIN_EMAIL,
  );

  return NextResponse.json({
    status: authHealth === "ok" ? "ok" : "degraded",
    pages_published: count ?? 0,
    auth: {
      status: authHealth,
      // Готовность magic-link = SMTP сконфигурирован И auth-сервис здоров.
      // Только env-переменных SMTP недостаточно: при degraded auth письма не уходят.
      magic_link_ready: smtpConfigured && authHealth === "ok",
      smtp_configured: smtpConfigured,
    },
    worker: {
      pending_jobs: pendingJobs ?? 0,
      failed_jobs: failedJobs ?? 0,
      ...buildWorkerStats(workerJobs ?? []),
    },
    timestamp: new Date().toISOString(),
  });
}
