import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { validateApiKey } from "@/lib/api-auth";
import {
  calculateDemandOpportunityScore,
  inferDemandStage,
  type DemandIntent,
} from "shared";

type JsonRecord = Record<string, unknown>;

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://neuroexpertise.ru";

function getAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

function hasPermission(permissions: unknown, accepted: string[]): boolean {
  const list = Array.isArray(permissions)
    ? permissions.map(String)
    : typeof permissions === "string"
      ? permissions.split(",").map((item) => item.trim())
      : [];
  return list.includes("all") || accepted.some((item) => list.includes(item));
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function freshness(collectedAt: unknown): string {
  if (!collectedAt) return "unknown";
  const time = new Date(String(collectedAt)).getTime();
  if (!Number.isFinite(time)) return "unknown";
  const days = Math.floor((Date.now() - time) / 86_400_000);
  if (days <= 14) return "fresh";
  if (days <= 60) return "aging";
  return "stale";
}

async function resolveNicheId(
  admin: ReturnType<typeof getAdmin>,
  slug: string | null,
): Promise<string | null> {
  if (!slug) return null;
  const { data } = await admin
    .from("niches")
    .select("id")
    .eq("slug", slug)
    .single();
  return data?.id ?? null;
}

export async function GET(request: NextRequest) {
  const auth = await validateApiKey(request);
  if (!auth.valid) {
    return NextResponse.json(
      { error: auth.error, docs: "/api/v1/docs" },
      { status: auth.status },
    );
  }

  if (!hasPermission(auth.permissions, ["read", "answers"])) {
    return NextResponse.json(
      { error: "Requires 'read' permission" },
      { status: 403 },
    );
  }

  const params = request.nextUrl.searchParams;
  const source = params.get("source") || "all";
  const segment = params.get("segment") || "b2b";
  const niche = params.get("niche");
  const city = params.get("city");
  const q = params.get("q");
  const minOpportunity = parseFloat(params.get("min_opportunity") || "0");
  const limit = Math.min(parseInt(params.get("limit") || "30", 10), 100);
  const offset = parseInt(params.get("offset") || "0", 10);

  const admin = getAdmin();
  const nicheId = await resolveNicheId(admin, niche);
  const take = offset + limit;
  const results: JsonRecord[] = [];
  let rawTotal = 0;

  if (source === "all" || source === "signals") {
    let signalsQuery = admin
      .from("demand_signals")
      .select(
        "id, segment, entity_type, entity_id, query_text, city, intent_type, demand_stage, monthly_volume, trend_score, trend_direction, commercial_intent, gap_score, ai_visibility_score, opportunity_score, recommended_action, source, source_url, collected_at, confidence, is_manual, niches(name, slug)",
        { count: "exact" },
      )
      .eq("segment", segment)
      .gte("opportunity_score", minOpportunity)
      .order("opportunity_score", { ascending: false })
      .range(0, take - 1);

    if (nicheId) signalsQuery = signalsQuery.eq("niche_id", nicheId);
    if (city) signalsQuery = signalsQuery.ilike("city", `%${city}%`);
    if (q) signalsQuery = signalsQuery.ilike("query_text", `%${q}%`);

    const { data, count } = await signalsQuery;
    rawTotal += count ?? 0;

    for (const item of data ?? []) {
      const nicheInfo = item.niches as unknown as JsonRecord | null;
      results.push({
        id: item.id,
        source_type: "demand_signal",
        segment: item.segment,
        entity_type: item.entity_type,
        entity_id: item.entity_id,
        query: item.query_text,
        city: item.city,
        intent_type: item.intent_type,
        demand_stage: item.demand_stage,
        monthly_volume: item.monthly_volume,
        trend_score: item.trend_score,
        trend_direction: item.trend_direction,
        commercial_intent: item.commercial_intent,
        gap_score: item.gap_score,
        ai_visibility_score: item.ai_visibility_score,
        opportunity_score: item.opportunity_score,
        recommended_action: item.recommended_action,
        niche: nicheInfo,
        source: item.source,
        source_url: item.source_url,
        collected_at: item.collected_at,
        confidence: item.confidence,
        is_manual: item.is_manual,
        freshness: freshness(item.collected_at),
      });
    }
  }

  if ((source === "all" || source === "questions") && !city) {
    let questionsQuery = admin
      .from("questions")
      .select(
        "id, question_text, slug, monthly_volume, gap_score, intent_type, demand_stage, trend_score, trend_direction, source_url, collected_at, confidence, is_manual, has_expert_name, has_specific_examples, has_source_link, has_specific_numbers, niches(name, slug)",
        { count: "exact" },
      )
      .eq("is_active", true)
      .order("monthly_volume", { ascending: false })
      .range(0, take - 1);

    if (nicheId) questionsQuery = questionsQuery.eq("niche_id", nicheId);
    if (q) questionsQuery = questionsQuery.ilike("question_text", `%${q}%`);

    const { data, count } = await questionsQuery;
    rawTotal += count ?? 0;

    for (const item of data ?? []) {
      const intent = item.intent_type as DemandIntent | null;
      const opportunityScore = calculateDemandOpportunityScore({
        monthlyVolume: toNumber(item.monthly_volume),
        trendScore: toNumber(item.trend_score),
        gapScore: toNumber(item.gap_score),
        commercialIntent:
          intent === "transactional" ? 0.9 : intent === "recommendation" ? 0.7 : 0.35,
        aiVisibilityScore:
          [
            item.has_expert_name,
            item.has_specific_examples,
            item.has_source_link,
            item.has_specific_numbers,
          ].filter(Boolean).length * 25,
        confidence: toNumber(item.confidence, 0.7),
      });

      if (opportunityScore < minOpportunity) continue;

      const nicheInfo = item.niches as unknown as JsonRecord | null;
      results.push({
        id: item.id,
        source_type: "question",
        segment: "solo",
        entity_type: "question",
        query: item.question_text,
        url: `${APP_URL}/questions/${item.slug}`,
        intent_type: intent,
        demand_stage: item.demand_stage || inferDemandStage(intent),
        monthly_volume: item.monthly_volume,
        trend_score: item.trend_score,
        trend_direction: item.trend_direction,
        commercial_intent:
          intent === "transactional" ? 0.9 : intent === "recommendation" ? 0.7 : 0.35,
        gap_score: item.gap_score,
        ai_visibility_score:
          [
            item.has_expert_name,
            item.has_specific_examples,
            item.has_source_link,
            item.has_specific_numbers,
          ].filter(Boolean).length * 25,
        opportunity_score: opportunityScore,
        recommended_action: "Опубликовать экспертный ответ и связать его с CTA",
        niche: nicheInfo,
        source: item.is_manual ? "manual" : "questions",
        source_url: item.source_url,
        collected_at: item.collected_at,
        confidence: item.confidence,
        is_manual: item.is_manual,
        freshness: freshness(item.collected_at),
      });
    }
  }

  const data = results
    .sort(
      (a, b) =>
        toNumber(b.opportunity_score) - toNumber(a.opportunity_score),
    )
    .slice(offset, offset + limit);

  return NextResponse.json({
    data,
    pagination: {
      total: rawTotal,
      limit,
      offset,
      has_more: offset + limit < rawTotal,
    },
    meta: {
      description:
        "Local Demand API: спрос, тренды, слепые зоны AI и приоритетные действия для Solo, B2B и агентств.",
      filters: {
        source,
        segment,
        niche: niche || "all",
        city: city || "all",
        min_opportunity: minOpportunity,
      },
      updated_at: new Date().toISOString(),
    },
  });
}
