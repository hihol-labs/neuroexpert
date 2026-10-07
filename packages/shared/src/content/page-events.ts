/**
 * R-10 (E-AUTO-16): решение /api/page-events без ввода-вывода. Маршрут сначала учитывает запрос в
 * SlidingWindowLimiter по IP, затем проверяет поля, затем - что пакет опубликован, и только потом пишет метрику.
 */
export const PAGE_EVENTS_LIMIT = 60;
export const PAGE_EVENTS_WINDOW_MS = 60_000;
export const PAGE_EVENT_TYPES = ["view", "cta_view", "cta_click", "lead"] as const;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

export type PageEventDecision = { ok: true } | { ok: false; status: 400 | 404 | 429; error: string };

/**
 * published не передан - проверка до запроса в БД; false - пакет не найден или не опубликован (404, метрика
 * не пишется); true - можно писать.
 */
export function pageEventDecision(input: { rateAllowed: boolean; contentId: unknown; eventType: unknown; published?: boolean }): PageEventDecision {
  if (!input.rateAllowed) return { ok: false, status: 429, error: "Too many events" };
  if (!isUuid(input.contentId) || !(PAGE_EVENT_TYPES as readonly unknown[]).includes(input.eventType)) {
    return { ok: false, status: 400, error: "content_id (uuid) and valid event_type are required" };
  }
  if (input.published === false) return { ok: false, status: 404, error: "Content not found" };
  return { ok: true };
}
