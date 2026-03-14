import type { Bot } from "grammy";
import { supabase } from "../supabase.js";
import { nicheKeyboard, contentReviewKeyboard } from "../keyboards.js";
import { NICHES } from "shared";

export function registerCallbackHandler(bot: Bot): void {
  // Выбор ниши
  bot.callbackQuery(/^select_niche:(.+)$/, async (ctx) => {
    const nicheId = ctx.match[1];
    const telegramId = ctx.from.id;

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("telegram_id", telegramId)
      .single();

    if (!profile) {
      await ctx.answerCallbackQuery({ text: "Профиль не найден" });
      return;
    }

    if (nicheId === "other") {
      await ctx.answerCallbackQuery();
      await ctx.editMessageText(
        "Напишите название вашей ниши текстом, и мы добавим её.",
      );
      return;
    }

    const niche = NICHES.find((n) => n.id === nicheId);
    if (!niche) {
      await ctx.answerCallbackQuery({ text: "Ниша не найдена" });
      return;
    }

    await supabase
      .from("profiles")
      .update({ niche_id: nicheId })
      .eq("id", profile.id);

    await ctx.answerCallbackQuery({ text: `Выбрана: ${niche.name}` });
    await ctx.editMessageText(
      `Отлично! Ваша ниша: ${niche.icon} ${niche.name}\n\n` +
        "Теперь вы будете получать заказы по вашей теме.\n\n" +
        "/orders — посмотреть заказы\n" +
        "/record — записать голосовое\n" +
        "/status — ваш профиль",
    );
  });

  // Принять заказ
  bot.callbackQuery(/^accept_order:(.+)$/, async (ctx) => {
    const orderId = ctx.match[1];
    const telegramId = ctx.from.id;

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("telegram_id", telegramId)
      .single();

    if (!profile) {
      await ctx.answerCallbackQuery({ text: "Профиль не найден" });
      return;
    }

    const { error } = await supabase
      .from("orders")
      .update({ status: "accepted" })
      .eq("id", orderId)
      .eq("expert_id", profile.id)
      .eq("status", "pending");

    if (error) {
      await ctx.answerCallbackQuery({ text: "Ошибка при принятии заказа" });
      return;
    }

    await ctx.answerCallbackQuery({ text: "Заказ принят!" });
    await ctx.editMessageText(
      ctx.callbackQuery.message?.text + "\n\nСтатус: Принят",
    );
    await ctx.reply(
      "Заказ принят! Запишите голосовое с ответом:\n/record",
    );
  });

  // Пропустить заказ
  bot.callbackQuery(/^skip_order:(.+)$/, async (ctx) => {
    const orderId = ctx.match[1];
    const telegramId = ctx.from.id;

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("telegram_id", telegramId)
      .single();

    if (!profile) {
      await ctx.answerCallbackQuery({ text: "Профиль не найден" });
      return;
    }

    const { error } = await supabase
      .from("orders")
      .update({ status: "rejected" })
      .eq("id", orderId)
      .eq("expert_id", profile.id)
      .eq("status", "pending");

    if (error) {
      await ctx.answerCallbackQuery({ text: "Ошибка" });
      return;
    }

    await ctx.answerCallbackQuery({ text: "Заказ пропущен" });
    await ctx.editMessageText(
      ctx.callbackQuery.message?.text + "\n\nСтатус: Пропущен",
    );
  });

  // Одобрить контент
  bot.callbackQuery(/^approve:(.+)$/, async (ctx) => {
    const contentId = ctx.match[1];

    const { error } = await supabase
      .from("content_packages")
      .update({ status: "approved" })
      .eq("id", contentId)
      .eq("status", "review");

    if (error) {
      await ctx.answerCallbackQuery({ text: "Ошибка" });
      return;
    }

    await ctx.answerCallbackQuery({ text: "Контент одобрен!" });
    await ctx.editMessageText(
      ctx.callbackQuery.message?.text + "\n\nСтатус: Одобрен к публикации",
    );
  });

  // Редактировать контент
  bot.callbackQuery(/^edit:(.+)$/, async (ctx) => {
    const contentId = ctx.match[1];

    await ctx.answerCallbackQuery();
    await ctx.reply(
      "Отправьте текстом, что нужно изменить в контенте.\n" +
        `(ID: ${contentId})`,
    );
  });
}
