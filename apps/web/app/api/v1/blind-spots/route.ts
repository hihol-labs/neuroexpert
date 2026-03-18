import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { validateApiKey } from "@/lib/api-auth";

function getAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

// "Карта слепых зон AI" — data product for SEO agencies
// Returns questions where AI gives weak answers, grouped by niche
export async function GET(request: NextRequest) {
  const auth = await validateApiKey(request);
  if (!auth.valid) {
    return NextResponse.json(
      { error: auth.error, docs: "/api/v1/docs" },
      { status: auth.status },
    );
  }

  if (!auth.permissions?.includes("answers") && !auth.permissions?.includes("all")) {
    return NextResponse.json(
      { error: "Requires 'answers' permission (Pro plan). Contact api@neuroexpertise.ru" },
      { status: 403 },
    );
  }

  const params = request.nextUrl.searchParams;
  const niche = params.get("niche");
  const minGap = parseInt(params.get("min_gap_score") || "6", 10);
  const minVolume = parseInt(params.get("min_volume") || "1000", 10);
  const limit = Math.min(parseInt(params.get("limit") || "50", 10), 200);
  const offset = parseInt(params.get("offset") || "0", 10);

  const admin = getAdmin();

  let query = admin
    .from("questions")
    .select(
      "id, question_text, slug, monthly_volume, gap_score, has_expert_name, has_specific_examples, has_source_link, has_specific_numbers, gap_analyzed_at, niche_id, niches(name, slug)",
      { count: "exact" },
    )
    .eq("is_active", true)
    .gte("gap_score", minGap)
    .gte("monthly_volume", minVolume)
    .order("gap_score", { ascending: false })
    .order("monthly_volume", { ascending: false })
    .range(offset, offset + limit - 1);

  if (niche) {
    const { data: nicheData } = await admin
      .from("niches")
      .select("id")
      .eq("slug", niche)
      .single();
    if (nicheData) {
      query = query.eq("niche_id", nicheData.id);
    }
  }

  const { data: questions, count } = await query;

  // Count existing expert answers per question
  const qIds = (questions ?? []).map((q) => q.id);
  const { data: answerData } = qIds.length
    ? await admin
        .from("content_packages")
        .select("question_id")
        .in("question_id", qIds)
        .eq("status", "published")
    : { data: [] };

  const answerMap: Record<string, number> = {};
  for (const a of answerData ?? []) {
    if (a.question_id) {
      answerMap[a.question_id] = (answerMap[a.question_id] || 0) + 1;
    }
  }

  // Get sub_queries for each question
  const { data: subQueries } = qIds.length
    ? await admin
        .from("sub_queries")
        .select("parent_question_id, query_text")
        .in("parent_question_id", qIds)
    : { data: [] };

  const subMap: Record<string, string[]> = {};
  for (const sq of subQueries ?? []) {
    const pid = sq.parent_question_id as string;
    if (!subMap[pid]) subMap[pid] = [];
    subMap[pid].push(sq.query_text as string);
  }

  // Aggregate by niche
  const nicheStats: Record<
    string,
    { name: string; slug: string; count: number; avg_gap: number; total_volume: number }
  > = {};

  const results = (questions ?? []).map((q) => {
    const nicheInfo = q.niches as unknown as { name: string; slug: string } | null;
    const nicheKey = nicheInfo?.slug ?? "unknown";

    if (!nicheStats[nicheKey]) {
      nicheStats[nicheKey] = {
        name: nicheInfo?.name ?? "Unknown",
        slug: nicheKey,
        count: 0,
        avg_gap: 0,
        total_volume: 0,
      };
    }
    nicheStats[nicheKey].count++;
    nicheStats[nicheKey].avg_gap += q.gap_score ?? 0;
    nicheStats[nicheKey].total_volume += q.monthly_volume ?? 0;

    return {
      id: q.id,
      question: q.question_text,
      monthly_volume: q.monthly_volume,
      gap_score: q.gap_score,
      markers: {
        has_expert_name: q.has_expert_name,
        has_specific_examples: q.has_specific_examples,
        has_source_link: q.has_source_link,
        has_specific_numbers: q.has_specific_numbers,
      },
      weakness_summary: buildWeaknessSummary(q),
      expert_answers_count: answerMap[q.id] || 0,
      sub_queries: subMap[q.id] ?? [],
      niche: nicheInfo,
      last_analyzed: q.gap_analyzed_at,
      opportunity_score: calculateOpportunity(q, answerMap[q.id] || 0),
    };
  });

  // Finalize niche stats
  for (const ns of Object.values(nicheStats)) {
    ns.avg_gap = Math.round((ns.avg_gap / ns.count) * 10) / 10;
  }

  return NextResponse.json({
    data: results,
    niche_summary: Object.values(nicheStats).sort((a, b) => b.total_volume - a.total_volume),
    pagination: {
      total: count ?? 0,
      limit,
      offset,
      has_more: offset + limit < (count ?? 0),
    },
    meta: {
      description: "Карта слепых зон AI — вопросы с массовым спросом и слабыми ответами нейросетей",
      filters: { min_gap_score: minGap, min_volume: minVolume, niche: niche || "all" },
      updated_at: new Date().toISOString(),
    },
  });
}

function buildWeaknessSummary(q: Record<string, unknown>): string {
  const issues: string[] = [];
  if (!q.has_expert_name) issues.push("нет ссылки на эксперта");
  if (!q.has_specific_examples) issues.push("нет примеров из практики");
  if (!q.has_source_link) issues.push("нет ссылок на источники");
  if (!q.has_specific_numbers) issues.push("нет конкретных цифр/сроков");
  return issues.length > 0 ? issues.join(", ") : "minor gaps";
}

function calculateOpportunity(q: Record<string, unknown>, existingAnswers: number): number {
  const gap = (q.gap_score as number) ?? 0;
  const volume = (q.monthly_volume as number) ?? 0;
  const competition = Math.max(1, existingAnswers);
  // High gap + high volume + low competition = high opportunity
  return Math.round((gap * Math.log10(Math.max(volume, 10)) / competition) * 10) / 10;
}
