import { createClient } from "@supabase/supabase-js";
import { createOperatorNotifier, type NotifyOperator, type OperatorAlertKind } from "shared";
import { tgFetch } from "shared/http/telegram-fetch";

/**
 * R-02 (ADR-004): адаптер notifyOperator для web (server-only): дедупликация через RPC
 * claim_operator_alert (миграция 030), отправка в Telegram админ-чата через tgFetch (прокси).
 * Никогда не бросает — ответ клиенту не зависит от алерта.
 */
let cached: NotifyOperator | null = null;

export function getOperatorNotifier(): NotifyOperator {
  if (cached) return cached;
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  cached = createOperatorNotifier({
    enabled: () => Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_ADMIN_CHAT_ID),
    claim: async (key: string, kind: OperatorAlertKind, message: string, dedupSeconds: number) => {
      const { data, error } = await admin.rpc("claim_operator_alert", { p_key: key, p_kind: kind, p_message: message, p_dedup_seconds: dedupSeconds });
      if (error) throw new Error(`claim_operator_alert: ${error.message}`);
      return data === true;
    },
    send: async (text: string) => {
      const res = await tgFetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(20000),
        body: JSON.stringify({ chat_id: process.env.TELEGRAM_ADMIN_CHAT_ID, text, disable_web_page_preview: true }),
      });
      if (!res.ok) throw new Error(`telegram HTTP ${res.status}`);
    },
    recordError: async (key: string, err: string) => {
      const { error } = await admin.rpc("record_operator_alert_error", { p_key: key, p_error: err });
      if (error) throw new Error(error.message);
    },
    log: (line) => console.error(line),
  });
  return cached;
}

/** Удобный вызов из роутов: notifyOperator("service_order", id, { ... }). */
export const notifyOperator: NotifyOperator = (kind, id, fields) => getOperatorNotifier()(kind, id, fields);
