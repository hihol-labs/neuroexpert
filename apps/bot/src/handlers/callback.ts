import type { Bot } from "grammy";
import { supabase } from "../supabase";
import { nicheKeyboard, otherNichesKeyboard } from "../keyboards";
import { NICHES, getMaxNiches as tierMaxNiches, packageAllowance, packageLimitMessage } from "shared";

/** Тариф эксперта (неизвестный / пустой -> free, fail-closed в shared). */
async function getTier(profileId: string): Promise<string> {
  const { data } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", profileId)
    .single();
  return (data?.subscription_tier as string | null) ?? "free";
}

/** Получает лимит ниш по тарифу эксперта (R-09: единая таблица shared) */
async function getMaxNiches(profileId: string): Promise<number> {
  return tierMaxNiches(await getTier(profileId));
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

function appUrl(): string {
  return (process.env["APP_URL"] || process.env["NEXT_PUBLIC_APP_URL"] || "https://neuroexpertise.ru").replace(/\/+$/, "");
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
      ? nicheKeyboard(selectedIds, maxNiches)
      : otherNichesKeyboard(selectedIds, maxNiches);

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

    await ctx.editMessageText(text, { reply_markup: nicheKeyboard(selectedIds, maxNiches) });
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

    await ctx.editMessageText(text, { reply_markup: otherNichesKeyboard(selectedIds, maxNiches) });
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

    await ctx.editMessageText(text, { reply_markup: nicheKeyboard(selectedIds, maxNiches) });
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

    // R-09 (E-AUTO-14): выбор темы = будущий пакет; при исчерпанном лимите месяца тема не принимается.
    const allowance = await packageAllowance(supabase, await getTier(profileId), profileId);
    if (!allowance.allowed) {
      await ctx.answerCallbackQuery({ text: "Лимит пакетов на этот месяц исчерпан", show_alert: true });
      await ctx.reply(packageLimitMessage(allowance, `${appUrl()}/billing`));
      return;
    }

    const { error } = await supabase
      .from("orders")
      // R-06: updated_at - время выбора темы; голосовое привязывается к последней выбранной.
      .update({ status: "accepted", updated_at: new Date().toISOString() })
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

  // R-06 (E-AUTO-7): выбрать тему для записи, когда принятых несколько. Состояние не храним:
  // выбранная тема становится «последней выбранной» (updated_at), к ней привяжется следующее голосовое.
  bot.callbackQuery(/^record_order:(.+)$/, async (ctx) => {
    const orderId = ctx.match[1];
    const profileId = await getProfileId(ctx.from.id);

    if (!profileId) {
      await ctx.answerCallbackQuery({ text: "Профиль не найден" });
      return;
    }

    const { data: touched, error } = await supabase
      .from("orders")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", orderId)
      .eq("expert_id", profileId)
      .eq("status", "accepted")
      .select("id, questions(question_text)");

    if (error || !touched || touched.length === 0) {
      await ctx.answerCallbackQuery({ text: "Тема уже в работе или не найдена" });
      return;
    }

    const question = (touched[0] as any).questions?.question_text ?? "";
    await ctx.answerCallbackQuery({ text: "Тема выбрана" });
    await ctx.reply(`Вопрос: ${question}\n\nЗапишите голосовое сообщение прямо здесь — ответ будет привязан к этой теме.`);
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

  // R-07 (E-AUTO-3): «Опубликовать» публикует через общий сервис web (/api/internal/publish) - там
  // проверка владельца, FAQ-гейт, публикация профиля и ревалидация страниц. Раньше колбэк писал
  // статус-тупик без проверки владельца: любой пользователь бота мог одобрить чужой пакет.
  bot.callbackQuery(/^approve:(.+)$/, async (ctx) => {
    const contentId = ctx.match[1];
    const profileId = await getProfileId(ctx.from.id);
    if (!profileId) {
      await ctx.answerCallbackQuery({ text: "Профиль не найден" });
      return;
    }

    const token = process.env["PUBLISH_INTERNAL_TOKEN"];
    if (!token) {
      console.error("[callback] PUBLISH_INTERNAL_TOKEN is missing");
      await ctx.answerCallbackQuery({ text: "Публикация из Telegram временно недоступна" });
      await ctx.reply(`Опубликуйте на сайте: ${appUrl()}/content/${contentId}`);
      return;
    }

    let status = 0;
    let data: { ok?: boolean; code?: string; problems?: string[]; url?: string; profile_url?: string; profile_published_now?: boolean; profile_visible?: boolean } = {};
    try {
      // Внутренний адрес web в сети compose; глобальный fetch - без Telegram-прокси.
      const res = await fetch(new URL("/api/internal/publish", process.env["PUBLISH_INTERNAL_URL"] || "http://web:3000"), {
        method: "POST",
        redirect: "error",
        signal: AbortSignal.timeout(30_000),
        headers: { "Content-Type": "application/json", "x-internal-token": token },
        body: JSON.stringify({ content_id: contentId, expert_id: profileId }),
      });
      status = res.status;
      data = await res.json().catch(() => ({}));
    } catch (err) {
      console.error("[callback] internal publish failed:", err);
    }

    if (status === 200 && data.ok) {
      await ctx.answerCallbackQuery({ text: "Опубликовано!" });
      await ctx.editMessageText(ctx.callbackQuery.message?.text + "\n\nСтатус: Опубликовано");
      if (data.profile_visible === false) {
        await ctx.reply(`Статья опубликована, но профиль не удалось сделать публичным - без этого статья недоступна. Включите публикацию профиля на сайте: ${appUrl()}/profile`);
      } else if (data.profile_published_now) {
        await ctx.reply(`Ваш профиль стал публичным: ${data.profile_url}\nСкрыть его можно в настройках профиля на сайте.`);
      }
      return;
    }

    const editor = `${appUrl()}/content/${contentId}`;
    const reasons: Record<string, string> = {
      not_found: "Материал не найден.",
      already_published: "Материал уже опубликован.",
      bad_status: "Материал ещё не готов к публикации.",
      conflict: "Материал уже опубликован или изменён - обновите список.",
      no_slug: `У материала нет адреса страницы. Откройте редактор: ${editor}`,
      faq_required: `Перед публикацией нужно дополнить FAQ:\n${(data.problems ?? []).map((p) => `- ${p}`).join("\n")}\n\nРедактор: ${editor}`,
    };
    await ctx.answerCallbackQuery({ text: "Не опубликовано" });
    await ctx.reply(reasons[data.code ?? ""] ?? `Не удалось опубликовать, попробуйте позже или на сайте: ${editor}`);
  });

  // R-07 (E-AUTO-4): правка текста - в веб-редакторе; прежняя заглушка обещала то, чего бот не умеет.
  bot.callbackQuery(/^edit:(.+)$/, async (ctx) => {
    const contentId = ctx.match[1];

    await ctx.answerCallbackQuery();
    await ctx.reply(`Отредактировать материал можно на сайте:\n${appUrl()}/content/${contentId}`);
  });
}
