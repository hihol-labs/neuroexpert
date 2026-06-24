import { NextRequest, NextResponse } from "next/server";
import { isExpertOwnedByKey } from "shared";
import { hasPermission, validateApiKey } from "@/lib/api-auth";
import { assertBusinessAccess, getAdmin, toNumber } from "@/lib/demand-to-revenue-server";

export async function GET(request: NextRequest) {
  const auth = await validateApiKey(request);
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error, docs: "/api/v1/docs" }, { status: auth.status });
  }
  if (!hasPermission(auth.permissions, ["read", "answers"])) {
    return NextResponse.json({ error: "Requires read permission" }, { status: 403 });
  }

  const params = request.nextUrl.searchParams;
  const expertId = params.get("expert_id");
  const businessId = params.get("business_id");
  const platform = params.get("platform");
  const limit = Math.min(parseInt(params.get("limit") || "50", 10), 200);

  // Tenancy: expert-данные доступны только владельцу ключа; business-данные — при наличии доступа.
  if (!isExpertOwnedByKey(expertId, auth.ownerId!)) {
    return NextResponse.json({ error: "Forbidden: expert_id not owned by key" }, { status: 403 });
  }
  if (businessId && !(await assertBusinessAccess(businessId, auth.ownerId!))) {
    return NextResponse.json({ error: "Forbidden: business not accessible" }, { status: 403 });
  }

  const admin = getAdmin();

  const [citationsResult, visibilityResult, competitorsResult] = await Promise.all([
    expertId
      ? admin
          .from("citation_checks")
          .select("*")
          .eq("expert_id", expertId)
          .order("checked_at", { ascending: false })
          .limit(limit)
      : { data: [] },
    businessId
      ? admin
          .from("local_visibility_checks")
          .select("*")
          .eq("business_id", businessId)
          .order("collected_at", { ascending: false })
          .limit(limit)
      : { data: [] },
    businessId
      ? admin
          .from("local_competitors")
          .select("id, name, ai_visibility_score, source, collected_at, confidence")
          .eq("business_id", businessId)
          .order("ai_visibility_score", { ascending: false })
          .limit(20)
      : { data: [] },
  ]);

  let citations = citationsResult.data ?? [];
  if (platform && citations.length) {
    citations = citations.filter((item) => String(item.ai_platform).includes(platform));
  }

  const citedCount = citations.filter((item) => item.is_cited).length;
  const checks = visibilityResult.data ?? [];
  const visibleCount = checks.filter((item) => item.is_visible).length;
  const score = Math.round(
    Math.max(
      citations.length ? (citedCount / citations.length) * 100 : 0,
      checks.length ? (visibleCount / checks.length) * 100 : 0,
      ...((competitorsResult.data ?? []).map((item) => toNumber(item.ai_visibility_score))),
    ) * 10,
  ) / 10;

  return NextResponse.json({
    data: {
      score,
      citations,
      local_visibility_checks: checks,
      competitors: competitorsResult.data ?? [],
    },
    meta: {
      source: expertId ? "citation_checks" : "local_visibility_checks",
      freshness: "per-row collected_at",
      confidence: "per-row confidence",
      updated_at: new Date().toISOString(),
    },
  });
}
