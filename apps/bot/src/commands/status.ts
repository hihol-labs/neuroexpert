import type { Bot } from "grammy";
import { supabase } from "../supabase.js";

export function registerStatusCommand(bot: Bot): void {
  bot.command("status", async (ctx) => {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, subscription_tier, trust_score, niche_id, niches!inner(name)")
      .eq("telegram_id", telegramId)
      .single();

    if (!profile) {
      await ctx.reply("Сначала зарегистрируйтесь: /start");
      return;
    }

    // Считаем статистику
    const [ordersResult, contentResult, voiceResult] = await Promise.all([
      supabase
        .from("orders")
        .select("status", { count: "exact", head: true })
        .eq("expert_id", profile.id),
      supabase
        .from("content_packages")
        .select("status", { count: "exact", head: true })
        .eq("expert_id", profile.id)
        .eq("status", "published"),
      supabase
        .from("voice_recordings")
        .select("id", { count: "exact", head: true })
        .eq("expert_id", profile.id),
    ]);

    const nicheName = (profile as any).niches?.name ?? "Не выбрана";
    const totalOrders = ordersResult.count ?? 0;
    const publishedContent = contentResult.count ?? 0;
    const totalVoice = voiceResult.count ?? 0;

    const tierNames: Record<string, string> = {
      free: "Free",
      starter: "Starter",
      pro: "Pro",
      expert: "Expert",
      business: "Business",
      enterprise: "Enterprise",
    };

    await ctx.reply(
      `Ваш профиль:\n\n` +
        `Имя: ${profile.full_name}\n` +
        `Ниша: ${nicheName}\n` +
        `Тариф: ${tierNames[profile.subscription_tier] ?? profile.subscription_tier}\n` +
        `Trust Score: ${profile.trust_score}/100\n\n` +
        `Статистика:\n` +
        `Заказов: ${totalOrders}\n` +
        `Публикаций: ${publishedContent}\n` +
        `Голосовых: ${totalVoice}`,
    );
  });
}
