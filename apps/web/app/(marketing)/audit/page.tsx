"use client";

import Link from "next/link";
import { useState } from "react";

const NICHES = [
  { id: "a0000000-0000-0000-0000-000000000001", name: "Психология и психотерапия", icon: "🧠", focus: true },
  { id: "a0000000-0000-0000-0000-000000000002", name: "Юриспруденция", icon: "⚖️", focus: true },
  { id: "a0000000-0000-0000-0000-000000000003", name: "Нутрициология", icon: "🥗", focus: true },
  { id: "a0000000-0000-0000-0000-000000000004", name: "Финансы и инвестиции", icon: "💰", focus: true },
  { id: "a0000000-0000-0000-0000-000000000005", name: "Бизнес-консалтинг", icon: "📊", focus: true },
  { id: "a0000000-0000-0000-0000-000000000006", name: "Медицина и здоровье", icon: "🏥", focus: false },
  { id: "a0000000-0000-0000-0000-000000000007", name: "Фитнес и спорт", icon: "💪", focus: false },
  { id: "a0000000-0000-0000-0000-000000000008", name: "Образование и репетиторство", icon: "📚", focus: false },
  { id: "a0000000-0000-0000-0000-000000000009", name: "Маркетинг и SMM", icon: "📱", focus: false },
  { id: "a0000000-0000-0000-0000-000000000010", name: "IT и программирование", icon: "💻", focus: false },
  { id: "a0000000-0000-0000-0000-000000000011", name: "Дизайн и архитектура", icon: "🎨", focus: false },
  { id: "a0000000-0000-0000-0000-000000000012", name: "Недвижимость", icon: "🏠", focus: false },
  { id: "a0000000-0000-0000-0000-000000000013", name: "Карьера и HR", icon: "👔", focus: false },
  { id: "a0000000-0000-0000-0000-000000000014", name: "Косметология и эстетика", icon: "✨", focus: false },
  { id: "a0000000-0000-0000-0000-000000000015", name: "Логопедия и дефектология", icon: "🗣️", focus: false },
  { id: "a0000000-0000-0000-0000-000000000016", name: "Коучинг и саморазвитие", icon: "🎯", focus: false },
  { id: "a0000000-0000-0000-0000-000000000017", name: "Бухгалтерия и аудит", icon: "🧮", focus: false },
  { id: "a0000000-0000-0000-0000-000000000018", name: "Ветеринария", icon: "🐾", focus: false },
  { id: "a0000000-0000-0000-0000-000000000019", name: "Страхование", icon: "🛡️", focus: false },
  { id: "a0000000-0000-0000-0000-000000000020", name: "Туризм и путешествия", icon: "✈️", focus: false },
];

interface Gap {
  id: string;
  question: string;
  monthly_volume: number;
  gap_score: number;
  ai_response: string;
}

type Step = "select" | "loading" | "results" | "error";

export default function AuditPage() {
  const [step, setStep] = useState<Step>("select");
  const [nicheName, setNicheName] = useState("");
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [error, setError] = useState("");

  async function handleNicheSelect(nicheId: string, name: string) {
    setNicheName(name);
    setStep("loading");

    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche_id: nicheId, type: "free" }),
      });

      if (res.status === 429) {
        setError("Слишком много запросов. Подождите минуту и попробуйте снова.");
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
      setGaps(data.gaps);
      setStep("results");
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

      <section className="py-16">
        <div className="mx-auto max-w-5xl px-6">
          {/* Step 1: Niche Selection */}
          {step === "select" && (
            <>
              <div className="text-center">
                <h1 className="text-3xl font-bold text-gray-900">
                  Бесплатный аудит AI-видимости
                </h1>
                <p className="mt-4 text-lg text-gray-600">
                  Выберите свою нишу — мы покажем вопросы, на которые нейросети
                  дают слабые ответы. Это ваши точки роста.
                </p>
              </div>
              <div className="mt-12 grid gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
                {NICHES.map((niche) => (
                  <button
                    key={niche.id}
                    onClick={() => handleNicheSelect(niche.id, niche.name)}
                    className={`rounded-xl border p-5 text-center transition-all hover:shadow-md cursor-pointer ${
                      niche.focus
                        ? "border-blue-300 bg-blue-50 hover:border-blue-400"
                        : "border-gray-200 hover:border-blue-300"
                    }`}
                  >
                    <span className="text-3xl">{niche.icon}</span>
                    <h3 className="mt-2 text-sm font-semibold text-gray-900">
                      {niche.name}
                    </h3>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Step 2: Loading */}
          {step === "loading" && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
              <p className="mt-6 text-lg text-gray-600">
                Анализируем нишу «{nicheName}»...
              </p>
              <p className="mt-2 text-sm text-gray-400">
                Ищем вопросы со слабыми ответами нейросетей
              </p>
            </div>
          )}

          {/* Step 3: Results */}
          {step === "results" && (
            <>
              <div className="text-center">
                <p className="text-sm font-medium text-blue-600">
                  Результаты аудита
                </p>
                <h1 className="mt-2 text-3xl font-bold text-gray-900">
                  {nicheName}
                </h1>
                <p className="mt-2 text-gray-600">
                  {gaps.length} {gaps.length === 1 ? "дыра" : "дыры"} в ответах
                  нейросетей — ваши точки роста
                </p>
              </div>

              <div className="mt-10 space-y-6">
                {gaps.map((gap, i) => (
                  <div
                    key={gap.id}
                    className="rounded-2xl border border-gray-200 p-6"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-sm font-bold text-red-600">
                            {i + 1}
                          </span>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {gap.question}
                          </h3>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex gap-6">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900">
                          {gap.monthly_volume?.toLocaleString("ru-RU") || "—"}
                        </p>
                        <p className="text-xs text-gray-500">запросов/мес</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-red-600">
                          {gap.gap_score}/10
                        </p>
                        <p className="text-xs text-gray-500">слабость AI</p>
                      </div>
                    </div>

                    {gap.ai_response && (
                      <div className="mt-4 rounded-lg bg-gray-50 p-4">
                        <p className="text-xs font-medium text-gray-500 mb-2">
                          Текущий ответ ChatGPT:
                        </p>
                        <p className="text-sm text-gray-600 line-clamp-4">
                          {gap.ai_response}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div className="mt-12 rounded-2xl bg-blue-600 p-8 text-center">
                <h2 className="text-2xl font-bold text-white">
                  Хотите занять эти позиции?
                </h2>
                <p className="mt-2 text-blue-100">
                  Наговорите ответ за 10 минут — мы опубликуем экспертную статью,
                  которую будут цитировать нейросети.
                </p>
                <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                  <Link
                    href="/register"
                    className="rounded-lg bg-white px-8 py-3 text-base font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    Начать бесплатно
                  </Link>
                </div>
              </div>

              <div className="mt-6 text-center">
                <button
                  onClick={() => {
                    setStep("select");
                    setGaps([]);
                  }}
                  className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  &larr; Выбрать другую нишу
                </button>
              </div>
            </>
          )}

          {/* Error */}
          {step === "error" && (
            <div className="flex flex-col items-center justify-center py-20">
              <p className="text-lg text-red-600">{error}</p>
              <button
                onClick={() => {
                  setStep("select");
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
