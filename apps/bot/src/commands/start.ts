import type { Bot, Context } from "grammy";
import { supabase } from "../supabase.js";
import { nicheKeyboard } from "../keyboards.js";

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
      .select("id, full_name, niche_id, onboarding_completed")
      .eq("telegram_id", telegramId)
      .single();

    if (existing) {
      if (!existing.niche_id) {
        await ctx.reply(
          `С возвращением, ${firstName}! Выберите свою нишу:`,
          { reply_markup: nicheKeyboard() },
        );
        return;
      }
      await ctx.reply(
        `Привет, ${existing.full_name}! Вы уже зарегистрированы.\n\n` +
          "Команды:\n" +
          "/orders — ваши заказы\n" +
          "/record — записать голосовое\n" +
          "/status — статистика",
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
        "Для начала выберите вашу нишу:",
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
    .select("full_name")
    .single();

  if (error || !profile) {
    await ctx.reply(
      "Не удалось привязать аккаунт. Убедитесь, что ссылка актуальна.",
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
