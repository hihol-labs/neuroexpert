import type { Bot } from "grammy";
import { supabase } from "../supabase";
import { nicheKeyboard, otherNichesKeyboard } from "../keyboards";
import { NICHES, SUBSCRIPTION_TIERS } from "shared";

/** Получает лимит ниш по тарифу эксперта */
async function getMaxNiches(profileId: string): Promise<number> {
  const { data } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", profileId)
    .single();
  const tier = data?.subscription_tier ?? "free";
  return SUBSCRIPTION_TIERS[tier]?.maxNiches ?? 1;
}

/** Получает выбранные ниши эксперта */
async function getSelectedNiches(profileId: string): Promise<string[]> {
  const { data } = await supabase
    .from("expert_niches")
    .select("niche_id")
    .eq("expert_id", profileId);
  return data?.map((row) => row.niche_id) ?? [];
}

/** Получает profile.id по telegram_id */
async function getProfileId(telegramId: number): Promise<string | null> {
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("telegram_id", telegramId)
    .single();
  return data?.id ?? null;
}

export function registerCallbackHandler(bot: Bot): void {
  // Toggle ниши (выбрать / снять)
  bot.callbackQuery(/^toggle_niche:(.+)$/, async (ctx) => {
    const nicheId = ctx.match[1];
    const telegramId = ctx.from.id;

    const profileId = await getProfileId(telegramId);
    if (!profileId) {
      await ctx.answerCallbackQuery({ text: "Профиль не найден" });
      return;
    }

    const niche = NICHES.find((n) => n.id === nicheId);
    if (!niche) {
      await ctx.answerCallbackQuery({ text: "Ниша не найдена" });
      return;
    }

    const selectedIds = await getSelectedNiches(profileId);
    const maxNiches = await getMaxNiches(profileId);
    const isSelected = selectedIds.includes(nicheId);

    if (isSelected) {
      // Убираем нишу
      await supabase
        .from("expert_niches")
        .delete()
        .eq("expert_id", profileId)
        .eq("niche_id", nicheId);
      selectedIds.splice(selectedIds.indexOf(nicheId), 1);
      await ctx.answerCallbackQuery({ text: `Убрана: ${niche.name}` });
    } else {
      if (selectedIds.length >= maxNiches) {
        const tierHint = maxNiches < 10 ? " Перейдите на следующий тариф для увеличения лимита." : "";
        await ctx.answerCallbackQuery({ text: `Максимум ${maxNiches} ${maxNiches === 1 ? "ниша" : maxNiches < 5 ? "ниши" : "ниш"} на вашем тарифе.${tierHint}`, show_alert: true });
        return;
      }
      // Добавляем нишу
      await supabase
        .from("expert_niches")
        .insert({ expert_id: profileId, niche_id: nicheId });
      selectedIds.push(nicheId);
      await ctx.answerCallbackQuery({ text: `Выбрана: ${niche.name}` });
    }

    // Определяем, какую клавиатуру показывать (фокусные или другие)
    const isFocusNiche = NICHES.find((n) => n.id === nicheId)?.isFocus;
    const keyboard = isFocusNiche
      ? nicheKeyboard(selectedIds)
      : otherNichesKeyboard(selectedIds);

    const selectedNames = selectedIds
      .map((id) => NICHES.find((n) => n.id === id))
      .filter(Boolean)
      .map((n) => `${n!.icon} ${n!.name}`);

    const text = selectedNames.length > 0
      ? `Выберите ниши (до ${maxNiches}):\n\nВыбрано: ${selectedNames.join(", ")}`
      : `Выберите ниши (до ${maxNiches}):`;

    await ctx.editMessageText(text, { reply_markup: keyboard });
  });

  // Изменить ниши (из /start для зарегистрированных)
  bot.callbackQuery("change_niches", async (ctx) => {
    const profileId = await getProfileId(ctx.from.id);
    if (!profileId) {
      await ctx.answerCallbackQuery({ text: "Профиль не найден" });
      return;
    }

    const selectedIds = await getSelectedNiches(profileId);
    const maxNiches = await getMaxNiches(profileId);
    await ctx.answerCallbackQuery();

    const selectedNames = selectedIds
      .map((id) => NICHES.find((n) => n.id === id))
      .filter(Boolean)
      .map((n) => `${n!.icon} ${n!.name}`);

    const text = selectedNames.length > 0
      ? `Выберите ниши (до ${maxNiches}):\n\nВыбрано: ${selectedNames.join(", ")}`
      : `Выберите ниши (до ${maxNiches}):`;

    await ctx.editMessageText(text, { reply_markup: nicheKeyboard(selectedIds) });
  });

  // Лимит достигнут — нажатие на неактивную кнопку
  bot.callbackQuery("niche_limit", async (ctx) => {
    const profileId = await getProfileId(ctx.from.id);
    const maxNiches = profileId ? await getMaxNiches(profileId) : 1;
    await ctx.answerCallbackQuery({
      text: `Максимум ${maxNiches} ${maxNiches === 1 ? "ниша" : maxNiches < 5 ? "ниши" : "ниш"} на вашем тарифе. Снимите одну, чтобы выбрать другую.`,
      show_alert: true,
    });
  });

  // Показать другие ниши
  bot.callbackQuery("show_other_niches", async (ctx) => {
    const profileId = await getProfileId(ctx.from.id);
    if (!profileId) {
      await ctx.answerCallbackQuery({ text: "Профиль не найден" });
      return;
    }

    const selectedIds = await getSelectedNiches(profileId);
    const maxNiches = await getMaxNiches(profileId);
    await ctx.answerCallbackQuery();

    const selectedNames = selectedIds
      .map((id) => NICHES.find((n) => n.id === id))
      .filter(Boolean)
      .map((n) => `${n!.icon} ${n!.name}`);

    const text = selectedNames.length > 0
      ? `Выберите ниши (до ${maxNiches}):\n\nВыбрано: ${selectedNames.join(", ")}`
      : `Выберите ниши (до ${maxNiches}):`;

    await ctx.editMessageText(text, { reply_markup: otherNichesKeyboard(selectedIds) });
  });

  // Показать основные ниши (назад)
  bot.callbackQuery("show_focus_niches", async (ctx) => {
    const profileId = await getProfileId(ctx.from.id);
    if (!profileId) {
      await ctx.answerCallbackQuery({ text: "Профиль не найден" });
      return;
    }

    const selectedIds = await getSelectedNiches(profileId);
    const maxNiches = await getMaxNiches(profileId);
    await ctx.answerCallbackQuery();

    const selectedNames = selectedIds
      .map((id) => NICHES.find((n) => n.id === id))
      .filter(Boolean)
      .map((n) => `${n!.icon} ${n!.name}`);

    const text = selectedNames.length > 0
      ? `Выберите ниши (до ${maxNiches}):\n\nВыбрано: ${selectedNames.join(", ")}`
      : `Выберите ниши (до ${maxNiches}):`;

    await ctx.editMessageText(text, { reply_markup: nicheKeyboard(selectedIds) });
  });

  // Подтвердить выбор ниш
  bot.callbackQuery("confirm_niches", async (ctx) => {
    const profileId = await getProfileId(ctx.from.id);
    if (!profileId) {
      await ctx.answerCallbackQuery({ text: "Профиль не найден" });
      return;
    }

    const selectedIds = await getSelectedNiches(profileId);
    if (selectedIds.length === 0) {
      await ctx.answerCallbackQuery({ text: "Выберите хотя бы одну нишу", show_alert: true });
      return;
    }

    // Обновляем основную нишу в profiles для обратной совместимости
    await supabase
      .from("profiles")
      .update({ niche_id: selectedIds[0] })
      .eq("id", profileId);

    const selectedNames = selectedIds
      .map((id) => NICHES.find((n) => n.id === id))
      .filter(Boolean)
      .map((n) => `${n!.icon} ${n!.name}`);

    await ctx.answerCallbackQuery({ text: "Ниши сохранены!" });
    await ctx.editMessageText(
      `Отлично! Ваши ниши:\n${selectedNames.join("\n")}\n\n` +
        "Теперь вы будете получать заказы по вашим темам.\n\n" +
        "/orders — посмотреть заказы\n" +
        "/record — записать голосовое\n" +
        "/status — ваш профиль",
    );
  });

  // Принять заказ
  bot.callbackQuery(/^accept_order:(.+)$/, async (ctx) => {
    const orderId = ctx.match[1];
    const profileId = await getProfileId(ctx.from.id);

    if (!profileId) {
      await ctx.answerCallbackQuery({ text: "Профиль не найден" });
      return;
    }

    const { error } = await supabase
      .from("orders")
      .update({ status: "accepted" })
      .eq("id", orderId)
      .eq("expert_id", profileId)
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
    const profileId = await getProfileId(ctx.from.id);

    if (!profileId) {
      await ctx.answerCallbackQuery({ text: "Профиль не найден" });
      return;
    }

    const { error } = await supabase
      .from("orders")
      .update({ status: "rejected" })
      .eq("id", orderId)
      .eq("expert_id", profileId)
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
