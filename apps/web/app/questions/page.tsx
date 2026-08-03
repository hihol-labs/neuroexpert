import Link from "next/link";
import type { Metadata } from "next";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { generateItemListSchema } from "@/lib/schema-org";
import { CatalogFooter, CatalogHeader } from "@/components/catalog/catalog-shell";

function getAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export const metadata: Metadata = {
  title: "Вопросы экспертам | НейроЭксперт",
  description:
    "Популярные вопросы с экспертными ответами. Найдите ответ от проверенного специалиста.",
};

export const dynamic = "force-dynamic";
export const revalidate = 600;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://neuroexpertise.ru";

interface SearchParams {
  niche?: string;
}

export default async function QuestionsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = getAdmin();

  // Get niches for filter
  const { data: niches } = await supabase
    .from("niches")
    .select("name, slug, icon")
    .eq("is_active", true)
    .order("name");

  // Get questions with answers count
  let query = supabase
    .from("questions")
    .select("id, question_text, slug, monthly_volume, gap_score, niche_id, niches(name, icon)")
    .eq("is_active", true)
    .order("monthly_volume", { ascending: false })
    .limit(100);

  if (searchParams.niche) {
    const { data: nicheData } = await supabase
      .from("niches")
      .select("id")
      .eq("slug", searchParams.niche)
      .single();
    if (nicheData) {
      query = query.eq("niche_id", nicheData.id);
    }
  }

  const { data: questions } = await query;

  // Count answers per question
  const questionIds = (questions ?? []).map((q) => q.id);
  const { data: answerCounts } = questionIds.length
    ? await supabase
        .from("content_packages")
        .select("question_id")
        .in("question_id", questionIds)
        .eq("status", "published")
    : { data: [] };

  const countMap: Record<string, number> = {};
  for (const a of answerCounts ?? []) {
    if (a.question_id) {
      countMap[a.question_id] = (countMap[a.question_id] || 0) + 1;
    }
  }

  const schemas = [
    generateItemListSchema(
      "Вопросы экспертам НейроЭксперт",
      (questions ?? []).slice(0, 100).map((question) => ({
        name: question.question_text,
        url: `${APP_URL}/questions/${question.slug}`,
        description: question.monthly_volume
          ? `${question.monthly_volume.toLocaleString("ru-RU")} запросов в месяц`
          : null,
      })),
    ),
  ];

  return (
    <div className="catalog-shell catalog-questions">
      {schemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}

      <CatalogHeader active="questions" />

      <main className="catalog-main mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Вопросы экспертам
        </h1>
        <p className="text-gray-600 mb-6">
          Популярные вопросы с экспертными ответами
        </p>

        {/* Niche filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          <Link
            href="/questions"
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
              !searchParams.niche
                ? "bg-blue-600 text-white border-blue-600"
                : "text-gray-700 border-gray-300 hover:border-blue-300"
            }`}
          >
            Все
          </Link>
          {(niches ?? []).map((n) => (
            <Link
              key={n.slug}
              href={`/questions?niche=${n.slug}`}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                searchParams.niche === n.slug
                  ? "bg-blue-600 text-white border-blue-600"
                  : "text-gray-700 border-gray-300 hover:border-blue-300"
              }`}
            >
              {n.icon} {n.name}
            </Link>
          ))}
        </div>

        {/* Questions list */}
        {!(questions ?? []).length ? (
          <p className="text-gray-500 text-center py-12">
            Вопросов пока нет
          </p>
        ) : (
          <div className="space-y-3">
            {(questions ?? []).map((q) => {
              const niche = q.niches as unknown as {
                name: string;
                icon: string;
              } | null;
              const answerCount = countMap[q.id] || 0;

              return (
                <Link
                  key={q.id}
                  href={`/questions/${q.slug}`}
                  className="flex flex-col gap-3 border rounded-lg px-4 py-4 hover:border-blue-300 hover:shadow-sm transition-all sm:flex-row sm:items-center sm:justify-between sm:px-5"
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-gray-900">
                      {q.question_text}
                    </h3>
                    <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
                      {niche && (
                        <span>
                          {niche.icon} {niche.name}
                        </span>
                      )}
                      {q.monthly_volume > 0 && (
                        <span>
                          {q.monthly_volume.toLocaleString("ru-RU")}/мес
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-left sm:ml-4 sm:text-center">
                    <span
                      className={`text-lg font-bold ${answerCount > 0 ? "text-blue-600" : "text-gray-300"}`}
                    >
                      {answerCount}
                    </span>
                    <p className="text-xs text-gray-400">
                      {answerCount === 1
                        ? "ответ"
                        : answerCount > 1 && answerCount < 5
                          ? "ответа"
                          : "ответов"}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      <CatalogFooter />
    </div>
  );
}
