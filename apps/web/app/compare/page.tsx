"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

interface Expert {
  id: string;
  full_name: string;
  slug: string;
  qualification: string | null;
  city: string | null;
  years_experience: number | null;
  trust_score: number;
  avg_rating: number;
  review_count: number;
  is_verified: boolean;
  alumni_of: string | null;
  works_for: string | null;
  knows_about: string[] | null;
  consultation_price: number | null;
  article_count: number;
  niche_name: string | null;
}

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span className="text-yellow-500">
      {"★".repeat(full)}
      {half ? "½" : ""}
      {"☆".repeat(5 - full - (half ? 1 : 0))}
    </span>
  );
}

function CompareContent() {
  const searchParams = useSearchParams();
  const ids = useMemo(
    () => searchParams.get("ids")?.split(",").filter(Boolean) ?? [],
    [searchParams],
  );
  const [experts, setExperts] = useState<Expert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ids.length === 0) {
      setLoading(false);
      return;
    }

    fetch(`/api/compare?ids=${ids.join(",")}`)
      .then((r) => r.json())
      .then((data) => setExperts(data.experts ?? []))
      .catch(() => setExperts([]))
      .finally(() => setLoading(false));
  }, [ids]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Загрузка...</p>
      </div>
    );
  }

  if (experts.length === 0) {
    return (
      <div className="min-h-screen bg-white">
        <header className="border-b bg-white">
          <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
            <Link href="/" className="text-lg font-bold text-gray-900">
              НейроЭксперт
            </Link>
          </nav>
        </header>
        <main className="mx-auto max-w-4xl px-6 py-12 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Сравнение экспертов
          </h1>
          <p className="text-gray-600 mb-6">
            Выберите экспертов для сравнения в каталоге.
          </p>
          <Link
            href="/experts"
            className="inline-block rounded-lg bg-blue-600 px-6 py-2 text-white font-medium hover:bg-blue-700"
          >
            Перейти в каталог
          </Link>
        </main>
      </div>
    );
  }

  const rows: { label: string; key: keyof Expert | "rating_display" }[] = [
    { label: "Квалификация", key: "qualification" },
    { label: "Ниша", key: "niche_name" },
    { label: "Город", key: "city" },
    { label: "Опыт (лет)", key: "years_experience" },
    { label: "Trust Score", key: "trust_score" },
    { label: "Рейтинг", key: "rating_display" },
    { label: "Статей", key: "article_count" },
    { label: "Образование", key: "alumni_of" },
    { label: "Место работы", key: "works_for" },
    { label: "Цена консультации", key: "consultation_price" },
  ];

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b bg-white">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <Link href="/" className="text-lg font-bold text-gray-900">
            НейроЭксперт
          </Link>
          <Link
            href="/experts"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Каталог
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Сравнение экспертов
        </h1>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            {/* Headers with expert names */}
            <thead>
              <tr>
                <th className="text-left p-3 border-b w-48 text-sm text-gray-500">
                  Параметр
                </th>
                {experts.map((e) => (
                  <th key={e.id} className="p-3 border-b text-center min-w-48">
                    <Link
                      href={`/experts/${e.slug}`}
                      className="hover:text-blue-600"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div className="relative w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-2xl font-bold text-blue-600">
                          {e.full_name.charAt(0)}
                          {e.is_verified && (
                            <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-white text-[10px]">
                              ✓
                            </span>
                          )}
                        </div>
                        <span className="font-semibold text-gray-900">
                          {e.full_name}
                        </span>
                      </div>
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className="hover:bg-gray-50">
                  <td className="p-3 border-b text-sm font-medium text-gray-600">
                    {row.label}
                  </td>
                  {experts.map((e) => {
                    let value: React.ReactNode = "—";

                    if (row.key === "rating_display") {
                      value =
                        e.review_count > 0 ? (
                          <span className="inline-flex items-center gap-1">
                            <StarRating rating={e.avg_rating} />
                            <span className="text-xs text-gray-500">
                              ({e.review_count})
                            </span>
                          </span>
                        ) : (
                          "Нет отзывов"
                        );
                    } else if (row.key === "trust_score") {
                      value =
                        e.trust_score > 0
                          ? e.trust_score.toFixed(1)
                          : "—";
                    } else if (row.key === "consultation_price") {
                      value = e.consultation_price
                        ? `${e.consultation_price.toLocaleString("ru-RU")} ₽`
                        : "—";
                    } else if (row.key === "knows_about") {
                      value = e.knows_about?.length
                        ? e.knows_about.join(", ")
                        : "—";
                    } else {
                      const v = e[row.key as keyof Expert];
                      value =
                        v !== null && v !== undefined && v !== ""
                          ? String(v)
                          : "—";
                    }

                    return (
                      <td
                        key={e.id}
                        className="p-3 border-b text-sm text-center text-gray-900"
                      >
                        {value}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {/* Knows about row */}
              <tr className="hover:bg-gray-50">
                <td className="p-3 border-b text-sm font-medium text-gray-600">
                  Области экспертизы
                </td>
                {experts.map((e) => (
                  <td
                    key={e.id}
                    className="p-3 border-b text-sm text-center"
                  >
                    {e.knows_about?.length ? (
                      <div className="flex flex-wrap gap-1 justify-center">
                        {e.knows_about.map((t, i) => (
                          <span
                            key={i}
                            className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-xs"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* CTAs */}
        <div className="grid gap-4 mt-8" style={{ gridTemplateColumns: `12rem repeat(${experts.length}, minmax(12rem, 1fr))` }}>
          <div />
          {experts.map((e) => (
            <div key={e.id} className="text-center">
              <Link
                href={`/experts/${e.slug}`}
                className="inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Подробнее
              </Link>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-gray-500">Загрузка...</p>
        </div>
      }
    >
      <CompareContent />
    </Suspense>
  );
}
