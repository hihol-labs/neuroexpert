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
  notice?: string;
  retry_at?: string;
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

const STATUS_LABELS: Record<string, string> = {
  pending: "Новые",
  accepted: "Выбраны",
  recording: "Запись",
  processing: "Обработка",
  review: "На проверке",
  published: "Опубликованы",
  rejected: "Отклонены",
  expired: "Истекли",
};

// R-06: итог действия с темой приходит параметром после редиректа из /api/expert-orders/*.
const NOTICES: Record<string, { tone: "ok" | "warn"; text: string }> = {
  accepted: { tone: "ok", text: "Тема выбрана. Нажмите «Записать ответ» у этой темы." },
  rejected: { tone: "ok", text: "Тема пропущена." },
  conflict: { tone: "warn", text: "Эта тема уже обработана — список обновлён." },
  not_found: { tone: "warn", text: "Тема не найдена." },
  bad_action: { tone: "warn", text: "Неизвестное действие." },
  generate_queued: { tone: "ok", text: "Подбираем темы — обновите страницу через минуту. Если новых тем не появится, значит подходящих вопросов по вашей нише пока нет." },
  generate_cooldown: { tone: "warn", text: "Подбор уже запускался за последние сутки." },
  generate_no_niche: { tone: "warn", text: "Сначала выберите нишу в профиле — темы подбираются по ней." },
  generate_failed: { tone: "warn", text: "Не удалось запустить подбор, попробуйте позже." },
  // R-09: лимит бесплатного тарифа - 3 пакета контента в месяц; ссылка на тарифы в разметке ниже.
  package_limit: { tone: "warn", text: "Лимит бесплатного тарифа исчерпан: 3 пакета контента в месяц. Новые темы откроются с 1-го числа следующего месяца или на платном тарифе." },
  package_check_failed: { tone: "warn", text: "Не удалось проверить лимит тарифа, тема не выбрана. Попробуйте ещё раз через минуту." },
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

type SearchIntent = "informational" | "commercial" | "transactional";

function inferSearchIntent(question: string): SearchIntent {
  const q = question.toLowerCase();
  if (/(цена|стоимость|сколько стоит|запис|консультац|при[её]м|купить|заказать)/i.test(q)) {
    return "transactional";
  }
  if (/(выбрать|лучший|рейтинг|отзывы|сравн|специалист|эксперт|клиник|юрист|психолог|нутрициолог)/i.test(q)) {
    return "commercial";
  }
  return "informational";
}

function getIntentLabel(intent: SearchIntent): string {
  if (intent === "transactional") return "Готов к записи";
  if (intent === "commercial") return "Выбирает специалиста";
  return "Изучает проблему";
}

function getRecommendedCta(intent: SearchIntent): string {
  if (intent === "transactional") return "Записаться на консультацию";
  if (intent === "commercial") return "Получить первичный разбор";
  return "Задать вопрос эксперту";
}

function getLeadPotential(volume: number, gapScore: number, intent: SearchIntent): { score: number; label: string; className: string } {
  const volumeScore = Math.min(3, Math.log10(Math.max(volume, 10)) - 1);
  const intentScore = intent === "transactional" ? 3 : intent === "commercial" ? 2 : 1;
  const score = Math.max(1, Math.min(10, Math.round(gapScore * 0.55 + volumeScore + intentScore)));
  if (score >= 8) return { score, label: "Высокий", className: "text-green-700 bg-green-50 border-green-100" };
  if (score >= 5) return { score, label: "Средний", className: "text-yellow-700 bg-yellow-50 border-yellow-100" };
  return { score, label: "Низкий", className: "text-gray-700 bg-gray-50 border-gray-100" };
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
    "expired",
  ];
  const notice = searchParams.notice ? NOTICES[searchParams.notice] : undefined;
  const retryAt = searchParams.retry_at && Number.isFinite(Date.parse(searchParams.retry_at)) ? new Date(searchParams.retry_at) : null;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Возможности спроса</h1>
        <p className="mt-1 text-sm text-gray-500">
          Это реальные вопросы людей, из которых можно сделать страницу для привлечения заявки.
          Таблица `orders` остаётся техническим названием, но в продукте это возможности спроса.
        </p>
        {/* R-06: не ждать недельного подбора (понедельник) - поставить подбор тем в очередь сейчас. */}
        <form action="/api/expert-orders/generate" method="POST" className="mt-4">
          <button className="px-4 py-2 text-sm font-medium text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-50">
            Подобрать темы сейчас
          </button>
          <span className="ml-3 text-xs text-gray-500">Не чаще одного раза в сутки</span>
        </form>
      </div>

      {notice && (
        <p
          role="status"
          className={`mb-6 px-4 py-3 rounded-lg text-sm border ${notice.tone === "ok" ? "bg-green-50 border-green-200 text-green-800" : "bg-amber-50 border-amber-200 text-amber-800"}`}
        >
          {notice.text}
          {searchParams.notice === "generate_cooldown" && retryAt ? ` Следующий запуск — после ${retryAt.toLocaleString("ru-RU", { timeZone: "Europe/Moscow" })} (мск).` : ""}
          {searchParams.notice === "package_limit" ? <> <Link href="/billing" className="underline font-medium">Посмотреть тарифы</Link></> : null}
        </p>
      )}

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
            {STATUS_LABELS[s] ?? s}
          </Link>
        ))}
      </div>

      {!orders?.length ? (
        <p className="text-gray-500 py-12 text-center">
          Возможностей спроса пока нет. Они обновляются после сбора спроса по вашей нише.
        </p>
      ) : (
        <div className="space-y-4">
          {orders.map((o: Record<string, unknown>) => {
            const q = o.questions as Record<string, unknown> | null;
            const questionText = (q?.question_text as string) ?? "—";
            const gapScore = (q?.gap_score as number) ?? 0;
            const volume = (q?.monthly_volume as number) ?? 0;
            const intent = inferSearchIntent(questionText);
            const leadPotential = getLeadPotential(volume, gapScore, intent);
            const recommendedCta = getRecommendedCta(intent);
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
                      <span className={`text-xs font-medium border px-2 py-0.5 rounded-full ${leadPotential.className}`}>
                        Потенциал заявки: {leadPotential.label}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900 text-lg">
                      {questionText}
                    </h3>
                    <div className="flex gap-4 mt-1 text-sm text-gray-500">
                      <span>
                        Слабость AI-ответа:{" "}
                        <span
                          className={`font-medium ${gapScore >= 7 ? "text-red-600" : gapScore >= 4 ? "text-yellow-600" : "text-green-600"}`}
                        >
                          {gapScore}/10
                        </span>
                      </span>
                      <span>{volume.toLocaleString()} запросов/мес</span>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                        <p className="text-xs text-gray-500">Намерение</p>
                        <p className="text-sm font-medium text-gray-900">{getIntentLabel(intent)}</p>
                      </div>
                      <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                        <p className="text-xs text-gray-500">Потенциал заявки</p>
                        <p className="text-sm font-medium text-gray-900">{leadPotential.score}/10</p>
                      </div>
                      <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                        <p className="text-xs text-gray-500">Рекомендуемый CTA</p>
                        <p className="text-sm font-medium text-gray-900">{recommendedCta}</p>
                      </div>
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
                        опыт может закрыть реальный спрос. Наговорите 5-10 минут,
                        и мы превратим ответ в страницу с кнопкой «{recommendedCta}».
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
                      <form action={`/api/expert-orders/${o.id as string}/skip`} method="POST">
                        <button className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
                          Пропустить
                        </button>
                      </form>
                      <form action={`/api/expert-orders/${o.id as string}/accept`} method="POST">
                        <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                          Превратить в страницу
                        </button>
                      </form>
                    </div>
                  )}

                  {o.status === "accepted" && (
                    <Link
                      href={`/content/new?order_id=${o.id as string}`}
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
