import { supabase } from "../supabase.js";

// Кросспостинг на внешние площадки: Дзен, Хабр, Яндекс Кью
// Требует API-токены площадок. Без них — сохраняет подготовленные посты для ручного размещения.

const DZEN_TOKEN = process.env.DZEN_API_TOKEN || "";
const HABR_TOKEN = process.env.HABR_API_TOKEN || "";

interface CrosspostResult {
  platform: string;
  status: "posted" | "prepared" | "failed";
  url?: string;
  error?: string;
}

export async function handleCrosspost(payload: Record<string, unknown>): Promise<{ results: CrosspostResult[] }> {
  const contentId = payload.content_id as string;
  const expertId = payload.expert_id as string;
  if (!contentId) throw new Error("content_id is required");

  const { data: pkg } = await supabase
    .from("content_packages")
    .select("title, slug, format_seo_article, format_telegram_post, meta_title, meta_description, published_url, profiles!inner(full_name)")
    .eq("id", contentId)
    .single();

  if (!pkg) throw new Error(`Content package ${contentId} not found`);

  const expertName = (pkg.profiles as unknown as { full_name: string }).full_name;
  const results: CrosspostResult[] = [];

  // Яндекс Дзен
  if (DZEN_TOKEN) {
    try {
      const res = await fetch("https://dzen.ru/api/v1/editor/articles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${DZEN_TOKEN}`,
        },
        body: JSON.stringify({
          title: pkg.title,
          content: pkg.format_seo_article,
          source_url: pkg.published_url,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        results.push({ platform: "dzen", status: "posted", url: data.url });
      } else {
        results.push({ platform: "dzen", status: "failed", error: `HTTP ${res.status}` });
      }
    } catch (err) {
      results.push({ platform: "dzen", status: "failed", error: err instanceof Error ? err.message : "unknown" });
    }
  } else {
    results.push({ platform: "dzen", status: "prepared" });
  }

  // Хабр
  if (HABR_TOKEN) {
    try {
      const res = await fetch("https://habr.com/kek/v2/articles/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "CSRF-Token": HABR_TOKEN,
        },
        body: JSON.stringify({
          title: pkg.title,
          textHtml: pkg.format_seo_article,
          hubs: [],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        results.push({ platform: "habr", status: "posted", url: data.publicUrl });
      } else {
        results.push({ platform: "habr", status: "failed", error: `HTTP ${res.status}` });
      }
    } catch (err) {
      results.push({ platform: "habr", status: "failed", error: err instanceof Error ? err.message : "unknown" });
    }
  } else {
    results.push({ platform: "habr", status: "prepared" });
  }

  // Яндекс Кью — нет публичного API, подготавливаем пост
  results.push({ platform: "yandex_kyu", status: "prepared" });

  // Уведомляем эксперта о готовых постах для ручного размещения
  const prepared = results.filter((r) => r.status === "prepared");
  if (prepared.length > 0) {
    await notifyManualCrosspost(expertId, expertName, pkg.title as string, prepared.map((r) => r.platform));
  }

  console.log(`[crosspost] Content ${contentId}: ${results.map((r) => `${r.platform}=${r.status}`).join(", ")}`);
  return { results };
}

async function notifyManualCrosspost(expertId: string, expertName: string, title: string, platforms: string[]): Promise<void> {
  const { data: expert } = await supabase
    .from("profiles")
    .select("telegram_id")
    .eq("id", expertId)
    .single();

  if (!expert?.telegram_id) return;

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return;

  const platformNames: Record<string, string> = {
    dzen: "Яндекс Дзен",
    habr: "Хабр",
    yandex_kyu: "Яндекс Кью",
  };

  const text = [
    `📢 Статья «${title}» готова к размещению!`,
    "",
    "Площадки для ручного размещения:",
    ...platforms.map((p) => `  • ${platformNames[p] ?? p}`),
    "",
    "Разместите в первые 3 дня — это усилит индексацию.",
  ].join("\n");

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: expert.telegram_id, text }),
    });
  } catch { /* ignore */ }
}
