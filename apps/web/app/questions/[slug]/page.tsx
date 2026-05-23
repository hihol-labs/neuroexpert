import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import {
  generateBreadcrumbSchema,
  generateQAPageSchema,
} from "@/lib/schema-org";

function getAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://neuroexpertise.ru";

interface Props {
  params: { slug: string };
}

async function getQuestionData(slug: string) {
  const supabase = getAdmin();

  const { data: question } = await supabase
    .from("questions")
    .select("id, question_text, slug, monthly_volume, gap_score, niche_id, niches(name, icon)")
    .eq("slug", slug)
    .single();

  if (!question) return null;

  // All expert answers to this question
  const { data: answers } = await supabase
    .from("content_packages")
    .select(
      "id, title, slug, meta_description, word_count, published_at, voice_id, profiles!inner(full_name, slug, qualification, trust_score, is_verified, avg_rating, review_count, city)",
    )
    .eq("question_id", question.id)
    .eq("status", "published")
    .order("published_at", { ascending: false });

  // Related questions (sub_queries + same niche)
  const { data: subQueries } = await supabase
    .from("sub_queries")
    .select("query_text")
    .eq("parent_question_id", question.id)
    .limit(5);

  const { data: relatedQuestions } = await supabase
    .from("questions")
    .select("question_text, slug, monthly_volume")
    .eq("niche_id", question.niche_id)
    .neq("id", question.id)
    .gte("gap_score", 5)
    .order("monthly_volume", { ascending: false })
    .limit(8);

  return {
    question,
    answers: answers ?? [],
    subQueries: subQueries ?? [],
    relatedQuestions: relatedQuestions ?? [],
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getQuestionData(params.slug);
  if (!data) return { title: "Вопрос не найден" };

  const q = data.question;
  const expertCount = data.answers.length;
  const title = `${q.question_text} — ответы ${expertCount} экспертов`;
  const description = `${expertCount} экспертов ответили на вопрос «${q.question_text}». Читайте экспертные ответы с аудио.`;

  return {
    title,
    description,
    openGraph: { title, description, url: `${APP_URL}/questions/${q.slug}` },
  };
}

export const revalidate = 3600;

export default async function QuestionPage({ params }: Props) {
  const data = await getQuestionData(params.slug);
  if (!data) notFound();

  const { question, answers, subQueries, relatedQuestions } = data;
  const niche = question.niches as unknown as { name: string; icon: string } | null;
  const schemas = [
    generateQAPageSchema(
      question,
      answers.map((answer) => {
        const expert = answer.profiles as unknown as { full_name: string; slug: string };
        return {
          title: answer.title,
          slug: answer.slug,
          meta_description: answer.meta_description,
          published_at: answer.published_at,
          profiles: expert,
        };
      }),
    ),
    generateBreadcrumbSchema([
      { name: "Главная", url: APP_URL },
      { name: "Вопросы", url: `${APP_URL}/questions` },
      { name: question.question_text, url: `${APP_URL}/questions/${question.slug}` },
    ]),
  ];

  return (
    <div className="min-h-screen bg-white">
      {schemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}

      <header className="border-b bg-white">
        <nav className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="text-lg font-bold text-gray-900">
            НейроЭксперт
          </Link>
          <div className="flex gap-4 text-sm">
            <Link href="/experts" className="text-gray-600 hover:text-gray-900">
              Эксперты
            </Link>
            <Link href="/questions" className="text-blue-600 font-medium">
              Вопросы
            </Link>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        {/* Breadcrumbs */}
        <nav className="text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-gray-700">Главная</Link>
          {" / "}
          <Link href="/questions" className="hover:text-gray-700">Вопросы</Link>
          {" / "}
          <span className="text-gray-900">{question.question_text}</span>
        </nav>

        {/* Question header */}
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          {question.question_text}
        </h1>
        <div className="flex flex-wrap gap-3 text-sm text-gray-500 mb-8">
          {niche && (
            <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
              {niche.icon} {niche.name}
            </span>
          )}
          {question.monthly_volume > 0 && (
            <span>{question.monthly_volume.toLocaleString("ru-RU")} запросов/мес</span>
          )}
          <span>{answers.length} экспертных ответов</span>
          {answers.some((a) => a.voice_id) && (
            <span>🎙️ С аудио</span>
          )}
        </div>

        {/* Expert answers */}
        {answers.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center mb-8">
            <p className="text-yellow-800 font-medium">
              На этот вопрос пока нет экспертных ответов.
            </p>
            <p className="text-sm text-yellow-700 mt-1">
              Нейросети дают слабый ответ (gap score: {question.gap_score}/10).
              Станьте первым экспертом!
            </p>
            <Link
              href="/register"
              className="mt-4 inline-block rounded-lg bg-blue-600 px-6 py-2 text-white font-medium hover:bg-blue-700"
            >
              Зарегистрироваться
            </Link>
          </div>
        ) : (
          <div className="space-y-4 mb-8">
            <h2 className="text-xl font-semibold text-gray-900">
              Ответы экспертов
            </h2>
            {answers.map((a) => {
              const expert = a.profiles as unknown as {
                full_name: string;
                slug: string;
                qualification: string | null;
                trust_score: number;
                is_verified: boolean;
                avg_rating: number;
                review_count: number;
                city: string | null;
              };
              return (
                <Link
                  key={a.id}
                  href={`/experts/${expert.slug}/${a.slug}`}
                  className="block border rounded-xl p-5 hover:border-blue-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="relative w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-xl font-bold text-blue-600 flex-shrink-0">
                      {expert.full_name.charAt(0)}
                      {expert.is_verified && (
                        <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-white text-[10px]">
                          ✓
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900">
                        {expert.full_name}
                      </h3>
                      {expert.qualification && (
                        <p className="text-sm text-gray-500">
                          {expert.qualification}
                        </p>
                      )}
                      {a.meta_description && (
                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                          {a.meta_description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-400">
                        {expert.trust_score > 0 && (
                          <span>Score: {expert.trust_score.toFixed(1)}</span>
                        )}
                        {expert.avg_rating > 0 && (
                          <span>
                            {"★".repeat(Math.round(expert.avg_rating))} ({expert.review_count})
                          </span>
                        )}
                        {a.word_count && <span>{a.word_count} слов</span>}
                        {a.voice_id && <span>🎙️ Аудио</span>}
                        {a.published_at && (
                          <span>
                            {new Date(a.published_at).toLocaleDateString("ru-RU")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Sub-queries */}
        {subQueries.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Люди также спрашивают
            </h2>
            <div className="space-y-2">
              {subQueries.map((sq, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-700"
                >
                  <span className="text-blue-500 flex-shrink-0 mt-0.5">?</span>
                  <span>{sq.query_text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Related questions */}
        {relatedQuestions.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Похожие вопросы
            </h2>
            <div className="space-y-2">
              {relatedQuestions.map((rq) => (
                <Link
                  key={rq.slug}
                  href={`/questions/${rq.slug}`}
                  className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 text-sm hover:border-blue-300 transition-colors"
                >
                  <span className="text-gray-900">{rq.question_text}</span>
                  {rq.monthly_volume > 0 && (
                    <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                      {rq.monthly_volume.toLocaleString("ru-RU")}/мес
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="bg-blue-600 rounded-xl p-6 text-center text-white">
          <h2 className="text-xl font-bold">Вы эксперт в этой теме?</h2>
          <p className="text-blue-100 text-sm mt-1">
            Наговорите ответ за 10 минут — мы опубликуем вашу экспертную статью
          </p>
          <Link
            href="/register"
            className="mt-4 inline-block rounded-lg bg-white px-6 py-2 font-semibold text-blue-600 hover:bg-blue-50"
          >
            Зарегистрироваться
          </Link>
        </div>
      </main>

      <footer className="bg-gray-900 py-8 mt-12">
        <div className="mx-auto max-w-4xl px-4 text-center text-sm text-gray-400 sm:px-6">
          &copy; {new Date().getFullYear()} НейроЭксперт
        </div>
      </footer>
    </div>
  );
}
