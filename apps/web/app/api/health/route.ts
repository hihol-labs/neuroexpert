import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

async function checkAuthHealth(baseUrl: string): Promise<"ok" | "failed"> {
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/auth/v1/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    return response.ok ? "ok" : "failed";
  } catch {
    return "failed";
  }
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

  const [{ count: pendingJobs }, { count: failedJobs }, authHealth] = await Promise.all([
    supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "failed"),
    checkAuthHealth(process.env.NEXT_PUBLIC_SUPABASE_URL!),
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
      magic_link_ready: smtpConfigured,
      smtp_configured: smtpConfigured,
    },
    worker: {
      pending_jobs: pendingJobs ?? 0,
      failed_jobs: failedJobs ?? 0,
    },
    timestamp: new Date().toISOString(),
  });
}
