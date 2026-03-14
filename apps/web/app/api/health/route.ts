import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

  return NextResponse.json({
    status: "ok",
    pages_published: count ?? 0,
    timestamp: new Date().toISOString(),
  });
}
