import type { Bot } from "grammy";
import { supabase } from "../supabase";

/**
 * Кнопки заявки в Telegram. R-08: запись только в заявку эксперта, нажавшего кнопку (профиль по
 * telegram_id) - раньше любой пользователь бота мог принять/отклонить чужую заявку по её id.
 */
async function getProfileId(telegramId: number): Promise<string | null> {
  const { data } = await supabase.from("profiles").select("id").eq("telegram_id", telegramId).maybeSingle();
  return data?.id ?? null;
}

export function registerLeadsHandler(bot: Bot): void {
  bot.callbackQuery(/^(accept|reject)_lead:(.+)$/, async (ctx) => {
    const accept = ctx.match[1] === "accept";
    const leadId = ctx.match[2];
    const profileId = await getProfileId(ctx.from.id);
    if (!profileId) {
      await ctx.answerCallbackQuery({ text: "Профиль не найден" });
      return;
    }

    const { data: updated, error } = await supabase
      .from("leads")
      .update(accept ? { status: "accepted", notified_at: new Date().toISOString() } : { status: "rejected" })
      .eq("id", leadId)
      .eq("expert_id", profileId)
      .eq("status", "new")
      .select("id");

    if (error || !updated || updated.length === 0) {
      await ctx.answerCallbackQuery({ text: error ? "Ошибка" : "Заявка уже обработана или не найдена" });
      return;
    }

    await ctx.answerCallbackQuery({ text: accept ? "Заявка принята!" : "Заявка отклонена" });
    await ctx.editMessageText((ctx.callbackQuery.message?.text ?? "") + (accept ? "\n\n✅ Принята" : "\n\n❌ Отклонена"));
  });
}
