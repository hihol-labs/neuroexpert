import type { Bot, Context } from "grammy";
import { supabase } from "../supabase";
import { nicheKeyboard, changeNichesKeyboard } from "../keyboards";
import { NICHES, getMaxNiches } from "shared";
import { hashLinkNonce, verifyTelegramLinkToken } from "shared/notify/link-token";

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
      .select("id, full_name, onboarding_completed, subscription_tier")
      .eq("telegram_id", telegramId)
      .single();

    if (existing) {
      const selectedIds = await getSelectedNiches(existing.id);

      if (selectedIds.length === 0) {
        // R-09: лимит ниш из тарифа (free - 1).
        const maxNiches = getMaxNiches((existing.subscription_tier as string | null) ?? "free");
        await ctx.reply(
          `С возвращением, ${firstName}! Выберите ниши (до ${maxNiches}):`,
          { reply_markup: nicheKeyboard([], maxNiches) },
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

    // R-08 (E-AUTO-2): аккаунт создаётся только на сайте. Раньше здесь создавался новый аккаунт
    // tg_<id>@neuroexpert.bot - для эксперта, зарегистрированного на сайте, это был дубль.
    await ctx.reply(
      `Здравствуйте, ${firstName}!\n\n` +
        "Чтобы работать с НейроЭкспертом через Telegram, привяжите его к своему аккаунту:\n" +
        `1. Зарегистрируйтесь или войдите: ${appUrl()}/login\n` +
        "2. В профиле нажмите «Подключить Telegram» и откройте ссылку — она приведёт обратно сюда.",
    );
  });
}

function appUrl(): string {
  return (process.env["APP_URL"] || process.env["NEXT_PUBLIC_APP_URL"] || "https://neuroexpertise.ru").replace(/\/+$/, "");
}

const LINK_ERRORS: Record<string, string> = {
  expired: "Ссылка устарела (действует 15 минут). Получите новую в профиле на сайте.",
  bad_signature: "Ссылка недействительна. Получите новую в профиле на сайте.",
  bad_format: "Ссылка недействительна. Получите новую в профиле на сайте.",
  no_secret: "Привязка временно недоступна. Попробуйте позже.",
};

async function handleLinkAccount(
  ctx: Context,
  telegramId: number,
  username: string | undefined,
  token: string,
): Promise<void> {
  // R-08: токен - подписанная ссылка из профиля (HMAC, 15 минут, одноразовый номер). Сырой id
  // профиля больше не принимается: зная UUID, можно было привязать свой Telegram к чужому профилю.
  const secret = process.env["TELEGRAM_LINK_SECRET"];
  const verified = verifyTelegramLinkToken(token, secret, Date.now());
  if (!verified.ok) {
    if (verified.code === "no_secret") console.error("[start] TELEGRAM_LINK_SECRET is missing");
    await ctx.reply(`${LINK_ERRORS[verified.code]}\n${appUrl()}/profile`);
    return;
  }

  // Номер гасится этой же записью: повторное применение ссылки не найдёт строку.
  const { data: profile, error } = await supabase
    .from("profiles")
    .update({
      telegram_id: telegramId,
      telegram_username: username ?? null,
      telegram_link_nonce: null,
      telegram_link_expires_at: null,
    })
    .eq("id", verified.profileId)
    .eq("telegram_link_nonce", hashLinkNonce(verified.nonce))
    // Срок проверяется и в подписи, и по записи профиля (вторая линия защиты).
    .gt("telegram_link_expires_at", new Date().toISOString())
    .select("id, full_name, subscription_tier")
    .maybeSingle();

  if (error?.code === "23505") {
    await ctx.reply(
      "Этот Telegram уже привязан к другому аккаунту НейроЭксперта. Отключите его там в профиле и получите новую ссылку.",
    );
    return;
  }
  if (error || !profile) {
    if (error) console.error("[start] link update failed:", error.message);
    await ctx.reply(`Ссылка уже использована или заменена новой. Получите новую в профиле: ${appUrl()}/profile`);
    return;
  }

  const selectedIds = await getSelectedNiches(profile.id);

  if (selectedIds.length === 0) {
    const maxNiches = getMaxNiches((profile.subscription_tier as string | null) ?? "free");
    await ctx.reply(
      `Аккаунт привязан! Привет, ${profile.full_name}!\n\n` +
        `Выберите ваши ниши (до ${maxNiches}):`,
      { reply_markup: nicheKeyboard([], maxNiches) },
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
