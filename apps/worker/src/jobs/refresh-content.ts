import { supabase } from "../supabase.js";
import { tgFetch } from "shared/http/telegram-fetch";

export async function handleRefreshContent(_payload: Record<string, unknown>): Promise<{ flagged: number }> {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString();

  // Find stale published articles
  const { data: stale } = await supabase
    .from("content_packages")
    .select("id, title, expert_id, profiles!inner(telegram_id)")
    .eq("status", "published")
    .eq("refresh_status", "fresh")
    .or(`last_refreshed_at.is.null,last_refreshed_at.lt.${ninetyDaysAgo}`)
    .lt("published_at", ninetyDaysAgo)
    .limit(50);

  if (!stale?.length) {
    console.log("[refresh_content] No stale content found");
    return { flagged: 0 };
  }

  // Mark as needs_refresh
  const ids = stale.map((s) => s.id);
  await supabase
    .from("content_packages")
    .update({ refresh_status: "needs_refresh" })
    .in("id", ids);

  // Notify experts via Telegram
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (botToken) {
    const byExpert = new Map<number, string[]>();
    for (const s of stale) {
      const telegramId = (s.profiles as unknown as { telegram_id: number | null })?.telegram_id;
      if (!telegramId) continue;
      const list = byExpert.get(telegramId) ?? [];
      list.push(s.title ?? "Без заголовка");
      byExpert.set(telegramId, list);
    }

    for (const [telegramId, titles] of byExpert) {
      const text = [
        "📝 Статьи требуют обновления (старше 90 дней):",
        "",
        ...titles.slice(0, 5).map((t, i) => `${i + 1}. ${t}`),
        "",
        "Обновите — это улучшит индексацию и цитирование!",
      ].join("\n");

      try {
        await tgFetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: telegramId, text }),
        });
      } catch { /* ignore */ }
    }
  }

  console.log(`[refresh_content] Flagged ${ids.length} articles as needs_refresh`);
  return { flagged: ids.length };
}
