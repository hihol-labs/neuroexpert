import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

function getAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = getAdmin();

  const [experts, articles, citations, niches] = await Promise.all([
    admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("is_published", true),
    admin
      .from("content_packages")
      .select("id", { count: "exact", head: true })
      .eq("status", "published"),
    admin
      .from("citation_checks")
      .select("id", { count: "exact", head: true })
      .eq("is_cited", true),
    admin
      .from("niches")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
  ]);

  return NextResponse.json({
    experts: experts.count ?? 0,
    articles: articles.count ?? 0,
    citations: citations.count ?? 0,
    niches: niches.count ?? 0,
  });
}
