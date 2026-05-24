import { NextResponse } from "next/server";
import {
  calculateDemandOpportunityScore,
  calculateTrustComponents,
  inferDemandStage,
  type DemandIntent,
} from "shared";
import { getAdmin, getUser, toNumber } from "@/lib/demand-to-revenue-server";

type Row = Record<string, unknown>;

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getAdmin();
  const [{ data: profile }, { data: orders }, { data: content }, { data: leads }, { data: proofAssets }, { data: citations }] =
    await Promise.all([
      admin
        .from("profiles")
        .select("id, trust_score, trust_components, verification_status, knows_about, niche_id")
        .eq("id", user.id)
        .single(),
      admin
        .from("orders")
        .select("id, status, questions(id, question_text, monthly_volume, gap_score, intent_type, demand_stage, trend_score, trend_direction, has_expert_name, has_specific_examples, has_source_link, has_specific_numbers)")
        .eq("expert_id", user.id)
        .in("status", ["pending", "accepted"])
        .limit(30),
      admin
        .from("content_packages")
        .select("id, status, question_id")
        .eq("expert_id", user.id),
      admin
        .from("leads")
        .select("id")
        .eq("expert_id", user.id)
        .gte("created_at", new Date(Date.now() - 30 * 86_400_000).toISOString()),
      admin
        .from("proof_of_human_assets")
        .select("id, status")
        .eq("profile_id", user.id),
      admin
        .from("citation_checks")
        .select("id, is_cited")
        .eq("expert_id", user.id)
        .gte("checked_at", new Date(Date.now() - 30 * 86_400_000).toISOString()),
    ]);

  const answeredQuestionIds = new Set(
    ((content ?? []) as Row[])
      .filter((item) => ["published", "approved", "generating", "processing"].includes(String(item.status)))
      .map((item) => item.question_id)
      .filter(Boolean)
      .map(String),
  );

  const recommendations = ((orders ?? []) as Row[])
    .map((order) => {
      const question = order.questions as Row | null;
      if (!question || answeredQuestionIds.has(String(question.id))) return null;
      const intent = question.intent_type as DemandIntent | null;
      const aiVisibilityScore =
        [
          question.has_expert_name,
          question.has_specific_examples,
          question.has_source_link,
          question.has_specific_numbers,
        ].filter(Boolean).length * 25;
      const opportunityScore = calculateDemandOpportunityScore({
        monthlyVolume: toNumber(question.monthly_volume),
        trendScore: toNumber(question.trend_score),
        gapScore: toNumber(question.gap_score),
        commercialIntent:
          intent === "transactional" ? 0.9 : intent === "recommendation" ? 0.75 : intent === "comparative" ? 0.6 : 0.35,
        aiVisibilityScore,
        confidence: 0.8,
      });
      return {
        order_id: order.id,
        question_id: question.id,
        question: question.question_text,
        opportunity_score: opportunityScore,
        intent_type: intent,
        demand_stage: question.demand_stage || inferDemandStage(intent),
        trend_score: question.trend_score ?? 0,
        trend_direction: question.trend_direction,
        gap_score: question.gap_score ?? 0,
        ai_weakness: {
          lacks_expert_name: !question.has_expert_name,
          lacks_examples: !question.has_specific_examples,
          lacks_sources: !question.has_source_link,
          lacks_numbers: !question.has_specific_numbers,
        },
        recommended_recording:
          "Запишите 3-5 минут: прямой ответ, пример из практики, ограничения метода, цена/сроки, когда обращаться.",
      };
    })
    .filter(Boolean)
    .sort((a, b) => toNumber((b as Row).opportunity_score) - toNumber((a as Row).opportunity_score))
    .slice(0, 7);

  const proofScore = Math.min(
    100,
    ((proofAssets ?? []) as Row[]).filter((asset) => asset.status === "verified").length * 22 +
      ((proofAssets ?? []) as Row[]).filter((asset) => asset.status === "needs_review").length * 8,
  );
  const aiVisibilityScore = Math.min(
    100,
    ((citations ?? []) as Row[]).filter((item) => item.is_cited).length * 5,
  );
  const demandScore = Math.min(100, (content?.length ?? 0) * 8 + recommendations.length * 5);
  const conversionScore = Math.min(100, (leads?.length ?? 0) * 12);
  const trust = calculateTrustComponents({
    proofScore,
    aiVisibilityScore,
    demandScore,
    conversionScore,
  });

  return NextResponse.json({
    profile: profile ?? {},
    recommendations,
    trust,
    proof_status: {
      verification_status: (profile as Row | null)?.verification_status ?? "unverified",
      assets_total: proofAssets?.length ?? 0,
      verified_assets: ((proofAssets ?? []) as Row[]).filter((asset) => asset.status === "verified").length,
      needs_review: ((proofAssets ?? []) as Row[]).filter((asset) => asset.status === "needs_review").length,
    },
  });
}
