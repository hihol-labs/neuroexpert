import type { SupabaseClient } from "@supabase/supabase-js";
import { createOperatorNotifier, type NotifyOperator, type OperatorAlertKind } from "shared";
import { tgFetch } from "shared/http/telegram-fetch";

/**
 * R-02 (ADR-004): адаптер notifyOperator для worker — дедупликация через RPC claim_operator_alert
 * (миграция 030), отправка в Telegram админ-чата через tgFetch (прокси TG_PROXY_URL/OPENAI_PROXY_URL).
 * Без TELEGRAM_BOT_TOKEN/TELEGRAM_ADMIN_CHAT_ID канал считается отключённым (skipped, БД не трогается).
 */
type Env = Record<string, string | undefined>;
export interface OperatorAlertsDeps { admin: SupabaseClient; env?: Env; fetch?: typeof fetch; log?: (line: string) => void }

export function createWorkerOperatorNotifier(deps: OperatorAlertsDeps): NotifyOperator {
  const env = deps.env ?? process.env, http = deps.fetch ?? tgFetch;
  return createOperatorNotifier({
    enabled: () => Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_ADMIN_CHAT_ID),
    claim: async (key: string, kind: OperatorAlertKind, message: string, dedupSeconds: number) => {
      const { data, error } = await deps.admin.rpc("claim_operator_alert", { p_key: key, p_kind: kind, p_message: message, p_dedup_seconds: dedupSeconds });
      if (error) throw new Error(`claim_operator_alert: ${error.message}`);
      return data === true;
    },
    send: async (text: string) => {
      const res = await http(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(20000),
        body: JSON.stringify({ chat_id: env.TELEGRAM_ADMIN_CHAT_ID, text, disable_web_page_preview: true }),
      });
      if (!res.ok) throw new Error(`telegram HTTP ${res.status}`);
    },
    recordError: async (key: string, err: string) => {
      const { error } = await deps.admin.rpc("record_operator_alert_error", { p_key: key, p_error: err });
      if (error) throw new Error(error.message);
    },
    log: deps.log,
  });
}
