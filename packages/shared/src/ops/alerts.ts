/**
 * R-02 (ADR-004): реестр алертов оператору. Чистый модуль: виды, ключи дедупликации, текст.
 *
 * Принцип: оператор узнаёт о каждом исключении штатного пути (провал/возврат/SLA/квоты/деградация
 * health/заявка Launch-Managed) из одного канала — Telegram админ-чата, — и не тонет в повторах:
 * один ключ шлётся не чаще окна дедупликации (по умолчанию 1 час), повторы считаются в БД.
 */
export type OperatorAlertKind =
  | "order_failed"
  | "order_refunded"
  | "sla_breached"
  | "email_failed"
  | "reconcile_mismatch"
  | "reconcile_errors"
  | "quota_exhausted"
  | "rate_limited"
  | "health_degraded"
  | "service_order";

export const OPERATOR_ALERT_KINDS: readonly OperatorAlertKind[] = [
  "order_failed", "order_refunded", "sla_breached", "email_failed", "reconcile_mismatch",
  "reconcile_errors", "quota_exhausted", "rate_limited", "health_degraded", "service_order",
];

export const DEFAULT_ALERT_DEDUP_SECONDS = 3600;

/** Окно дедупликации по виду; всё, что не перечислено, — 1 час. */
export const OPERATOR_ALERT_DEDUP_SECONDS: Partial<Record<OperatorAlertKind, number>> = {
  health_degraded: 3600,
  reconcile_errors: 3600,
  quota_exhausted: 6 * 3600,
  rate_limited: 3600,
};

const TITLES: Record<OperatorAlertKind, string> = {
  order_failed: "Аудит Старт: замер не выполнен, возврат запущен",
  order_refunded: "Аудит Старт: возврат подтвержден кассой",
  sla_breached: "Аудит Старт: SLA 60 минут нарушен",
  email_failed: "Письмо клиенту не ушло (SMTP)",
  reconcile_mismatch: "Сверка платежей: платеж не соответствует заказу - нужен оператор",
  reconcile_errors: "Сверка платежей: ошибки прохода",
  quota_exhausted: "Провайдер: квота или биллинг исчерпаны",
  rate_limited: "Провайдер: лимит запросов, job остановлен",
  health_degraded: "Health: degraded",
  service_order: "Новая заявка Launch Start / Managed Lite",
};

export function alertDedupSeconds(kind: OperatorAlertKind): number {
  return OPERATOR_ALERT_DEDUP_SECONDS[kind] ?? DEFAULT_ALERT_DEDUP_SECONDS;
}

/** Ключ дедупликации: вид + идентификатор сущности (заказ, job-тип, id заявки). */
export function alertKey(kind: OperatorAlertKind, id?: string | null): string {
  const safe = (id ?? "").toString().trim().replace(/[^A-Za-z0-9_.:-]/g, "_").slice(0, 80);
  return safe ? `${kind}:${safe}` : kind;
}

export type AlertFields = Record<string, string | number | boolean | null | undefined>;

/**
 * Текст сообщения: заголовок + строки "поле: значение" (пустые пропускаются), без PII сверх
 * переданного. Стиль: без "ё", короткое тире, прямые кавычки. Лимит Telegram 4096 - режем до 3500.
 */
export function formatOperatorAlert(kind: OperatorAlertKind, fields: AlertFields = {}): string {
  const lines = [`[NeuroExpert] ${TITLES[kind]}`];
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined || v === null || v === "") continue;
    lines.push(`${k}: ${String(v).replace(/\s+/g, " ").slice(0, 400)}`);
  }
  return lines.join("\n").slice(0, 3500);
}

export function isOperatorAlertKind(value: unknown): value is OperatorAlertKind {
  return typeof value === "string" && (OPERATOR_ALERT_KINDS as readonly string[]).includes(value);
}
