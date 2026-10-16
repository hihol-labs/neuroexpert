import type { SupabaseClient } from "@supabase/supabase-js";
import { createExpertNotifier, type ExpertNotifyKind, type NotifyExpert, type TelegramButton } from "shared";
import { tgFetch } from "shared/http/telegram-fetch";
import { createMailer, type SendMail } from "./mailer.js";

/**
 * R-08: адаптер notifyExpert для worker - единственного отправителя уведомлений эксперту.
 * Дедуп - строка public.expert_notifications (UNIQUE expert_id+kind+ref_id, миграция 034);
 * Telegram - tgFetch через прокси с проверкой ответа; e-mail - общий SMTP-мейлер worker'а.
 */
type Env = Record<string, string | undefined>;
export interface ExpertNotifyDeps { admin: SupabaseClient; env?: Env; fetch?: typeof fetch; mail?: SendMail; log?: (line: string) => void }

export function createWorkerExpertNotifier(deps: ExpertNotifyDeps): NotifyExpert {
  const env = deps.env ?? process.env, http = deps.fetch ?? tgFetch;
  const mail = deps.mail ?? createMailer(env);
  const appUrl = (env.APP_URL || env.NEXT_PUBLIC_APP_URL || "https://neuroexpertise.ru").replace(/\/+$/, "");
  const table = () => deps.admin.from("expert_notifications");
  return createExpertNotifier({
    appUrl,
    claim: async (expertId: string, kind: ExpertNotifyKind, refId: string) => {
      const { data, error } = await table()
        .upsert({ expert_id: expertId, kind, ref_id: refId }, { onConflict: "expert_id,kind,ref_id", ignoreDuplicates: true })
        .select("id");
      if (error) throw new Error(`expert_notifications claim: ${error.message}`);
      return Array.isArray(data) && data.length > 0;
    },
    complete: async (expertId, kind, refId, result) => {
      const { error } = await table().update({ telegram: result.telegram, email: result.email, sent_at: new Date().toISOString() })
        .eq("expert_id", expertId).eq("kind", kind).eq("ref_id", refId);
      if (error) throw new Error(`expert_notifications complete: ${error.message}`);
    },
    release: async (expertId, kind, refId) => {
      const { error } = await table().delete().eq("expert_id", expertId).eq("kind", kind).eq("ref_id", refId);
      if (error) throw new Error(`expert_notifications release: ${error.message}`);
    },
    sendTelegram: async (chatId: number, text: string, keyboard?: TelegramButton[][]) => {
      const token = env.TELEGRAM_BOT_TOKEN;
      if (!token) throw new Error("TELEGRAM_BOT_TOKEN is missing");
      const res = await http(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(20000),
        body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true, ...(keyboard ? { reply_markup: { inline_keyboard: keyboard } } : {}) }),
      });
      // Раньше ответ не проверялся: 400 (например, callback_data длиннее 64 байт) терялся молча.
      if (!res.ok) throw new Error(`telegram HTTP ${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}`);
    },
    sendEmail: (to, subject, text, html) => mail({ to, subject, text, html }),
    log: deps.log,
  });
}
