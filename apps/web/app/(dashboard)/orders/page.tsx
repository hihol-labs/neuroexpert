import Link from "next/link";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { Badge } from "@/components/ui/badge";

function getSupabase() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

interface SearchParams {
  status?: string;
}

const MARKER_LABELS: Record<string, { label: string; good: string; bad: string }> = {
  has_expert_name: {
    label: "Имя эксперта",
    good: "Упоминает конкретного специалиста",
    bad: "Нет ссылки на реального эксперта",
  },
  has_specific_examples: {
    label: "Примеры из практики",
    good: "Есть конкретные кейсы",
    bad: "Только общие фразы, без примеров",
  },
  has_specific_numbers: {
    label: "Цифры и сроки",
    good: "Указаны конкретные данные",
    bad: "Размытые формулировки без цифр",
  },
  has_source_link: {
    label: "Ссылка на источник",
    good: "Есть URL на источник",
    bad: "Нет ссылок на первоисточники",
  },
};

function extractMentionedExperts(text: string): string[] {
  if (!text) return [];
  const names = new Set<string>();
  const patterns = [
    /(?:по мнению|как отмечает|как считает|как говорит|рекомендует)\s+([А-ЯЁ][а-яё]+\s+[А-ЯЁ][а-яё]+)/gi,
    /(?:доктор|профессор|к\.м\.н|д\.м\.н|кандидат|академик)\s+([А-ЯЁ][а-яё]+(?:\s+[А-ЯЁ][а-яё]+)?)/gi,
    /(?:Dr\.|Professor)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi,
  ];
  for (const p of patterns) {
    for (const m of text.matchAll(p)) {
      if (m[1] && m[1].length > 3) names.add(m[1].trim());
    }
  }
  return Array.from(names).slice(0, 3);
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { createClient } = await import("@/lib/supabase/server");
  const authClient = createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) return null;

  const supabase = getSupabase();
  let query = supabase
    .from("orders")
    .select(
      "id, status, week_number, expires_at, created_at, is_priority, questions(question_text, gap_score, monthly_volume, ai_response_chatgpt, ai_response_yandexgpt, has_expert_name, has_specific_examples, has_specific_numbers, has_source_link)",
    )
    .eq("expert_id", user.id)
    .order("created_at", { ascending: false });

  if (searchParams.status) {
    query = query.eq("status", searchParams.status);
  }

  const { data: orders } = await query.limit(50);

  const statuses = [
    "pending",
    "accepted",
    "recording",
    "processing",
    "review",
    "published",
    "rejected",
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Заказы</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Link
          href="/orders"
          className={`px-3 py-1.5 rounded-full text-sm border ${!searchParams.status ? "bg-blue-600 text-white border-blue-600" : "text-gray-700 border-gray-300 hover:border-blue-300"}`}
        >
          Все
        </Link>
        {statuses.map((s) => (
          <Link
            key={s}
            href={`/orders?status=${s}`}
            className={`px-3 py-1.5 rounded-full text-sm border ${searchParams.status === s ? "bg-blue-600 text-white border-blue-600" : "text-gray-700 border-gray-300 hover:border-blue-300"}`}
          >
            {s}
          </Link>
        ))}
      </div>

      {!orders?.length ? (
        <p className="text-gray-500 py-12 text-center">
          Заказов пока нет. Они обновляются каждый понедельник.
        </p>
      ) : (
        <div className="space-y-4">
          {orders.map((o: Record<string, unknown>) => {
            const q = o.questions as Record<string, unknown> | null;
            const questionText = (q?.question_text as string) ?? "—";
            const gapScore = (q?.gap_score as number) ?? 0;
            const volume = (q?.monthly_volume as number) ?? 0;
            const aiResponse =
              (q?.ai_response_chatgpt as string) ||
              (q?.ai_response_yandexgpt as string) ||
              "";
            // Extract competitor names from AI response
            const competitorNames = extractMentionedExperts(aiResponse);
            const isPending = o.status === "pending";
            const isPriority = o.is_priority as boolean;

            return (
              <div
                key={o.id as string}
                className={`bg-white border rounded-xl overflow-hidden ${isPriority ? "border-blue-200 ring-1 ring-blue-100" : ""}`}
              >
                {/* Header */}
                <div className="px-6 py-4 border-b flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {gapScore >= 8 && (
                        <span className="text-xs font-medium bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                          AI даёт неточный ответ
                        </span>
                      )}
                      {isPriority && gapScore < 8 && (
                        <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          Высокий приоритет
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900 text-lg">
                      {questionText}
                    </h3>
                    <div className="flex gap-4 mt-1 text-sm text-gray-500">
                      <span>
                        Gap Score:{" "}
                        <span
                          className={`font-medium ${gapScore >= 7 ? "text-red-600" : gapScore >= 4 ? "text-yellow-600" : "text-green-600"}`}
                        >
                          {gapScore}/10
                        </span>
                      </span>
                      <span>{volume.toLocaleString()} запросов/мес</span>
                    </div>
                  </div>
                  <Badge status={o.status as string} />
                </div>

                {/* AI Response preview — shown for pending orders */}
                {isPending && aiResponse && (
                  <div className="px-6 py-4 bg-gray-50 border-b">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                      Текущий ответ нейросети
                    </p>
                    <div className="bg-white border rounded-lg p-4 text-sm text-gray-700 max-h-48 overflow-y-auto leading-relaxed">
                      {aiResponse.slice(0, 800)}
                      {aiResponse.length > 800 && (
                        <span className="text-gray-400">...</span>
                      )}
                    </div>

                    {/* Markers checklist */}
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      {Object.entries(MARKER_LABELS).map(
                        ([key, { label, good, bad }]) => {
                          const value = q?.[key] as boolean | null;
                          const isWeak = value === false || value === null;
                          return (
                            <div
                              key={key}
                              className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs ${
                                isWeak
                                  ? "bg-red-50 border border-red-100"
                                  : "bg-green-50 border border-green-100"
                              }`}
                            >
                              <span
                                className={`mt-0.5 flex-shrink-0 ${isWeak ? "text-red-500" : "text-green-500"}`}
                              >
                                {isWeak ? "✗" : "✓"}
                              </span>
                              <div>
                                <span
                                  className={`font-medium ${isWeak ? "text-red-700" : "text-green-700"}`}
                                >
                                  {label}
                                </span>
                                <p
                                  className={`mt-0.5 ${isWeak ? "text-red-600" : "text-green-600"}`}
                                >
                                  {isWeak ? bad : good}
                                </p>
                              </div>
                            </div>
                          );
                        },
                      )}
                    </div>

                    {/* Competitor insight */}
                    {competitorNames.length > 0 && (
                      <div className="mt-3 bg-orange-50 border border-orange-100 rounded-lg px-3 py-2">
                        <p className="text-sm text-orange-800">
                          Сейчас по этому запросу цитируется:{" "}
                          <strong>{competitorNames.join(", ")}</strong>.
                          Ваш ответ с конкретными примерами из практики может занять эту позицию.
                        </p>
                      </div>
                    )}

                    {/* Motivation line */}
                    {gapScore >= 6 && competitorNames.length === 0 && (
                      <p className="mt-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                        Нейросеть даёт слабый ответ без упоминания экспертов — ваш
                        опыт значительно ценнее. Наговорите 5-10 минут, и тысячи
                        людей получат качественный ответ.
                      </p>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="px-6 py-3 flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {o.created_at
                      ? new Date(o.created_at as string).toLocaleDateString(
                          "ru-RU",
                        )
                      : ""}
                  </span>

                  {isPending && (
                    <div className="flex gap-3">
                      <form action="/api/orders/skip" method="POST">
                        <input
                          type="hidden"
                          name="order_id"
                          value={o.id as string}
                        />
                        <button className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
                          Пропустить
                        </button>
                      </form>
                      <form action="/api/orders/accept" method="POST">
                        <input
                          type="hidden"
                          name="order_id"
                          value={o.id as string}
                        />
                        <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                          Я отвечу лучше
                        </button>
                      </form>
                    </div>
                  )}

                  {o.status === "accepted" && (
                    <Link
                      href="/content/new"
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                    >
                      Записать ответ
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
