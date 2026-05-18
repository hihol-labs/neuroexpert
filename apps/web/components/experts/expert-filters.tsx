"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";

interface Niche {
  name: string;
  slug: string;
  icon: string;
}

interface Props {
  niches: Niche[];
}

export function ExpertFilters({ niches }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [query, setQuery] = useState(searchParams.get("q") || "");

  const currentNiche = searchParams.get("niche") || "";
  const currentSort = searchParams.get("sort") || "trust_score";
  const currentMinExp = searchParams.get("min_exp") || "";
  const currentMinScore = searchParams.get("min_score") || "";
  const currentMaxPrice = searchParams.get("max_price") || "";
  const currentMinRating = searchParams.get("min_rating") || "";

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      startTransition(() => {
        router.push(`/experts?${params.toString()}`);
      });
    },
    [router, searchParams],
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({ q: query });
  };

  return (
    <div className="space-y-4 mb-8">
      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск по имени, квалификации..."
          className="min-w-0 flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:py-2"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 sm:py-2"
        >
          Найти
        </button>
      </form>

      {/* Filters row */}
      <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
        {/* Sort */}
        <select
          value={currentSort}
          onChange={(e) => updateParams({ sort: e.target.value })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none sm:w-auto sm:py-1.5"
        >
          <option value="trust_score">По Trust Score</option>
          <option value="rating">По рейтингу</option>
          <option value="experience">По опыту</option>
          <option value="articles">По статьям</option>
          <option value="name">По имени</option>
        </select>

        {/* Min experience */}
        <select
          value={currentMinExp}
          onChange={(e) => updateParams({ min_exp: e.target.value })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none sm:w-auto sm:py-1.5"
        >
          <option value="">Опыт: любой</option>
          <option value="1">от 1 года</option>
          <option value="3">от 3 лет</option>
          <option value="5">от 5 лет</option>
          <option value="10">от 10 лет</option>
        </select>

        {/* Min trust score */}
        <select
          value={currentMinScore}
          onChange={(e) => updateParams({ min_score: e.target.value })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none sm:w-auto sm:py-1.5"
        >
          <option value="">Trust Score: любой</option>
          <option value="10">от 10</option>
          <option value="25">от 25</option>
          <option value="50">от 50</option>
          <option value="100">от 100</option>
        </select>

        {/* Max price */}
        <select
          value={currentMaxPrice}
          onChange={(e) => updateParams({ max_price: e.target.value })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none sm:w-auto sm:py-1.5"
        >
          <option value="">Цена: любая</option>
          <option value="2000">до 2 000 ₽</option>
          <option value="5000">до 5 000 ₽</option>
          <option value="10000">до 10 000 ₽</option>
          <option value="20000">до 20 000 ₽</option>
        </select>

        {/* Min rating */}
        <select
          value={currentMinRating}
          onChange={(e) => updateParams({ min_rating: e.target.value })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none sm:w-auto sm:py-1.5"
        >
          <option value="">Рейтинг: любой</option>
          <option value="3">от 3 ★</option>
          <option value="4">от 4 ★</option>
          <option value="4.5">от 4.5 ★</option>
        </select>

        {isPending && (
          <span className="text-sm text-gray-400">Загрузка...</span>
        )}
      </div>

      {/* Niche pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => updateParams({ niche: "" })}
          className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
            !currentNiche
              ? "bg-blue-600 text-white border-blue-600"
              : "text-gray-700 border-gray-300 hover:border-blue-300"
          }`}
        >
          Все
        </button>
        {niches.map((n) => (
          <button
            key={n.slug}
            onClick={() =>
              updateParams({ niche: currentNiche === n.slug ? "" : n.slug })
            }
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
              currentNiche === n.slug
                ? "bg-blue-600 text-white border-blue-600"
                : "text-gray-700 border-gray-300 hover:border-blue-300"
            }`}
          >
            {n.icon} {n.name}
          </button>
        ))}
      </div>
    </div>
  );
}
