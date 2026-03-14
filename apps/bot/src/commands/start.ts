import type { Bot, Context } from "grammy";
import { supabase } from "../supabase";
import { nicheKeyboard, changeNichesKeyboard } from "../keyboards";
import { NICHES } from "shared";

/** Получает выбранные ниши эксперта */
async function getSelectedNiches(profileId: string): Promise<string[]> {
  const { data } = await supabase
    .from("expert_niches")
    .select("niche_id")
    .eq("expert_id", profileId);
  return data?.map((row) => row.niche_id) ?? [];
}

export function registerCommands(bot: Bot): void {
  bot.command("start", async (ctx) => {
    const telegramId = ctx.from?.id;
    const username = ctx.from?.username;
    const firstName = ctx.from?.first_name ?? "Эксперт";

    if (!telegramId) {
      await ctx.reply("Не удалось определить ваш Telegram ID.");
      return;
    }

    const token = ctx.match?.trim();

    if (token) {
      // /start {token} — привязка существующего аккаунта
      await handleLinkAccount(ctx, telegramId, username, token);
      return;
    }

    // Проверяем, есть ли уже профиль по telegram_id
    const { data: existing } = await supabase
      .from("profiles")
      .select("id, full_name, onboarding_completed")
      .eq("telegram_id", telegramId)
      .single();

    if (existing) {
      const selectedIds = await getSelectedNiches(existing.id);

      if (selectedIds.length === 0) {
        await ctx.reply(
          `С возвращением, ${firstName}! Выберите ниши (до 3):`,
          { reply_markup: nicheKeyboard() },
        );
        return;
      }

      const nicheNames = selectedIds
        .map((id) => NICHES.find((n) => n.id === id))
        .filter(Boolean)
        .map((n) => `${n!.icon} ${n!.name}`);

      await ctx.reply(
        `Привет, ${existing.full_name}! Вы уже зарегистрированы.\n\n` +
          `Ваши ниши: ${nicheNames.join(", ")}\n\n` +
          "Команды:\n" +
          "/orders — ваши заказы\n" +
          "/record — записать голосовое\n" +
          "/status — статистика",
        { reply_markup: changeNichesKeyboard() },
      );
      return;
    }

    // Создаём нового пользователя через Supabase Auth Admin
    const email = `tg_${telegramId}@neuroexpert.bot`;
    const { data: authUser, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          telegram_id: telegramId,
          telegram_username: username,
          full_name: firstName,
        },
      });

    if (authError) {
      console.error("[start] Auth createUser error:", authError);
      await ctx.reply("Произошла ошибка при регистрации. Попробуйте позже.");
      return;
    }

    // Обновляем профиль с telegram_id (профиль создаётся триггером auth)
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        telegram_id: telegramId,
        telegram_username: username ?? null,
        full_name: firstName,
      })
      .eq("id", authUser.user.id);

    if (updateError) {
      console.error("[start] Profile update error:", updateError);
    }

    await ctx.reply(
      `Добро пожаловать в НейроЭксперт, ${firstName}!\n\n` +
        "Я помогу вам стать видимым для AI-платформ. " +
        "Для начала выберите ваши ниши (до 3):",
      { reply_markup: nicheKeyboard() },
    );
  });
}

async function handleLinkAccount(
  ctx: Context,
  telegramId: number,
  username: string | undefined,
  token: string,
): Promise<void> {
  // token = user id для привязки
  const { data: profile, error } = await supabase
    .from("profiles")
    .update({
      telegram_id: telegramId,
      telegram_username: username ?? null,
    })
    .eq("id", token)
    .select("id, full_name")
    .single();

  if (error || !profile) {
    await ctx.reply(
      "Не удалось привязать аккаунт. Убедитесь, что ссылка актуальна.",
    );
    return;
  }

  const selectedIds = await getSelectedNiches(profile.id);

  if (selectedIds.length === 0) {
    await ctx.reply(
      `Аккаунт привязан! Привет, ${profile.full_name}!\n\n` +
        "Выберите ваши ниши (до 3):",
      { reply_markup: nicheKeyboard() },
    );
    return;
  }

  await ctx.reply(
    `Аккаунт привязан! Привет, ${profile.full_name}!\n\n` +
      "Теперь вы можете записывать голосовые прямо здесь.\n" +
      "/orders — ваши заказы\n" +
      "/record — записать голосовое\n" +
      "/status — статистика",
  );
}
