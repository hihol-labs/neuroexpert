import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getProvidersReport } from "@/lib/providers-probe";

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

  const [{ count: pendingJobs }, { count: failedJobs }, { data: workerJobs }, { data: lastExpandQuery }, authHealth, { data: localPairs }] = await Promise.all([
    supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "failed"),
    supabase
      .from("jobs")
      .select("type,status,scheduled_at,error")
      .in("status", ["pending", "processing", "completed", "failed"])
      .order("created_at", { ascending: false })
      .range(0, 9999),
    // Свидетельство канарейки expand_query: статуса «completed» недостаточно —
    // job закрывался успехом с нулём подзапросов (QUEUE-4), поэтому наружу
    // отдаётся и число реально созданных sub_queries из result.
    supabase
      .from("jobs")
      .select("status,result,error,completed_at")
      .eq("type", "expand_query")
      .neq("status", "archived")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    checkAuthHealth(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    // G-018b: on-demand пары «вертикаль × город» — оракул стадии pair и канарейка
    // читают состояние пар отсюда; active > 0 допустим только после решения владельца (§5).
    supabase.from("niches").select("is_active, demand_status").not("vertical", "is", null),
  ]);

  const pairRows = (localPairs ?? []) as Array<{ is_active: boolean | null; demand_status: string | null }>;
  const localPairsStats = {
    total: pairRows.length,
    active: pairRows.filter((p) => p.is_active === true).length,
    collecting: pairRows.filter((p) => p.demand_status === "queued" || p.demand_status === "running").length,
    filled: pairRows.filter((p) => p.demand_status === "filled").length,
    empty: pairRows.filter((p) => p.demand_status === "empty").length,
  };

  const lastExpandResult = (lastExpandQuery?.result ?? null) as { subqueries?: unknown } | null;
  const lastExpandSubqueries = typeof lastExpandResult?.subqueries === "number" ? lastExpandResult.subqueries : null;

  const smtpConfigured = Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    process.env.SMTP_ADMIN_EMAIL,
  );

  const deliveryCounts = await Promise.all([
    supabase.from("package_orders").select("id",{count:"exact",head:true}).eq("status","paid"),
    supabase.from("package_orders").select("id",{count:"exact",head:true}).eq("status","delivered"),
    supabase.from("package_orders").select("id",{count:"exact",head:true}).eq("status","failed").not("paid_at","is",null),
    supabase.from("package_orders").select("id",{count:"exact",head:true}).eq("status","refunded"),
    supabase.from("package_orders").select("id",{count:"exact",head:true}).eq("status","paid").lte("sla_deadline_at",new Date().toISOString()),
    // R-01: брошенные корзины и «залипшие» pending. pending_stale > 0 = сверка worker'а не крутится
    // (окно протухания + 30 минут запаса на таймер 15 минут).
    supabase.from("package_orders").select("id",{count:"exact",head:true}).eq("status","expired"),
    supabase.from("package_orders").select("id",{count:"exact",head:true}).eq("status","pending")
      .lt("created_at",new Date(Date.now()-(Number(process.env.PACKAGE_ORDER_EXPIRE_MINUTES||1440)+30)*60000).toISOString()),
  ]);
  const deliveryHealthy = deliveryCounts.every(r=>!r.error && r.count !== null);
  const auditDelivery = Object.fromEntries(["paid_waiting","delivered","failed","refunded","sla_breached","expired","pending_stale"].map((name,i)=>[name,deliveryCounts[i].error ? null : deliveryCounts[i].count]));

  // DEMAND-3: живость провайдеров (Wordstat + LLM), а не только наличие ключей —
  // пустой баланс XMLRIVER и блокировка облака Yandex проходили тихо (2026-09-05).
  // Кеш 10 минут; PROVIDERS_PROBE=off даёт `skipped` без деградации.
  const providers = await getProvidersReport();

  // R-02: алерты оператору (таблица operator_alerts, миграция 030). До миграции — null-поля, health не падает.
  const dayAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const [lastAlert, sentAlerts, failedAlerts] = await Promise.all([
    supabase.from("operator_alerts").select("last_sent_at").not("last_sent_at", "is", null).order("last_sent_at", { ascending: false }).limit(1),
    supabase.from("operator_alerts").select("key", { count: "exact", head: true }).gte("last_sent_at", dayAgo),
    supabase.from("operator_alerts").select("key", { count: "exact", head: true }).not("last_error", "is", null).gte("updated_at", dayAgo),
  ]);
  const alerts = {
    last_sent_at: lastAlert.error ? null : ((lastAlert.data?.[0] as { last_sent_at?: string } | undefined)?.last_sent_at ?? null),
    sent_24h: sentAlerts.error ? null : sentAlerts.count,
    failed_24h: failedAlerts.error ? null : failedAlerts.count,
    ...(lastAlert.error ? { error: String(lastAlert.error.message).slice(0, 120) } : {}),
  };

  return NextResponse.json({
    alerts: alerts,
    status: authHealth === "ok" && deliveryHealthy && !providers.summary.degraded ? "ok" : "degraded",
    providers: providers.report,
    providers_summary: { ...providers.summary, cached: providers.cached },
    audit_delivery: auditDelivery,
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
      last_expand_query: lastExpandQuery
        ? {
            status: lastExpandQuery.status,
            subqueries: lastExpandSubqueries,
            error: lastExpandQuery.error ? String(lastExpandQuery.error).slice(0, 160) : null,
            completed_at: lastExpandQuery.completed_at,
          }
        : null,
    },
    local_pairs: localPairsStats,
    timestamp: new Date().toISOString(),
  });
}
