"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MarketingHeader } from "@/components/marketing/nav";

type Step = "form" | "loading" | "error";

export default function ScanPage() {
  const [query, setQuery] = useState("");
  const [competitor, setCompetitor] = useState("");
  const [step, setStep] = useState<Step>("form");
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) {
      setError("Введите минимум 2 символа");
      return;
    }

    setStep("loading");
    setError("");

    try {
      const competitorTrimmed = competitor.trim();
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: trimmed,
          competitor: competitorTrimmed || undefined,
        }),
      });

      if (res.status === 429) {
        setError("Лимит проверок: 3 в час. Попробуйте позже.");
        setStep("error");
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Произошла ошибка");
        setStep("error");
        return;
      }

      const data = await res.json();
      router.push(`/scan/${data.slug}`);
    } catch {
      setError("Ошибка сети. Попробуйте позже.");
      setStep("error");
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <MarketingHeader />

      <section className="py-20">
        <div className="mx-auto max-w-2xl px-6">
          {step === "form" && (
            <>
              <div className="text-center">
                <h1 className="text-4xl font-bold text-gray-900">
                  Проверка спроса в нейросетях
                </h1>
                <p className="mt-4 text-lg text-gray-600">
                  Проверьте, находят ли нейросети вас, когда человек ищет
                  эксперта, бренд или компанию. Сравните себя с конкурентом
                  и поймите, где теряете потенциальные заявки.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="mt-10 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Вы или ваша компания *
                  </label>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Иван Петров, психолог"
                    maxLength={200}
                    required
                    className="w-full rounded-xl border border-gray-300 px-5 py-4 text-lg text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Конкурент или альтернатива (необязательно)
                  </label>
                  <input
                    type="text"
                    value={competitor}
                    onChange={(e) => setCompetitor(e.target.value)}
                    placeholder="Мария Сидорова, психолог"
                    maxLength={200}
                    className="w-full rounded-xl border border-gray-300 px-5 py-4 text-lg text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Добавьте конкурента — увидите, кому нейросети отдают спрос сейчас
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-blue-600 px-8 py-4 text-lg font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  Проверить спрос в нейросетях
                </button>

                {error && (
                  <p className="text-sm text-red-600">{error}</p>
                )}
              </form>

              <div className="mt-16 grid gap-6 sm:grid-cols-3">
                <div className="rounded-xl border border-gray-200 p-6 text-center">
                  <div className="text-3xl">🔍</div>
                  <h3 className="mt-3 font-semibold text-gray-900">
                    3 платформы
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    ChatGPT, Perplexity, YandexGPT.{" "}
                    <a href="/audit" className="underline hover:text-blue-600">
                      В /audit — 4 платформы (+ GigaChat)
                    </a>
                  </p>
                </div>
                <div className="rounded-xl border border-gray-200 p-6 text-center">
                  <div className="text-3xl">📊</div>
                  <h3 className="mt-3 font-semibold text-gray-900">
                    Сравнение спроса
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Вы и конкурент — кого нейросети находят чаще
                  </p>
                </div>
                <div className="rounded-xl border border-gray-200 p-6 text-center">
                  <div className="text-3xl">🚀</div>
                  <h3 className="mt-3 font-semibold text-gray-900">
                    Следующий шаг
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Какие страницы запускать для заявок
                  </p>
                </div>
              </div>
            </>
          )}

          {step === "loading" && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
              <p className="mt-6 text-lg text-gray-600">
                Спрашиваем нейросети о &laquo;{query}&raquo;
                {competitor && <> и &laquo;{competitor}&raquo;</>}...
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Проверяем ChatGPT, Perplexity и YandexGPT. Это займёт{" "}
                {competitor ? "20-40" : "10-20"} секунд.
              </p>
            </div>
          )}

          {step === "error" && (
            <div className="flex flex-col items-center justify-center py-20">
              <p className="text-lg text-red-600">{error}</p>
              <button
                onClick={() => {
                  setStep("form");
                  setError("");
                }}
                className="mt-6 text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                &larr; Попробовать снова
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
