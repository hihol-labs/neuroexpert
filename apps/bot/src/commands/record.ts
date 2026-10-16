import type { Bot } from "grammy";
import { supabase } from "../supabase";
import { RECORD_TOPICS_LIMIT, recordOrderKeyboard } from "../keyboards";

const TIPS =
  "Советы:\n" +
  "- Говорите 2-5 минут\n" +
  "- Представьтесь и назовите свою квалификацию\n" +
  "- Приведите конкретные примеры из практики\n" +
  "- Дайте чёткие рекомендации\n\n" +
  "Просто запишите голосовое сообщение прямо здесь.";

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

    // R-06 (E-AUTO-7): принятые темы, последняя выбранная - первой; к ней привяжется голосовое.
    const { data: accepted } = await supabase
      .from("orders")
      .select("id, questions!inner(question_text)")
      .eq("expert_id", profile.id)
      .eq("status", "accepted")
      .order("updated_at", { ascending: false })
      .limit(RECORD_TOPICS_LIMIT);

    const topics = (accepted ?? []).map((o) => ({
      id: o.id as string,
      question: ((o as any).questions?.question_text as string | undefined) ?? "",
    }));

    if (topics.length === 0) {
      await ctx.reply(
        "Выбранных тем нет — запись пойдёт как свободная тема.\n" +
          "Чтобы ответить на конкретный вопрос, сначала примите тему: /orders\n\n" +
          "Просто запишите голосовое сообщение прямо здесь.",
      );
      return;
    }

    if (topics.length === 1) {
      await ctx.reply(
        "Запишите голосовое сообщение с вашим экспертным ответом.\n\n" +
          `Вопрос: ${topics[0].question}\n\n` +
          TIPS,
      );
      return;
    }

    await ctx.reply(
      `Сейчас голосовое будет привязано к последней выбранной теме:\n\nВопрос: ${topics[0].question}\n\n` +
        "Хотите ответить на другой вопрос — выберите его кнопкой ниже, затем запишите голосовое.\n\n" +
        TIPS,
      { reply_markup: recordOrderKeyboard(topics) },
    );
  });
}
