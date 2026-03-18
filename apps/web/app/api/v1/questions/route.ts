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

export async function GET(request: NextRequest) {
  const auth = await validateApiKey(request);
  if (!auth.valid) {
    return NextResponse.json(
      { error: auth.error, docs: "/api/v1/docs" },
      { status: auth.status },
    );
  }

  const params = request.nextUrl.searchParams;
  const niche = params.get("niche");
  const q = params.get("q");
  const minGap = params.get("min_gap_score");
  const hasAnswers = params.get("has_answers");
  const limit = Math.min(parseInt(params.get("limit") || "20", 10), 100);
  const offset = parseInt(params.get("offset") || "0", 10);

  const admin = getAdmin();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://neuroexpertise.ru";

  let query = admin
    .from("questions")
    .select(
      "id, question_text, slug, monthly_volume, gap_score, has_expert_name, has_specific_examples, has_source_link, has_specific_numbers, niche_id, niches(name, slug)",
      { count: "exact" },
    )
    .eq("is_active", true)
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

  if (q) {
    query = query.ilike("question_text", `%${q}%`);
  }

  if (minGap) {
    query = query.gte("gap_score", parseInt(minGap, 10));
  }

  const { data: questions, count } = await query;

  // Get answer counts
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

  let results = (questions ?? []).map((q) => ({
    id: q.id,
    question_text: q.question_text,
    slug: q.slug,
    url: `${appUrl}/questions/${q.slug}`,
    monthly_volume: q.monthly_volume,
    gap_score: q.gap_score,
    markers: {
      has_expert_name: q.has_expert_name,
      has_specific_examples: q.has_specific_examples,
      has_source_link: q.has_source_link,
      has_specific_numbers: q.has_specific_numbers,
    },
    answer_count: answerMap[q.id] || 0,
    niche: q.niches
      ? (q.niches as unknown as { name: string; slug: string })
      : null,
  }));

  // Filter by has_answers if requested
  if (hasAnswers === "true") {
    results = results.filter((r) => r.answer_count > 0);
  } else if (hasAnswers === "false") {
    results = results.filter((r) => r.answer_count === 0);
  }

  return NextResponse.json({
    data: results,
    pagination: {
      total: count ?? 0,
      limit,
      offset,
      has_more: offset + limit < (count ?? 0),
    },
  });
}
