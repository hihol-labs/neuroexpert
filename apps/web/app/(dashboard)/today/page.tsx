import Link from "next/link";
import { AlertCircle, CheckCircle2, Mic, ShieldCheck, TrendingUp } from "lucide-react";
import { Card, CardTitle, CardValue } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAdmin, getUser, toNumber } from "@/lib/demand-to-revenue-server";
import {
  calculateDemandOpportunityScore,
  calculateTrustComponents,
  inferDemandStage,
  type DemandIntent,
} from "shared";

type Row = Record<string, unknown>;

export default async function TodayPage() {
  const user = await getUser();
  if (!user) return null;

  const admin = getAdmin();
  const [{ data: profile }, { data: orders }, { data: content }, { data: leads }, { data: proofAssets }, { data: citations }] =
    await Promise.all([
      admin
        .from("profiles")
        .select("trust_score, trust_components, verification_status, practice_limitations")
        .eq("id", user.id)
        .single(),
      admin
        .from("orders")
        .select("id, status, questions(id, question_text, monthly_volume, gap_score, intent_type, demand_stage, trend_score, trend_direction, has_expert_name, has_specific_examples, has_source_link, has_specific_numbers)")
        .eq("expert_id", user.id)
        .in("status", ["pending", "accepted"])
        .limit(50),
      admin.from("content_packages").select("id, status, question_id").eq("expert_id", user.id),
      admin
        .from("leads")
        .select("id")
        .eq("expert_id", user.id)
        .gte("created_at", new Date(Date.now() - 30 * 86_400_000).toISOString()),
      admin.from("proof_of_human_assets").select("id, asset_type, title, status").eq("profile_id", user.id),
      admin
        .from("citation_checks")
        .select("id, is_cited")
        .eq("expert_id", user.id)
        .gte("checked_at", new Date(Date.now() - 30 * 86_400_000).toISOString()),
    ]);

  const answered = new Set(
    ((content ?? []) as Row[])
      .filter((item) => ["published", "approved", "generating", "processing"].includes(String(item.status)))
      .map((item) => String(item.question_id)),
  );

  const recommendations = ((orders ?? []) as Row[])
    .map((order) => {
      const question = order.questions as Row | null;
      if (!question || answered.has(String(question.id))) return null;
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
        intent_type: intent || "informational",
        demand_stage: question.demand_stage || inferDemandStage(intent),
        trend_score: toNumber(question.trend_score),
        gap_score: toNumber(question.gap_score),
        lacks: [
          !question.has_expert_name ? "нет эксперта" : null,
          !question.has_specific_examples ? "нет примеров" : null,
          !question.has_source_link ? "нет источников" : null,
          !question.has_specific_numbers ? "нет цифр" : null,
        ].filter(Boolean),
      };
    })
    .filter(Boolean)
    .sort((a, b) => toNumber((b as Row).opportunity_score) - toNumber((a as Row).opportunity_score))
    .slice(0, 7) as Row[];

  const proofScore = Math.min(
    100,
    ((proofAssets ?? []) as Row[]).filter((asset) => asset.status === "verified").length * 22 +
      ((proofAssets ?? []) as Row[]).filter((asset) => asset.status === "needs_review").length * 8,
  );
  const trust = calculateTrustComponents({
    proofScore,
    aiVisibilityScore: Math.min(100, ((citations ?? []) as Row[]).filter((item) => item.is_cited).length * 5),
    demandScore: Math.min(100, (content?.length ?? 0) * 8 + recommendations.length * 5),
    conversionScore: Math.min(100, (leads?.length ?? 0) * 12),
  });

  const components = (profile?.trust_components as Row | null) || trust.components;
  const proofTodo = ["identity", "diploma", "case", "voice", "review"].filter(
    (type) => !((proofAssets ?? []) as Row[]).some((asset) => asset.asset_type === type),
  );

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Что записать сегодня</h1>
          <p className="mt-1 text-sm text-gray-500">
            Приоритет по тренду, intent, спросу и слабости AI-ответа.
          </p>
        </div>
        <Link href="/content/new" className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          <Mic className="h-4 w-4" />
          Записать ответ
        </Link>
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-4">
        <Card>
          <CardTitle>Trust Score</CardTitle>
          <CardValue>{trust.trust_score.toFixed(1)}</CardValue>
        </Card>
        <Card>
          <CardTitle>Тем сегодня</CardTitle>
          <CardValue>{recommendations.length}</CardValue>
        </Card>
        <Card>
          <CardTitle>Proof статус</CardTitle>
          <CardValue><Badge status={String(profile?.verification_status || "unverified")} /></CardValue>
        </Card>
        <Card>
          <CardTitle>Заявки 30д</CardTitle>
          <CardValue>{leads?.length ?? 0}</CardValue>
        </Card>
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <div className="bg-white rounded-xl border p-6">
          <div className="mb-5 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            <h2 className="font-semibold text-gray-900">Приоритетные темы</h2>
          </div>
          {recommendations.length === 0 ? (
            <p className="text-sm text-gray-500">Нет открытых тем. Проверьте сбор спроса или создайте новый ответ.</p>
          ) : (
            <div className="space-y-4">
              {recommendations.map((item) => (
                <div key={String(item.order_id)} className="rounded-lg border p-4">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <p className="text-sm font-medium text-gray-900">{String(item.question)}</p>
                    <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                      {Math.round(toNumber(item.opportunity_score))}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge status={String(item.intent_type)} />
                    <Badge status={String(item.demand_stage)} />
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-700">gap {String(item.gap_score)}</span>
                    {((item.lacks as string[]) || []).map((label) => (
                      <span key={label} className="rounded-full bg-red-50 px-2 py-0.5 text-red-700">{label}</span>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-gray-500">
                    Структура записи: прямой ответ → пример → ограничения → цифры/сроки → когда обращаться.
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border p-6">
            <div className="mb-5 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-blue-600" />
              <h2 className="font-semibold text-gray-900">Trust Score по компонентам</h2>
            </div>
            {[
              ["Доверие / Proof", components.proof],
              ["AI-видимость", components.ai_visibility],
              ["Спрос", components.demand],
              ["Конверсия", components.conversion],
            ].map(([label, value]) => (
              <div key={String(label)} className="mb-4 last:mb-0">
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-gray-600">{String(label)}</span>
                  <span className="font-medium text-gray-900">{Math.round(toNumber(value))}</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100">
                  <div className="h-2 rounded-full bg-blue-600" style={{ width: `${Math.max(0, Math.min(100, toNumber(value)))}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border p-6">
            <div className="mb-5 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              <h2 className="font-semibold text-gray-900">Proof-of-Human</h2>
            </div>
            {proofTodo.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-green-700">
                <CheckCircle2 className="h-4 w-4" />
                Базовые доказательства добавлены.
              </div>
            ) : (
              <div className="space-y-2">
                {proofTodo.map((item) => (
                  <div key={item} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{item}</span>
                    <Link href="/profile" className="text-blue-600 hover:underline">Добавить</Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
