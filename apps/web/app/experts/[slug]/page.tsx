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
import { generateExpertMetadata } from "@/lib/seo";
import { generatePersonSchema, generateBreadcrumbSchema } from "@/lib/schema-org";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://neuroexpertise.ru";

interface Props {
  params: { slug: string };
}

async function getExpertData(slug: string) {
  const supabase = getAdmin();

  const { data: expert } = await supabase
    .from("profiles")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (!expert) return null;

  const { data: articles } = await supabase
    .from("content_packages")
    .select("title, slug, published_at, word_count, meta_description")
    .eq("expert_id", expert.id)
    .eq("status", "published")
    .order("published_at", { ascending: false });

  const { data: niche } = expert.niche_id
    ? await supabase.from("niches").select("name, icon").eq("id", expert.niche_id).single()
    : { data: null };

  return { expert, articles: articles ?? [], niche };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getExpertData(params.slug);
  if (!data) return { title: "Эксперт не найден" };
  return generateExpertMetadata(data.expert);
}

export const revalidate = 3600;

export default async function ExpertProfilePage({ params }: Props) {
  const data = await getExpertData(params.slug);
  if (!data) notFound();

  const { expert, articles, niche } = data;

  const schemas = [
    generatePersonSchema(expert),
    generateBreadcrumbSchema([
      { name: "Главная", url: APP_URL },
      { name: "Эксперты", url: `${APP_URL}/experts` },
      { name: expert.full_name, url: `${APP_URL}/experts/${expert.slug}` },
    ]),
  ];

  return (
    <div className="min-h-screen bg-white">
      {schemas.map((schema, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      ))}

      <header className="border-b bg-white">
        <nav className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
          <Link href="/" className="text-lg font-bold text-gray-900">НейроЭксперт</Link>
          <div className="flex gap-4 text-sm">
            <Link href="/experts" className="text-gray-600 hover:text-gray-900">Эксперты</Link>
            <Link href="/audit" className="text-gray-600 hover:text-gray-900">Аудит</Link>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        {/* Breadcrumbs */}
        <nav className="text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-gray-700">Главная</Link>
          {" / "}
          <Link href="/experts" className="hover:text-gray-700">Эксперты</Link>
          {" / "}
          <span className="text-gray-900">{expert.full_name}</span>
        </nav>

        {/* Profile header */}
        <div className="flex items-start gap-6 mb-8">
          <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center text-4xl font-bold text-blue-600 flex-shrink-0">
            {expert.full_name.charAt(0)}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{expert.full_name}</h1>
            {expert.qualification && <p className="text-lg text-gray-600 mt-1">{expert.qualification}</p>}
            <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-500">
              {niche && <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{niche.icon} {niche.name}</span>}
              {expert.city && <span>{expert.city}</span>}
              {expert.years_experience && <span>{expert.years_experience} лет опыта</span>}
              {expert.trust_score > 0 && <span>Trust Score: {expert.trust_score.toFixed(1)}</span>}
            </div>
          </div>
        </div>

        {/* E-E-A-T block */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {expert.alumni_of && (
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Образование</p>
              <p className="text-sm font-medium text-gray-900 mt-1">{expert.alumni_of}</p>
            </div>
          )}
          {expert.works_for && (
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Место работы</p>
              <p className="text-sm font-medium text-gray-900 mt-1">{expert.works_for}</p>
            </div>
          )}
          {expert.knows_about?.length ? (
            <div className="bg-gray-50 rounded-lg p-4 sm:col-span-2">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Области экспертизы</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {(expert.knows_about as string[]).map((topic, i) => (
                  <span key={i} className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-sm">{topic}</span>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Bio */}
        {expert.bio && <p className="text-gray-700 mb-8">{expert.bio}</p>}

        {/* Articles */}
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Публикации ({articles.length})</h2>
        {articles.length === 0 ? (
          <p className="text-gray-500">Публикаций пока нет</p>
        ) : (
          <div className="space-y-4">
            {articles.map((a) => (
              <Link
                key={a.slug}
                href={`/experts/${expert.slug}/${a.slug}`}
                className="block border rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50/50 transition-colors"
              >
                <h3 className="font-semibold text-gray-900">{a.title}</h3>
                {a.meta_description && <p className="text-sm text-gray-600 mt-1 line-clamp-2">{a.meta_description}</p>}
                <div className="flex gap-3 mt-2 text-xs text-gray-500">
                  {a.published_at && <span>{new Date(a.published_at).toLocaleDateString("ru-RU")}</span>}
                  {a.word_count && <span>{a.word_count} слов</span>}
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* CTA */}
        {expert.consultation_url && (
          <div className="mt-8 bg-blue-600 rounded-xl p-6 text-center text-white">
            <h2 className="text-xl font-bold">Записаться к эксперту</h2>
            {expert.consultation_price && (
              <p className="text-blue-100 mt-1">{expert.consultation_price.toLocaleString("ru-RU")} &#8381;</p>
            )}
            <a
              href={expert.consultation_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block rounded-lg bg-white px-6 py-2 font-semibold text-blue-600 hover:bg-blue-50"
            >
              Записаться
            </a>
          </div>
        )}
      </main>

      <footer className="bg-gray-900 py-8 mt-12">
        <div className="mx-auto max-w-4xl px-6 text-center text-sm text-gray-400">
          &copy; {new Date().getFullYear()} НейроЭксперт
        </div>
      </footer>
    </div>
  );
}
