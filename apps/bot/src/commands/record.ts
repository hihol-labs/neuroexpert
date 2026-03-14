import type { Bot } from "grammy";
import { supabase } from "../supabase";

export function registerRecordCommand(bot: Bot): void {
  bot.command("record", async (ctx) => {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("telegram_id", telegramId)
      .single();

    if (!profile) {
      await ctx.reply("Сначала зарегистрируйтесь: /start");
      return;
    }

    // Проверяем, есть ли принятые заказы
    const { data: accepted } = await supabase
      .from("orders")
      .select("id, questions!inner(question_text)")
      .eq("expert_id", profile.id)
      .eq("status", "accepted")
      .order("created_at", { ascending: true })
      .limit(1);

    if (accepted && accepted.length > 0) {
      const question = (accepted[0] as any).questions?.question_text ?? "";
      await ctx.reply(
        "Запишите голосовое сообщение с вашим экспертным ответом.\n\n" +
          `Вопрос: ${question}\n\n` +
          "Советы:\n" +
          "- Говорите 2-5 минут\n" +
          "- Представьтесь и назовите свою квалификацию\n" +
          "- Приведите конкретные примеры из практики\n" +
          "- Дайте чёткие рекомендации\n\n" +
          "Просто запишите голосовое сообщение прямо здесь.",
      );
    } else {
      await ctx.reply(
        "Вы можете записать голосовое сообщение в любое время.\n\n" +
          "Если у вас есть принятые заказы (/orders), " +
          "ответ будет привязан к первому из них.\n\n" +
          "Просто запишите голосовое сообщение прямо здесь.",
      );
    }
  });
}
