import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/api-auth";
import { getAdmin } from "@/lib/demand-to-revenue-server";

function hasPermission(permissions: unknown, accepted: string[]): boolean {
  const list = Array.isArray(permissions)
    ? permissions.map(String)
    : typeof permissions === "string"
      ? permissions.split(",").map((item) => item.trim())
      : [];
  return list.includes("all") || accepted.some((item) => list.includes(item));
}

export async function GET(request: NextRequest) {
  const auth = await validateApiKey(request);
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error, docs: "/api/v1/docs" }, { status: auth.status });
  }
  if (!hasPermission(auth.permissions, ["read", "answers"])) {
    return NextResponse.json({ error: "Requires read permission" }, { status: 403 });
  }

  const params = request.nextUrl.searchParams;
  const city = params.get("city");
  const q = params.get("q");
  const businessId = params.get("business_id");
  const limit = Math.min(parseInt(params.get("limit") || "30", 10), 100);
  const offset = parseInt(params.get("offset") || "0", 10);
  const admin = getAdmin();

  let query = admin
    .from("local_competitors")
    .select("id, business_id, name, website, city, channels, strengths, weaknesses, offer_summary, trust_signals, ai_visibility_score, source, source_url, collected_at, confidence", { count: "exact" })
    .order("ai_visibility_score", { ascending: false })
    .range(offset, offset + limit - 1);

  if (businessId) query = query.eq("business_id", businessId);
  if (city) query = query.ilike("city", `%${city}%`);
  if (q) query = query.ilike("name", `%${q}%`);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: "Failed to load competitors" }, { status: 500 });

  return NextResponse.json({
    data: data ?? [],
    pagination: { total: count ?? 0, limit, offset, has_more: offset + limit < (count ?? 0) },
    meta: {
      description: "Local competitor intelligence with channels, offer gaps, trust signals and AI visibility.",
      updated_at: new Date().toISOString(),
    },
  });
}
