import { alertDedupSeconds, alertKey, formatOperatorAlert, type AlertFields, type OperatorAlertKind } from "./alerts.js";

/**
 * R-02 (ADR-004): единый канал notifyOperator(kind, id, fields).
 *
 * Зависимости инъецируются (worker и web дают адаптеры):
 *   claim(key, kind, message, dedupSeconds) -> true, если сообщение надо отправить (атомарно в БД:
 *     нет строки или last_sent_at старше окна); false — дубль в окне, только счётчик.
 *   send(text) -> отправка в Telegram админ-чата (tgFetch через прокси).
 *   recordError(key, error) -> отметить неудачную отправку (и снять last_sent_at, чтобы повторить).
 * Инвариант: notifyOperator НИКОГДА не бросает — алерт не имеет права сломать основной путь
 * (оплата, возврат, job). Результат — статус для логов и тестов.
 */
export type NotifyOutcome = "sent" | "deduped" | "failed" | "skipped";

export interface OperatorNotifierDeps {
  claim: (key: string, kind: OperatorAlertKind, message: string, dedupSeconds: number) => Promise<boolean>;
  send: (text: string) => Promise<void>;
  recordError?: (key: string, error: string) => Promise<void>;
  /** false — канал не сконфигурирован (нет токена/чата): всё уходит в skipped без обращения к БД. */
  enabled?: () => boolean;
  log?: (line: string) => void;
}

export type NotifyOperator = (kind: OperatorAlertKind, id: string | null | undefined, fields?: AlertFields) => Promise<NotifyOutcome>;

export function createOperatorNotifier(deps: OperatorNotifierDeps): NotifyOperator {
  const log = deps.log ?? ((line: string) => console.error(line));
  return async function notifyOperator(kind, id, fields = {}) {
    const key = alertKey(kind, id);
    try {
      if (deps.enabled && !deps.enabled()) { log(`[alerts] ${key}: channel not configured, skipped`); return "skipped"; }
      const text = formatOperatorAlert(kind, fields);
      const send = await deps.claim(key, kind, text, alertDedupSeconds(kind));
      if (!send) return "deduped";
      try {
        await deps.send(text);
        return "sent";
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        log(`[alerts] ${key}: send failed: ${msg}`);
        try { await deps.recordError?.(key, msg.slice(0, 500)); } catch { /* запись ошибки не должна бросать */ }
        return "failed";
      }
    } catch (e) {
      // Отказ claim (БД/RPC) намеренно не пишется через recordError: строки может не быть, а RPC —
      // тот же недоступный канал. Диагностика — лог `[alerts] <key>: claim failed` (см. OPERATIONS §9b).
      log(`[alerts] ${key}: claim failed: ${e instanceof Error ? e.message : String(e)}`);
      return "failed";
    }
  };
}
