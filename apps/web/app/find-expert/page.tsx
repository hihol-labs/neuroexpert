"use client";

import Link from "next/link";
import { useState } from "react";
import { MarketingHeader, MarketingFooter } from "@/components/marketing/nav";

interface MatchedExpert {
  id: string;
  full_name: string;
  slug: string;
  qualification: string | null;
  city: string | null;
  trust_score: number;
  avg_rating: number;
  review_count: number;
  years_experience: number | null;
  is_verified: boolean;
  consultation_price: number | null;
  knows_about: string[] | null;
  article_count: number;
  niche: { name: string; icon: string } | null;
  match_score: number;
  is_premium: boolean;
}

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span className="text-yellow-500 text-sm">
      {"★".repeat(full)}
      {half ? "½" : ""}
      {"☆".repeat(5 - full - (half ? 1 : 0))}
    </span>
  );
}

export default function FindExpertPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MatchedExpert[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setSearched(true);

    try {
      const res = await fetch(
        `/api/match?q=${encodeURIComponent(query.trim())}`,
      );
      const data = await res.json();
      setResults(data.experts ?? []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <MarketingHeader />

      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Подберём эксперта
          </h1>
          <p className="text-gray-600 mt-2">
            Опишите вашу задачу — мы найдём подходящего специалиста
          </p>
        </div>

        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex gap-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Например: нужен психолог для работы с тревожностью..."
              className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Ищем..." : "Найти"}
            </button>
          </div>
        </form>

        {loading && (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          </div>
        )}

        {!loading && searched && results.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">
              По вашему запросу экспертов не найдено.
            </p>
            <Link
              href="/experts"
              className="text-blue-600 hover:text-blue-700 text-sm"
            >
              Посмотреть всех экспертов
            </Link>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Найдено: {results.length} экспертов
            </p>
            {results.map((expert, idx) => (
              <Link
                key={expert.id}
                href={`/experts/${expert.slug}`}
                className={`block border rounded-xl p-5 hover:shadow-md transition-all ${
                  expert.is_premium
                    ? "border-blue-200 bg-blue-50/30"
                    : "hover:border-blue-300"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-2xl font-bold text-blue-600 flex-shrink-0">
                      {expert.full_name.charAt(0)}
                    </div>
                    {expert.is_verified && (
                      <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-white text-[10px]">
                        ✓
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {idx === 0 && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                          Лучшее совпадение
                        </span>
                      )}
                      {expert.is_premium && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                          Премиум
                        </span>
                      )}
                    </div>

                    <h3 className="font-semibold text-gray-900">
                      {expert.full_name}
                    </h3>
                    {expert.qualification && (
                      <p className="text-sm text-gray-600">
                        {expert.qualification}
                      </p>
                    )}

                    {expert.review_count > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        <StarRating rating={expert.avg_rating} />
                        <span className="text-xs text-gray-500">
                          ({expert.review_count})
                        </span>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 mt-2 text-xs text-gray-500">
                      {expert.niche && (
                        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                          {expert.niche.icon} {expert.niche.name}
                        </span>
                      )}
                      {expert.city && <span>{expert.city}</span>}
                      {expert.years_experience && (
                        <span>{expert.years_experience} лет опыта</span>
                      )}
                      <span>{expert.article_count} статей</span>
                      {expert.consultation_price && (
                        <span className="font-medium text-gray-700">
                          {expert.consultation_price.toLocaleString("ru-RU")} ₽
                        </span>
                      )}
                    </div>

                    {expert.knows_about?.length ? (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(expert.knows_about as string[])
                          .slice(0, 5)
                          .map((t, i) => (
                            <span
                              key={i}
                              className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-xs"
                            >
                              {t}
                            </span>
                          ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <MarketingFooter />
    </div>
  );
}
