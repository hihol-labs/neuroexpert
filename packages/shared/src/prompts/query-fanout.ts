// Query Fan-Out — разбиение вопроса на подзапросы

export function buildQueryFanoutPrompt(question: string): string {
  return `Разбей вопрос пользователя на 3–5 подзапросов, как это сделал бы AI Search при поиске ответа.

Вопрос: ${question}

Каждый подзапрос должен:
- Покрывать отдельный аспект основного вопроса
- Быть конкретным и поисковым (как запрос в Google/Yandex)
- Быть полезным для составления полного экспертного ответа
- Иметь AEO-кластер:
  - informational: объяснение, признаки, инструкция, симптомы
  - comparative: сравнение подходов, вариантов, специалистов
  - recommendation: кого выбрать, лучший вариант, кому подходит
  - transactional: цена, запись, консультация, где сделать

Ответь JSON-массивом объектов:
[
  {
    "query": "подзапрос",
    "cluster": "informational|comparative|recommendation|transactional",
    "user_intent": "какое намерение стоит за запросом",
    "desired_answer": "какой ответ должен дать эксперт",
    "next_cta": "какое действие логично предложить"
  }
]`;
}

export type FanoutItem = string | {
  query?: string;
  cluster?: string;
  user_intent?: string;
  desired_answer?: string;
  next_cta?: string;
};

const FANOUT_WRAPPER_KEYS = ["subqueries", "sub_queries", "queries", "items", "data", "result"];

/**
 * Приводит ответ провайдера к массиву подзапросов.
 *
 * Промпт просит JSON-массив, но OpenAI в режиме `response_format: json_object`
 * по контракту отдаёт только объект и заворачивает массив в ключ
 * (`{"subqueries": [...]}`). До этой нормализации fallback на OpenAI для
 * expand_query не мог сработать никогда: `Array.isArray` давал false и job
 * закрывался «успехом» с нулём подзапросов (QUEUE-4, канарейка 2026-09-01).
 *
 * Пустой массив на выходе — не успех: решение об ошибке принимает вызывающий.
 */
export function normalizeFanoutResponse(raw: unknown): FanoutItem[] {
  if (Array.isArray(raw)) return raw.filter(isFanoutItem);
  if (raw && typeof raw === "object") {
    const record = raw as Record<string, unknown>;
    for (const key of FANOUT_WRAPPER_KEYS) {
      if (Array.isArray(record[key])) return (record[key] as unknown[]).filter(isFanoutItem);
    }
    const firstArray = Object.values(record).find(Array.isArray);
    if (firstArray) return (firstArray as unknown[]).filter(isFanoutItem);
  }
  return [];
}

function isFanoutItem(value: unknown): value is FanoutItem {
  if (typeof value === "string") return value.trim().length > 0;
  return Boolean(value) && typeof value === "object"
    && typeof (value as { query?: unknown }).query === "string"
    && ((value as { query: string }).query).trim().length > 0;
}
