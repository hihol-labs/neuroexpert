import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";

function getAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
import { generateArticleMetadata } from "@/lib/seo";
import { BookingForm } from "@/components/experts/booking-form";
import { CatalogFooter, CatalogHeader } from "@/components/catalog/catalog-shell";
import { ArticleAnalytics } from "@/components/article/analytics";
import {
  generateArticleSchema,
  generatePersonSchema,
  generateFAQSchema,
  generateBreadcrumbSchema,
  generateHowToSchema,
  generateReviewSchemas,
} from "@/lib/schema-org";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://neuroexpertise.ru";

interface Props {
  params: { slug: string; articleSlug: string };
}

const getArticleData = cache(async (expertSlug: string, articleSlug: string) => {
  const supabase = getAdmin();

  const { data: expert } = await supabase
    .from("profiles")
    .select("*")
    .eq("slug", expertSlug)
    .eq("is_published", true)
    .single();

  if (!expert) return null;

  const { data: article } = await supabase
    .from("content_packages")
    .select("*, questions(question_text), voice_recordings(file_path, mime_type)")
    .eq("slug", articleSlug)
    .eq("expert_id", expert.id)
    .eq("status", "published")
    .single();

  if (!article) return null;

  // Похожие статьи
  const { data: related } = await supabase
    .from("content_packages")
    .select("title, slug")
    .eq("expert_id", expert.id)
    .eq("status", "published")
    .neq("id", article.id)
    .limit(5);

  // Ниша
  const { data: niche } = expert.niche_id
    ? await supabase.from("niches").select("name").eq("id", expert.niche_id).single()
    : { data: null };

  // Кол-во публикаций
  const { count: pubCount } = await supabase
    .from("content_packages")
    .select("id", { count: "exact", head: true })
    .eq("expert_id", expert.id)
    .eq("status", "published");

  // Похожие вопросы (sub_queries из expand_query)
  let relatedQuestions: Array<{ query_text: string }> = [];
  if (article.question_id) {
    const { data: subQueries } = await supabase
      .from("sub_queries")
      .select("query_text")
      .eq("parent_question_id", article.question_id)
      .limit(5);
    relatedQuestions = subQueries ?? [];
  }

  // Other experts who answered the same question (cross-linking)
  let otherExperts: Array<{ expert_name: string; expert_slug: string; article_slug: string; article_title: string }> = [];
  if (article.question_id) {
    const { data: others } = await supabase
      .from("content_packages")
      .select("title, slug, profiles!inner(full_name, slug)")
      .eq("question_id", article.question_id)
      .eq("status", "published")
      .neq("expert_id", expert.id)
      .limit(5);

    otherExperts = (others ?? []).map((o) => {
      const p = o.profiles as unknown as { full_name: string; slug: string };
      return { expert_name: p.full_name, expert_slug: p.slug, article_slug: o.slug, article_title: o.title };
    });
  }

  // Reviews (top 3)
  const { data: reviews } = await supabase
    .from("reviews")
    .select("reviewer_name, rating, review_text, created_at")
    .eq("expert_id", expert.id)
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(3);

  // Citation count
  const { count: citationCount } = await supabase
    .from("citation_checks")
    .select("id", { count: "exact", head: true })
    .eq("expert_id", expert.id)
    .eq("is_cited", true);

  // R-05: bucket voice приватный. В ISR-страницу запекается СТАБИЛЬНАЯ ссылка /api/audio/<voice_id>,
  // а подписанный URL создаётся роутом в момент запроса (302) - иначе подпись протухала бы в
  // закэшированной странице редко посещаемой статьи.
  const voice = article.voice_recordings as unknown as { file_path: string; mime_type: string | null } | null;
  const voiceId = (article as { voice_id?: string | null }).voice_id ?? null;
  const audioUrl = voice?.file_path && voiceId ? `/api/audio/${voiceId}` : null;

  return {
    expert, article, related: related ?? [], relatedQuestions, otherExperts,
    niche, pubCount: pubCount ?? 0, reviews: reviews ?? [], citationCount: citationCount ?? 0, audioUrl,
  };
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getArticleData(params.slug, params.articleSlug);
  if (!data) return { title: "Статья не найдена" };
  return generateArticleMetadata(data.article, data.expert);
}

export const revalidate = 3600;

// --- Markdown to HTML (simple) ---
function md(text: string): string {
  let html = text
    // Headers
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    // Bold
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    // Italic
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">$1</a>')
    // Numbered lists
    .replace(/^\d+\.\s+(.+)$/gm, "<li>$1</li>")
    // Paragraphs
    .replace(/\n\n/g, "</p><p>")
    // Line breaks
    .replace(/\n/g, "<br/>");

  // Wrap loose <li> in <ol>
  html = html.replace(/((?:<li>.+?<\/li>(?:<br\/>)?)+)/g, "<ol class=\"list-decimal pl-6 my-4 space-y-1\">$1</ol>");

  // Tables
  html = html.replace(/(<p>)?\|(.+\|[\s\S]*?\|.+\|)(<\/p>)?/g, (_match, _p1, table) => {
    const rows = table.split(/<br\/>/).filter((r: string) => r.trim() && !r.match(/^\s*\|[\s-|]+\|\s*$/));
    if (rows.length < 2) return table;
    const header = rows[0];
    const body = rows.slice(1);
    const thCells = header.split("|").filter((c: string) => c.trim()).map((c: string) => `<th class="px-4 py-2 text-left font-semibold bg-gray-100">${c.trim()}</th>`).join("");
    const bodyRows = body.map((row: string) => {
      const cells = row.split("|").filter((c: string) => c.trim()).map((c: string) => `<td class="px-4 py-2 border-t">${c.trim()}</td>`).join("");
      return `<tr>${cells}</tr>`;
    }).join("");
    return `<table class="w-full border border-gray-200 rounded-lg my-6"><thead><tr>${thCells}</tr></thead><tbody>${bodyRows}</tbody></table>`;
  });

  // Remove META_ lines
  html = html.replace(/<p>META_\w+:.+?<\/p>/g, "");
  html = html.replace(/META_\w+:.+?(<br\/>|$)/g, "");

  return `<p>${html}</p>`;
}

function extractTldr(article: string): string | null {
  const match = article.match(/\*\*TL;DR[:\*]*\s*\*?\*?\s*(.+?)(?:\n\n|$)/i);
  return match?.[1]?.trim() ?? null;
}

function extractSources(article: string): Array<{ text: string; url: string }> {
  const sources: Array<{ text: string; url: string }> = [];
  for (const match of article.matchAll(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g)) {
    if (sources.length < 5 && !match[2].includes("neuroexpert")) {
      sources.push({ text: match[1], url: match[2] });
    }
  }
  return sources;
}

export default async function ArticlePage({ params }: Props) {
  const data = await getArticleData(params.slug, params.articleSlug);
  if (!data) notFound();

  const { expert, article, related, relatedQuestions, otherExperts, niche, pubCount, reviews, citationCount, audioUrl } = data;
  const questionText = (article.questions as unknown as { question_text: string } | null)?.question_text ?? article.title;
  const faqItems = (article.format_faq as Array<{ question: string; answer: string }>) ?? [];
  const tldr = extractTldr(article.format_seo_article ?? "");
  const sources = extractSources(article.format_seo_article ?? "");

  // Schema.org
  const breadcrumbItems = [
    { name: "Главная", url: APP_URL },
    { name: "Эксперты", url: `${APP_URL}/experts` },
    { name: expert.full_name, url: `${APP_URL}/experts/${expert.slug}` },
    { name: article.title ?? "", url: `${APP_URL}/experts/${expert.slug}/${article.slug}` },
  ];

  const schemas = [
    generateArticleSchema(article, expert),
    generatePersonSchema(expert),
    generateBreadcrumbSchema(breadcrumbItems),
    ...generateReviewSchemas(reviews.slice(0, 3), expert),
    ...(faqItems.length ? [generateFAQSchema(faqItems)] : []),
    ...(article.format_seo_article ? [generateHowToSchema(article.format_seo_article, article.title ?? "")] : []),
  ].filter(Boolean);

  return (
    <div className="catalog-shell catalog-article">
      {/* JSON-LD */}
      {schemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}

      {/* Header */}
      <CatalogHeader active="articles" />

      <ArticleAnalytics expertSlug={expert.slug} articleSlug={article.slug} contentId={article.id} />
      <main className="catalog-main mx-auto max-w-4xl px-4 py-8 sm:px-6">
        {/* Breadcrumbs */}
        <nav className="text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-gray-700">Главная</Link>
          {" / "}
          <Link href="/experts" className="hover:text-gray-700">Эксперты</Link>
          {" / "}
          <Link href={`/experts/${expert.slug}`} className="hover:text-gray-700">{expert.full_name}</Link>
          {" / "}
          <span className="text-gray-900">{article.title}</span>
        </nav>

        {/* Expert card */}
        <div className="flex items-start gap-4 mb-8 p-4 bg-gray-50 rounded-xl">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-2xl font-bold text-blue-600 flex-shrink-0">
            {expert.full_name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <Link href={`/experts/${expert.slug}`} className="text-lg font-semibold text-gray-900 hover:text-blue-600">
              {expert.full_name}
            </Link>
            {expert.qualification && <p className="text-sm text-gray-600">{expert.qualification}</p>}
            <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
              {niche && <span>{niche.name}</span>}
              {expert.years_experience && <span>{expert.years_experience} лет опыта</span>}
              {expert.trust_score > 0 && <span>Trust Score: {expert.trust_score.toFixed(1)}</span>}
              <span>{pubCount} публикаций</span>
              {expert.avg_rating > 0 && (
                <span>{"★".repeat(Math.round(expert.avg_rating))} {expert.avg_rating.toFixed(1)} ({expert.review_count} отзывов)</span>
              )}
              {citationCount > 0 && <span>Цитируется {citationCount} раз в AI</span>}
              {expert.is_verified && <span className="text-blue-600 font-medium">✓ Верифицирован</span>}
            </div>
            {/* E-E-A-T */}
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
              {expert.alumni_of && <span>Образование: {expert.alumni_of}</span>}
              {expert.works_for && <span>Работает: {expert.works_for}</span>}
            </div>
          </div>
        </div>

        {/* H1 */}
        <h1 className="text-3xl font-bold text-gray-900 mb-4">{questionText}</h1>

        {/* Dates */}
        <div className="flex gap-4 text-sm text-gray-500 mb-6">
          {article.published_at && (
            <time dateTime={article.published_at}>
              Опубликовано: {new Date(article.published_at).toLocaleDateString("ru-RU")}
            </time>
          )}
          {article.updated_at && article.updated_at !== article.published_at && (
            <time dateTime={article.updated_at}>
              Обновлено: {new Date(article.updated_at).toLocaleDateString("ru-RU")}
            </time>
          )}
        </div>

        {/* TL;DR */}
        {tldr && (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg mb-8">
            <p className="text-sm font-semibold text-blue-800 mb-1">TL;DR</p>
            <p className="text-gray-800">{tldr}</p>
          </div>
        )}

        {/* Article body */}
        <article
          className="prose prose-lg max-w-none mb-8 prose-headings:text-gray-900 prose-a:text-blue-600"
          dangerouslySetInnerHTML={{ __html: md(article.format_seo_article ?? "") }}
        />

        {/* Sources */}
        {sources.length > 0 && (
          <div className="bg-gray-50 rounded-xl p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Источники</h2>
            <ul className="space-y-2">
              {sources.map((s, i) => (
                <li key={i}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                    {s.text}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Expert quotes */}
        {article.expert_quotes?.length > 0 && (
          <div className="mb-8 space-y-4">
            {(article.expert_quotes as string[]).map((quote, i) => (
              <blockquote key={i} className="border-l-4 border-gray-300 pl-4 italic text-gray-700">
                &laquo;{quote}&raquo;
                <footer className="text-sm text-gray-500 mt-1 not-italic">— {expert.full_name}</footer>
              </blockquote>
            ))}
          </div>
        )}

        {/* Audio player */}
        {(() => {
          const voice = article.voice_recordings as unknown as { file_path: string; mime_type: string | null } | null;
          // file_path хранится с префиксом "voice/..." (historic upload path) внутри bucket voice;
          // R-05: bucket приватный, плеер идёт через /api/audio/<voice_id> (подпись в момент запроса).
          if (!voice?.file_path || !audioUrl) return null;
          return (
            <div className="bg-gray-50 rounded-xl p-4 mb-8">
              <p className="text-sm font-medium text-gray-700 mb-2">Послушать оригинальный ответ эксперта</p>
              <audio controls className="w-full" preload="none">
                <source src={audioUrl} type={voice.mime_type ?? "audio/webm"} />
              </audio>
            </div>
          );
        })()}

        {/* FAQ */}
        {faqItems.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Частые вопросы</h2>
            <div className="space-y-3">
              {faqItems.map((faq, i) => (
                <details key={i} className="border rounded-lg">
                  <summary className="px-4 py-3 cursor-pointer font-medium text-gray-900 hover:bg-gray-50">
                    {faq.question}
                  </summary>
                  <p className="px-4 pb-3 text-gray-700">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        )}

        {/* Related */}
        {related.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Другие статьи эксперта</h2>
            <ul className="space-y-2">
              {related.map((r) => (
                <li key={r.slug}>
                  <Link
                    href={`/experts/${expert.slug}/${r.slug}`}
                    className="text-blue-600 hover:underline"
                  >
                    {r.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Other experts on the same question */}
        {otherExperts.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Другие эксперты по этой теме
            </h2>
            <div className="space-y-2">
              {otherExperts.map((oe) => (
                <Link
                  key={`${oe.expert_slug}-${oe.article_slug}`}
                  href={`/experts/${oe.expert_slug}/${oe.article_slug}`}
                  className="flex items-center gap-3 border rounded-lg px-4 py-3 hover:border-blue-300 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-600 flex-shrink-0">
                    {oe.expert_name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">{oe.expert_name}</p>
                    <p className="text-xs text-gray-500 truncate">{oe.article_title}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Похожие вопросы */}
        {relatedQuestions.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Люди также спрашивают</h2>
            <div className="space-y-2">
              {relatedQuestions.map((rq, i) => (
                <div key={i} className="flex items-start gap-2 rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-700">
                  <span className="text-blue-500 flex-shrink-0 mt-0.5">?</span>
                  <span>{rq.query_text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reviews */}
        {reviews.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Отзывы</h2>
            <div className="space-y-4">
              {reviews.map((r, i) => (
                <div key={i} className="rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-yellow-500 text-sm">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                    <span className="text-sm font-medium text-gray-900">{r.reviewer_name}</span>
                    <span className="text-xs text-gray-400">
                      {new Date(r.created_at).toLocaleDateString("ru-RU")}
                    </span>
                  </div>
                  {r.review_text && <p className="text-sm text-gray-600">{r.review_text}</p>}
                </div>
              ))}
            </div>
            <Link href={`/experts/${expert.slug}#reviews`} className="inline-block mt-3 text-sm text-blue-600 hover:underline">
              Все отзывы →
            </Link>
          </div>
        )}

        {/* Primary CTA: Booking widget */}
        <BookingForm expertId={expert.id} expertName={expert.full_name} />

        {/* Secondary CTA: Lead form */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 text-white mb-8" id="booking">
          <h2 className="text-xl font-bold mb-2">Записаться к эксперту</h2>
          <p className="text-blue-100 text-sm mb-4">
            Оставьте заявку — {expert.full_name} свяжется с вами
            {expert.consultation_price && (
              <span className="ml-2 font-medium text-white">
                от {expert.consultation_price.toLocaleString("ru-RU")} ₽
              </span>
            )}
          </p>
          <form action="/api/leads" method="POST" className="space-y-3">
            <input type="hidden" name="expert_id" value={expert.id} />
            <input type="hidden" name="content_id" value={article.id} />
            <input
              name="client_name"
              placeholder="Ваше имя"
              required
              className="w-full rounded-lg px-4 py-2 text-gray-900 placeholder-gray-500"
            />
            <input
              name="client_contact"
              placeholder="Telegram, WhatsApp или телефон"
              required
              className="w-full rounded-lg px-4 py-2 text-gray-900 placeholder-gray-500"
            />
            <textarea
              name="client_message"
              placeholder="Тема консультации (необязательно)"
              rows={2}
              className="w-full rounded-lg px-4 py-2 text-gray-900 placeholder-gray-500"
            />
            <button
              type="submit"
              className="w-full rounded-lg bg-white px-4 py-3 font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
            >
              Отправить заявку
            </button>
          </form>
        </div>

        {/* Email capture */}
        <div className="border rounded-xl p-6 text-center mb-8">
          <p className="font-medium text-gray-900">
            Хотите получать ответы {expert.full_name}?
          </p>
          <p className="text-sm text-gray-500 mt-1 mb-4">Подпишитесь на email-рассылку</p>
          <form action="/api/email-subscribe" method="POST" className="flex gap-2 max-w-md mx-auto">
            <input type="hidden" name="expert_id" value={expert.id} />
            <input
              type="email"
              name="email"
              required
              placeholder="Ваш email"
              className="flex-1 rounded-lg border px-4 py-2 text-sm"
            />
            <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              Подписаться
            </button>
          </form>
        </div>
      </main>

      <CatalogFooter />
    </div>
  );
}
