import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Metadata } from "next";
import { MarketingHeader } from "@/components/marketing/nav";

interface PlatformVis {
  platform: string;
  mentioned: boolean;
  context: string;
  sentiment: string;
}

interface CompetitorData {
  query: string;
  platforms: PlatformVis[];
  visibility_percent: number;
  mentioned_count: number;
}

interface ScanData {
  query: string;
  slug: string;
  platforms: PlatformVis[];
  visibility_percent: number;
  total_platforms: number;
  mentioned_count: number;
  competitor?: CompetitorData;
}

interface ScanRow {
  slug: string;
  query: string;
  platforms: ScanData;
  visibility_percent: number;
  total_platforms: number;
  mentioned_count: number;
  scanned_at: string;
}

async function getScanResult(slug: string): Promise<ScanRow | null> {
  const supabase = createAdminClient();
  const client = supabase as unknown as {
    from: (t: string) => {
      select: (s: string) => {
        eq: (col: string, val: string) => {
          single: () => Promise<{ data: ScanRow | null }>;
        };
      };
    };
  };
  const { data } = await client
    .from("scan_results")
    .select("*")
    .eq("slug", slug)
    .single();
  return data;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = await getScanResult(slug);
  if (!result) return { title: "Результат не найден" };

  const title = `${result.query} — спрос в нейросетях: ${result.visibility_percent}%`;
  const description = `${result.query} упоминается в ${result.mentioned_count} из ${result.total_platforms} нейросетевых платформ.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: `/scan/${slug}`,
      siteName: "НейроЭксперт",
    },
  };
}

function VisibilityBadge({
  percent,
  size = "large",
}: {
  percent: number;
  size?: "large" | "small";
}) {
  const color =
    percent >= 66
      ? "text-green-600"
      : percent >= 33
        ? "text-yellow-600"
        : "text-red-600";
  const bg =
    percent >= 66
      ? "bg-green-100"
      : percent >= 33
        ? "bg-yellow-100"
        : "bg-red-100";

  if (size === "small") {
    return (
      <span className={`inline-block rounded-full ${bg} px-3 py-1`}>
        <span className={`text-lg font-bold ${color}`}>{percent}%</span>
      </span>
    );
  }

  return (
    <div className={`inline-flex items-center gap-3 rounded-2xl ${bg} px-8 py-5`}>
      <span className={`text-5xl font-bold ${color}`}>{percent}%</span>
      <span className="text-left text-sm text-gray-600">спрос в нейросетях</span>
    </div>
  );
}

export default async function ScanResultPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await getScanResult(slug);
  if (!result) notFound();

  // Parse stored data — platforms field now contains full scan data
  const scanData: ScanData =
    typeof result.platforms === "object" && "query" in (result.platforms as ScanData)
      ? (result.platforms as unknown as ScanData)
      : {
          query: result.query,
          slug: result.slug,
          platforms: result.platforms as unknown as PlatformVis[],
          visibility_percent: result.visibility_percent,
          total_platforms: result.total_platforms,
          mentioned_count: result.mentioned_count,
        };

  const mainPlatforms: PlatformVis[] = Array.isArray(scanData.platforms)
    ? scanData.platforms
    : [];
  const competitor = scanData.competitor ?? null;
  const hasComparison = competitor !== null && competitor.platforms?.length > 0;

  return (
    <div className="min-h-screen bg-white">
      <MarketingHeader />

      <section className="py-16">
        <div className="mx-auto max-w-3xl px-6">
          {/* Hero */}
          <div className="text-center">
            <p className="text-sm font-medium text-blue-600">
              Проверка спроса в нейросетях
            </p>
            <h1 className="mt-3 text-3xl font-bold text-gray-900">
              {result.query}
            </h1>
            <div className="mt-6">
              <VisibilityBadge percent={result.visibility_percent} />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              {result.mentioned_count} из {result.total_platforms} платформ
            </p>
          </div>

          {/* Comparison block */}
          {hasComparison && (
            <div className="mt-10 rounded-2xl border-2 border-blue-100 bg-blue-50/30 p-6">
              <h2 className="text-lg font-bold text-gray-900 text-center mb-6">
                Сравнение ответов нейросетей
              </h2>
              <div className="grid grid-cols-3 gap-4 items-center">
                {/* You */}
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-600 mb-2 truncate">
                    {result.query}
                  </p>
                  <VisibilityBadge
                    percent={result.visibility_percent}
                    size="small"
                  />
                </div>

                {/* VS */}
                <div className="text-center">
                  <span className="text-lg font-bold text-slate-400">против</span>
                </div>

                {/* Competitor */}
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-600 mb-2 truncate">
                    {competitor!.query}
                  </p>
                  <VisibilityBadge
                    percent={competitor!.visibility_percent}
                    size="small"
                  />
                </div>
              </div>

              {/* Per-platform comparison */}
              <div className="mt-6 space-y-2">
                {mainPlatforms.map((p) => {
                  const compPlatform = competitor!.platforms?.find(
                    (cp) => cp.platform === p.platform,
                  );
                  return (
                    <div
                      key={p.platform}
                      className="flex items-center justify-between bg-white rounded-lg px-4 py-3 border"
                    >
                      <span className="text-sm font-medium text-gray-700 w-24">
                        {p.platform}
                      </span>
                      <span
                        className={`text-sm font-medium ${p.mentioned ? "text-green-600" : "text-red-500"}`}
                      >
                        {p.mentioned ? "✓ Вы" : "✗ Вы"}
                      </span>
                      <span className="text-slate-300">|</span>
                      <span
                        className={`text-sm font-medium ${compPlatform?.mentioned ? "text-green-600" : "text-red-500"}`}
                      >
                        {compPlatform?.mentioned
                          ? "✓ Конкурент"
                          : "✗ Конкурент"}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Gap message */}
              {result.visibility_percent < (competitor?.visibility_percent ?? 0) && (
                <p className="mt-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-center">
                  Конкурент опережает вас на{" "}
                  {(competitor?.visibility_percent ?? 0) - result.visibility_percent}%.
                  Самое время запускать страницы под реальные вопросы клиентов.
                </p>
              )}
            </div>
          )}

          {/* Platform details */}
          <div className="mt-12 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Детали по платформам
            </h2>
            {mainPlatforms.map((p) => (
              <div
                key={p.platform}
                className="rounded-xl border border-gray-200 p-5"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">{p.platform}</h3>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      p.mentioned
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {p.mentioned ? "Упоминается" : "Не найден"}
                  </span>
                </div>
                <p className="mt-3 text-sm text-gray-600 whitespace-pre-line">
                  {p.context}
                </p>
              </div>
            ))}
          </div>

          {/* Основной призыв к действию */}
          <div className="mt-12 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h2 className="text-2xl font-bold text-slate-950">
              {result.visibility_percent === 0
                ? "Нейросети не находят вас по этому спросу. Это можно превратить в план страниц."
                : result.visibility_percent < 50
                  ? `Вы не попадаете в ${result.total_platforms - result.mentioned_count} из ${result.total_platforms} ответов нейросетей.${
                      competitor && competitor.visibility_percent > result.visibility_percent
                        ? ` Конкурент опережает на ${competitor.visibility_percent - result.visibility_percent}%.`
                        : " Этот спрос можно закрывать экспертными страницами."
                    }`
                  : result.visibility_percent < 100
                    ? `Хороший старт! Но ${result.total_platforms - result.mentioned_count} платформ ещё не связывают этот спрос с вами.`
                    : "Отличный старт! Теперь важно вести людей со страниц к записи и заявке."}
            </h2>
            <p className="mt-3 text-slate-700">
              Наговорите ответ за 10 минут — мы превратим его в страницу под вопрос,
              добавим кнопку заявки и начнём измерять трафик, клики и заявки.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row justify-center gap-4">
              <Link
                href={`/launch?from=scan&niche=${encodeURIComponent(result.query)}`}
                className="rounded-lg bg-slate-950 px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-slate-800"
              >
                Получить план запуска
              </Link>
              <Link
                href="/scan"
                className="rounded-lg border border-slate-300 px-8 py-3 text-base font-semibold text-slate-950 transition-colors hover:bg-slate-100"
              >
                Проверить ещё
              </Link>
            </div>
          </div>

          {/* Дополнительный призыв для агентств */}
          <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-6 text-center">
            <h3 className="text-lg font-semibold text-gray-900">
              Агентство или бизнес?
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              API спроса показывает вопросы, спрос, слабость ответов нейросетей и кнопки для страниц под заявки. От $99/мес.
            </p>
            <Link
              href="/for-agencies"
              className="mt-4 inline-block rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Подробнее для агентств
            </Link>
          </div>

          {/* Share */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              Поделитесь результатом с коллегами
            </p>
            <div className="mt-3 flex justify-center gap-3">
              <a
                href={`https://t.me/share/url?url=${encodeURIComponent(`https://neuroexpertise.ru/scan/${result.slug}`)}&text=${encodeURIComponent(`${result.query} — спрос в нейросетях: ${result.visibility_percent}%`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Telegram
              </a>
              <a
                href={`https://vk.com/share.php?url=${encodeURIComponent(`https://neuroexpertise.ru/scan/${result.slug}`)}&title=${encodeURIComponent(`${result.query} — спрос в нейросетях: ${result.visibility_percent}%`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                ВКонтакте
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
