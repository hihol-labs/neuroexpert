import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

function getAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getAdmin();
  const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const { data, error } = await admin
    .from("ai_crawler_daily")
    .select("metric_date, bot_name, hits, successful_hits, failed_hits, unique_paths")
    .gte("metric_date", since)
    .order("metric_date", { ascending: false })
    .order("hits", { ascending: false })
    .limit(100);

  if (error) {
    console.error("[ai-crawlers] report error:", error);
    return NextResponse.json({ rows: [], error: "AI crawler report is not ready" });
  }

  return NextResponse.json({ rows: data ?? [] });
}
