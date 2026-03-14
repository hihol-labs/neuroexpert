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

const MARKER_LABELS = [
  { key: "has_expert_name" as const, label: "Имя эксперта" },
  { key: "has_specific_examples" as const, label: "Примеры из практики" },
  { key: "has_source_link" as const, label: "Ссылка на источник" },
  { key: "has_specific_numbers" as const, label: "Конкретные цифры" },
];

interface PlatformResult {
  platform: string;
  ai_response: string;
  gap_score: number;
  markers: {
    has_expert_name: boolean;
    has_specific_examples: boolean;
    has_source_link: boolean;
    has_specific_numbers: boolean;
  };
  weakness: string;
}

interface Gap {
  id: string;
  question: string;
  search_intent?: string;
  avg_gap_score: number;
  platforms: PlatformResult[];
}

type Step = "select" | "loading" | "results" | "error";

export default function AuditPage() {
  const [step, setStep] = useState<Step>("select");
  const [nicheName, setNicheName] = useState("");
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [error, setError] = useState("");
  const [expandedPlatform, setExpandedPlatform] = useState<string | null>(null);

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

  function togglePlatform(key: string) {
    setExpandedPlatform(expandedPlatform === key ? null : key);
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
                  Выберите свою нишу — мы проверим ответы нейросетей на
                  популярные вопросы и найдём дыры.
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
                Анализируем нишу &laquo;{nicheName}&raquo;...
              </p>
              <p className="mt-2 text-sm text-gray-400">
                Генерируем актуальные вопросы, задаём их нейросетям и
                анализируем качество ответов. Это займёт 15-30 секунд.
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
                  {gaps.length} {gaps.length === 1 ? "вопрос" : "вопроса"} проверено по{" "}
                  {gaps[0]?.platforms?.length || 0} AI-платформам
                </p>
              </div>

              <div className="mt-10 space-y-8">
                {gaps.map((gap, i) => (
                  <div
                    key={gap.id}
                    className="rounded-2xl border border-gray-200 p-6"
                  >
                    {/* Question header */}
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-sm font-bold text-red-600">
                        {i + 1}
                      </span>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {gap.question}
                      </h3>
                    </div>

                    {/* Metrics */}
                    <div className="mt-4 flex items-center gap-6">
                      <div className="text-center">
                        <p className={`text-2xl font-bold ${
                          gap.avg_gap_score >= 8 ? "text-red-600" :
                          gap.avg_gap_score >= 5 ? "text-yellow-600" :
                          "text-green-600"
                        }`}>
                          {gap.avg_gap_score}/10
                        </p>
                        <p className="text-xs text-gray-500">
                          слабость ответа AI
                        </p>
                      </div>
                      {gap.search_intent && (
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          gap.search_intent === "commercial" ? "bg-green-100 text-green-800" :
                          gap.search_intent === "transactional" ? "bg-purple-100 text-purple-800" :
                          "bg-blue-100 text-blue-800"
                        }`}>
                          {gap.search_intent === "commercial" ? "Коммерческий" :
                           gap.search_intent === "transactional" ? "Транзакционный" :
                           "Информационный"}
                        </span>
                      )}
                    </div>

                    {/* Platform comparison table */}
                    <div className="mt-5 overflow-hidden rounded-lg border border-gray-200">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                            <th className="px-4 py-2">Платформа</th>
                            {MARKER_LABELS.map((m) => (
                              <th key={m.key} className="px-2 py-2 text-center">
                                {m.label}
                              </th>
                            ))}
                            <th className="px-3 py-2 text-center">Балл</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {gap.platforms.map((p) => {
                            const key = `${gap.id}-${p.platform}`;
                            const isExpanded = expandedPlatform === key;
                            return (
                              <>
                                <tr
                                  key={key}
                                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                                  onClick={() => togglePlatform(key)}
                                >
                                  <td className="px-4 py-3 font-medium text-gray-900">
                                    <span className="inline-flex items-center gap-1">
                                      <span className={`text-gray-400 text-xs transition-transform ${isExpanded ? "rotate-90" : ""}`}>&#9654;</span>
                                      {p.platform}
                                    </span>
                                  </td>
                                  {MARKER_LABELS.map((m) => (
                                    <td
                                      key={m.key}
                                      className="px-2 py-3 text-center"
                                    >
                                      <span
                                        className={
                                          p.markers[m.key]
                                            ? "text-green-600"
                                            : "text-red-500"
                                        }
                                      >
                                        {p.markers[m.key] ? "✓" : "✗"}
                                      </span>
                                    </td>
                                  ))}
                                  <td className="px-3 py-3 text-center">
                                    <span
                                      className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                                        p.gap_score >= 8
                                          ? "bg-red-100 text-red-700"
                                          : p.gap_score >= 5
                                          ? "bg-yellow-100 text-yellow-700"
                                          : "bg-green-100 text-green-700"
                                      }`}
                                    >
                                      {p.gap_score}
                                    </span>
                                  </td>
                                </tr>
                                {isExpanded && (
                                  <tr key={`${key}-detail`}>
                                    <td
                                      colSpan={6}
                                      className="bg-gray-50 px-4 py-3"
                                    >
                                      {p.weakness && (
                                        <p className="text-sm text-orange-600 font-medium mb-2">
                                          {p.weakness}
                                        </p>
                                      )}
                                      <p className="text-xs font-medium text-gray-500 mb-1">
                                        Ответ {p.platform} (в реальном времени):
                                      </p>
                                      <p className="text-sm text-gray-600 whitespace-pre-line">
                                        {p.ai_response}
                                      </p>
                                    </td>
                                  </tr>
                                )}
                              </>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div className="mt-12 rounded-2xl bg-blue-600 p-8 text-center">
                <h2 className="text-2xl font-bold text-white">
                  Хотите занять эти позиции?
                </h2>
                <p className="mt-2 text-blue-100">
                  Наговорите ответ за 10 минут — мы опубликуем экспертную
                  статью, которую будут цитировать нейросети.
                </p>
                <div className="mt-6">
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
