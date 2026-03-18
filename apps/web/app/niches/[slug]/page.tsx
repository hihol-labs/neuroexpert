import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

function getAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://neuroexpertise.ru";

// Related niches mapping
const RELATED_NICHES: Record<string, string[]> = {
  psychology: ["coaching", "logopedics", "education"],
  law: ["finance", "accounting", "insurance"],
  nutrition: ["fitness", "medicine", "cosmetology"],
  finance: ["law", "accounting", "insurance", "business-consulting"],
  "business-consulting": ["marketing", "finance", "career-hr"],
  medicine: ["nutrition", "fitness", "cosmetology", "veterinary"],
  fitness: ["nutrition", "medicine", "coaching"],
  education: ["psychology", "coaching", "career-hr"],
  marketing: ["business-consulting", "it", "design"],
  it: ["marketing", "design"],
  design: ["marketing", "it", "real-estate"],
  "real-estate": ["law", "finance", "insurance"],
  "career-hr": ["business-consulting", "coaching", "education"],
  cosmetology: ["medicine", "nutrition"],
  logopedics: ["psychology", "education"],
  coaching: ["psychology", "fitness", "career-hr"],
  accounting: ["law", "finance"],
  veterinary: ["medicine"],
  insurance: ["law", "finance", "real-estate"],
  tourism: ["marketing"],
};

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = getAdmin();
  const { data: niche } = await supabase
    .from("niches")
    .select("name")
    .eq("slug", params.slug)
    .single();

  if (!niche) return { title: "Ниша не найдена" };

  return {
    title: `${niche.name} — эксперты и вопросы | НейроЭксперт`,
    description: `Найдите экспертов и ответы по теме «${niche.name}». Экспертные статьи, которые цитируют нейросети.`,
  };
}

export const revalidate = 3600;

export default async function NichePage({ params }: Props) {
  const supabase = getAdmin();

  const { data: niche } = await supabase
    .from("niches")
    .select("id, name, slug, icon, description")
    .eq("slug", params.slug)
    .eq("is_active", true)
    .single();

  if (!niche) notFound();

  // Experts in this niche
  const { data: experts } = await supabase
    .from("profiles")
    .select("full_name, slug, qualification, trust_score, avg_rating, review_count, is_verified, city")
    .eq("niche_id", niche.id)
    .eq("is_published", true)
    .order("trust_score", { ascending: false })
    .limit(20);

  // Top questions in this niche
  const { data: questions } = await supabase
    .from("questions")
    .select("question_text, slug, monthly_volume, gap_score")
    .eq("niche_id", niche.id)
    .eq("is_active", true)
    .order("monthly_volume", { ascending: false })
    .limit(15);

  // Recent articles in this niche
  const expertIds = (experts ?? []).map((e) => e.slug);
  const { data: articles } = await supabase
    .from("content_packages")
    .select("title, slug, published_at, word_count, profiles!inner(full_name, slug)")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(10);

  // Filter articles to this niche's experts
  const nicheArticles = (articles ?? []).filter((a) => {
    const p = a.profiles as unknown as { slug: string };
    return expertIds.includes(p?.slug);
  });

  // Related niches
  const relatedSlugs = RELATED_NICHES[niche.slug] ?? [];
  const { data: relatedNiches } = relatedSlugs.length
    ? await supabase
        .from("niches")
        .select("name, slug, icon")
        .in("slug", relatedSlugs)
        .eq("is_active", true)
    : { data: [] };

  // Stats
  const expertCount = experts?.length ?? 0;
  const questionCount = questions?.length ?? 0;
  const articleCount = nicheArticles.length;

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b bg-white">
        <nav className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
          <Link href="/" className="text-lg font-bold text-gray-900">НейроЭксперт</Link>
          <div className="flex gap-4 text-sm">
            <Link href="/experts" className="text-gray-600 hover:text-gray-900">Эксперты</Link>
            <Link href="/questions" className="text-gray-600 hover:text-gray-900">Вопросы</Link>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <span className="text-4xl">{niche.icon}</span>
          <h1 className="text-3xl font-bold text-gray-900 mt-2">{niche.name}</h1>
          {niche.description && (
            <p className="text-gray-600 mt-2">{niche.description}</p>
          )}
          <div className="flex gap-6 mt-4 text-sm text-gray-500">
            <span>{expertCount} экспертов</span>
            <span>{questionCount} вопросов</span>
            <span>{articleCount} статей</span>
          </div>
        </div>

        {/* Experts */}
        {(experts ?? []).length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Эксперты
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {(experts ?? []).map((e) => (
                <Link
                  key={e.slug}
                  href={`/experts/${e.slug}`}
                  className="flex items-center gap-3 border rounded-lg p-4 hover:border-blue-300 transition-colors"
                >
                  <div className="relative w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-lg font-bold text-blue-600 flex-shrink-0">
                    {e.full_name.charAt(0)}
                    {e.is_verified && (
                      <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center text-white text-[8px]">✓</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{e.full_name}</p>
                    <div className="flex gap-2 text-xs text-gray-500">
                      {e.qualification && <span className="truncate">{e.qualification}</span>}
                      {e.trust_score > 0 && <span>Score: {e.trust_score.toFixed(1)}</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <Link href={`/experts?niche=${niche.slug}`} className="mt-3 inline-block text-sm text-blue-600 hover:text-blue-700">
              Все эксперты в нише →
            </Link>
          </section>
        )}

        {/* Top questions */}
        {(questions ?? []).length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Популярные вопросы
            </h2>
            <div className="space-y-2">
              {(questions ?? []).map((q) => (
                <Link
                  key={q.slug}
                  href={`/questions/${q.slug}`}
                  className="flex items-center justify-between border rounded-lg px-4 py-3 hover:border-blue-300 transition-colors"
                >
                  <span className="text-sm text-gray-900">{q.question_text}</span>
                  <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                    {q.monthly_volume > 0 ? `${q.monthly_volume.toLocaleString("ru-RU")}/мес` : ""}
                  </span>
                </Link>
              ))}
            </div>
            <Link href={`/questions?niche=${niche.slug}`} className="mt-3 inline-block text-sm text-blue-600 hover:text-blue-700">
              Все вопросы в нише →
            </Link>
          </section>
        )}

        {/* Recent articles */}
        {nicheArticles.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Последние публикации
            </h2>
            <div className="space-y-3">
              {nicheArticles.map((a) => {
                const p = a.profiles as unknown as { full_name: string; slug: string };
                return (
                  <Link
                    key={a.slug}
                    href={`/experts/${p.slug}/${a.slug}`}
                    className="block border rounded-lg p-4 hover:border-blue-300 transition-colors"
                  >
                    <h3 className="font-medium text-gray-900">{a.title}</h3>
                    <div className="flex gap-3 mt-1 text-xs text-gray-500">
                      <span>{p.full_name}</span>
                      {a.published_at && <span>{new Date(a.published_at).toLocaleDateString("ru-RU")}</span>}
                      {a.word_count && <span>{a.word_count} слов</span>}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Related niches */}
        {(relatedNiches ?? []).length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Смежные направления
            </h2>
            <div className="flex flex-wrap gap-2">
              {(relatedNiches ?? []).map((rn) => (
                <Link
                  key={rn.slug}
                  href={`/niches/${rn.slug}`}
                  className="px-4 py-2 rounded-full border border-gray-200 text-sm text-gray-700 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  {rn.icon} {rn.name}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* CTA */}
        <div className="bg-blue-600 rounded-xl p-6 text-center text-white">
          <h2 className="text-xl font-bold">Вы эксперт в {niche.name.toLowerCase()}?</h2>
          <p className="text-blue-100 text-sm mt-1">Зарегистрируйтесь — получайте клиентов из нейросетей и поиска</p>
          <Link href="/register" className="mt-4 inline-block rounded-lg bg-white px-6 py-2 font-semibold text-blue-600 hover:bg-blue-50">
            Зарегистрироваться
          </Link>
        </div>
      </main>

      <footer className="bg-gray-900 py-8 mt-12">
        <div className="mx-auto max-w-4xl px-6 text-center text-sm text-gray-400">
          &copy; {new Date().getFullYear()} НейроЭксперт
        </div>
      </footer>
    </div>
  );
}
