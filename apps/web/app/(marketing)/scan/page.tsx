"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Step = "form" | "loading" | "error";

export default function ScanPage() {
  const [query, setQuery] = useState("");
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
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed }),
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
      <header className="bg-gray-900">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-bold text-white">
            НейроЭксперт
          </Link>
          <Link
            href="/login"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Войти
          </Link>
        </nav>
      </header>

      <section className="py-20">
        <div className="mx-auto max-w-2xl px-6">
          {step === "form" && (
            <>
              <div className="text-center">
                <h1 className="text-4xl font-bold text-gray-900">
                  AI Visibility Scanner
                </h1>
                <p className="mt-4 text-lg text-gray-600">
                  Проверьте, знают ли нейросети о вас. Введите имя, бренд или
                  сайт — мы спросим ChatGPT, Perplexity и YandexGPT.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="mt-10">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Иван Петров, психолог"
                    maxLength={200}
                    className="flex-1 rounded-xl border border-gray-300 px-5 py-4 text-lg text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-blue-600 px-8 py-4 text-lg font-semibold text-white hover:bg-blue-700 transition-colors whitespace-nowrap"
                  >
                    Проверить
                  </button>
                </div>
                {error && (
                  <p className="mt-3 text-sm text-red-600">{error}</p>
                )}
              </form>

              <div className="mt-16 grid gap-6 sm:grid-cols-3">
                <div className="rounded-xl border border-gray-200 p-6 text-center">
                  <div className="text-3xl">🔍</div>
                  <h3 className="mt-3 font-semibold text-gray-900">
                    3 платформы
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    ChatGPT, Perplexity, YandexGPT
                  </p>
                </div>
                <div className="rounded-xl border border-gray-200 p-6 text-center">
                  <div className="text-3xl">📊</div>
                  <h3 className="mt-3 font-semibold text-gray-900">
                    % видимости
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Сколько нейросетей знают о вас
                  </p>
                </div>
                <div className="rounded-xl border border-gray-200 p-6 text-center">
                  <div className="text-3xl">🚀</div>
                  <h3 className="mt-3 font-semibold text-gray-900">
                    План роста
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Как увеличить видимость
                  </p>
                </div>
              </div>
            </>
          )}

          {step === "loading" && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
              <p className="mt-6 text-lg text-gray-600">
                Спрашиваем нейросети о &laquo;{query}&raquo;...
              </p>
              <p className="mt-2 text-sm text-gray-400">
                Проверяем ChatGPT, Perplexity и YandexGPT. Это займёт 10-20
                секунд.
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
