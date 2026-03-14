import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Metadata } from "next";

interface ScanRow {
  slug: string;
  query: string;
  platforms: Array<{
    platform: string;
    mentioned: boolean;
    context: string;
    sentiment: string;
  }>;
  visibility_percent: number;
  total_platforms: number;
  mentioned_count: number;
  scanned_at: string;
}

async function getScanResult(slug: string): Promise<ScanRow | null> {
  const supabase = createAdminClient();
  // scan_results table added in migration 009, not yet in generated types
  const client = supabase as unknown as {
    from: (t: string) => {
      select: (s: string) => {
        eq: (col: string, val: string) => {
          single: () => Promise<{ data: ScanRow | null }>;
        };
      };
    };
  };
  const { data } = await client.from("scan_results").select("*").eq("slug", slug).single();
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

  const title = `${result.query} — AI Visibility: ${result.visibility_percent}%`;
  const description = `${result.query} упоминается в ${result.mentioned_count} из ${result.total_platforms} AI-платформ. Проверьте свою видимость на НейроЭксперт.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: `https://neuroexpertise.ru/scan/${slug}`,
      siteName: "НейроЭксперт",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function ScanResultPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await getScanResult(slug);
  if (!result) notFound();

  const visibilityColor =
    result.visibility_percent >= 66
      ? "text-green-600"
      : result.visibility_percent >= 33
        ? "text-yellow-600"
        : "text-red-600";

  const visibilityBg =
    result.visibility_percent >= 66
      ? "bg-green-100"
      : result.visibility_percent >= 33
        ? "bg-yellow-100"
        : "bg-red-100";

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-gray-900">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-bold text-white">
            НейроЭксперт
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Увеличить видимость
          </Link>
        </nav>
      </header>

      <section className="py-16">
        <div className="mx-auto max-w-3xl px-6">
          {/* Hero */}
          <div className="text-center">
            <p className="text-sm font-medium text-blue-600">
              AI Visibility Scanner
            </p>
            <h1 className="mt-3 text-3xl font-bold text-gray-900">
              {result.query}
            </h1>
            <div
              className={`mt-6 inline-flex items-center gap-3 rounded-2xl ${visibilityBg} px-8 py-5`}
            >
              <span className={`text-5xl font-bold ${visibilityColor}`}>
                {result.visibility_percent}%
              </span>
              <span className="text-left text-sm text-gray-600">
                AI-видимость
                <br />
                {result.mentioned_count} из {result.total_platforms} платформ
              </span>
            </div>
          </div>

          {/* Platform details */}
          <div className="mt-12 space-y-4">
            {result.platforms.map((p) => (
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

          {/* CTA */}
          <div className="mt-12 rounded-2xl bg-blue-600 p-8 text-center">
            <h2 className="text-2xl font-bold text-white">
              {result.visibility_percent < 50
                ? "Нейросети вас не знают. Это можно исправить."
                : "Хороший старт! Но можно лучше."}
            </h2>
            <p className="mt-2 text-blue-100">
              Наговорите ответ за 10 минут — мы опубликуем экспертную статью,
              которую будут цитировать нейросети.
            </p>
            <div className="mt-6 flex justify-center gap-4">
              <Link
                href="/register"
                className="rounded-lg bg-white px-8 py-3 text-base font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
              >
                Начать бесплатно
              </Link>
              <Link
                href="/scan"
                className="rounded-lg border border-blue-400 px-8 py-3 text-base font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                Проверить ещё
              </Link>
            </div>
          </div>

          {/* Share */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              Поделитесь результатом с коллегами
            </p>
            <div className="mt-3 flex justify-center gap-3">
              <a
                href={`https://t.me/share/url?url=${encodeURIComponent(`https://neuroexpertise.ru/scan/${result.slug}`)}&text=${encodeURIComponent(`${result.query} — AI Visibility: ${result.visibility_percent}%`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Telegram
              </a>
              <a
                href={`https://vk.com/share.php?url=${encodeURIComponent(`https://neuroexpertise.ru/scan/${result.slug}`)}&title=${encodeURIComponent(`${result.query} — AI Visibility: ${result.visibility_percent}%`)}`}
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
