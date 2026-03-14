import type { Bot } from "grammy";
import { supabase } from "../supabase";

export function registerLeadsHandler(bot: Bot): void {
  // Accept lead
  bot.callbackQuery(/^accept_lead:(.+)$/, async (ctx) => {
    const leadId = ctx.match[1];

    const { error } = await supabase
      .from("leads")
      .update({ status: "accepted", notified_at: new Date().toISOString() })
      .eq("id", leadId)
      .eq("status", "new");

    if (error) {
      await ctx.answerCallbackQuery({ text: "Ошибка" });
      return;
    }

    await ctx.answerCallbackQuery({ text: "Заявка принята!" });
    await ctx.editMessageText(
      (ctx.callbackQuery.message?.text ?? "") + "\n\n✅ Принята",
    );
  });

  // Reject lead
  bot.callbackQuery(/^reject_lead:(.+)$/, async (ctx) => {
    const leadId = ctx.match[1];

    const { error } = await supabase
      .from("leads")
      .update({ status: "rejected" })
      .eq("id", leadId)
      .eq("status", "new");

    if (error) {
      await ctx.answerCallbackQuery({ text: "Ошибка" });
      return;
    }

    await ctx.answerCallbackQuery({ text: "Заявка отклонена" });
    await ctx.editMessageText(
      (ctx.callbackQuery.message?.text ?? "") + "\n\n❌ Отклонена",
    );
  });
}
