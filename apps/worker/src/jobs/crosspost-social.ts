import { supabase } from "../supabase.js";

// Кросспост в социальные сети + отзовики
// При публикации статьи — подготовка постов для размещения на разных площадках

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://neuroexpertise.ru";

interface SocialPost {
  platform: string;
  text: string;
  url: string;
  status: "sent" | "prepared";
}

export async function handleCrosspostSocial(payload: Record<string, unknown>): Promise<{ posts: SocialPost[] }> {
  const contentId = payload.content_id as string;
  const expertId = payload.expert_id as string;
  if (!contentId) throw new Error("content_id is required");

  const { data: pkg } = await supabase
    .from("content_packages")
    .select("title, slug, format_telegram_post, published_url, profiles!inner(full_name, slug, telegram_id)")
    .eq("id", contentId)
    .single();

  if (!pkg) throw new Error(`Content package ${contentId} not found`);

  const expert = pkg.profiles as unknown as { full_name: string; slug: string; telegram_id: number | null };
  const articleUrl = (pkg.published_url as string) || `${APP_URL}/experts/${expert.slug}/${pkg.slug}`;
  const telegramPost = (pkg.format_telegram_post as string) || (pkg.title as string);

  const posts: SocialPost[] = [];

  // Telegram sharing post (подготовка для экспертных чатов)
  const tgShareText = `${telegramPost}\n\n📖 Читать полностью: ${articleUrl}`;
  posts.push({
    platform: "telegram_chats",
    text: tgShareText,
    url: `https://t.me/share/url?url=${encodeURIComponent(articleUrl)}&text=${encodeURIComponent(pkg.title as string)}`,
    status: "prepared",
  });

  // ВКонтакте post
  posts.push({
    platform: "vk",
    text: `${pkg.title}\n\n${(pkg.format_telegram_post as string || "").slice(0, 300)}\n\n${articleUrl}`,
    url: `https://vk.com/share.php?url=${encodeURIComponent(articleUrl)}&title=${encodeURIComponent(pkg.title as string)}`,
    status: "prepared",
  });

  // Отзовики — подготовка текста
  const reviewText = [
    `Эксперт ${expert.full_name} отвечает:`,
    `«${(pkg.format_telegram_post as string || "").slice(0, 200)}...»`,
    `Полный ответ: ${articleUrl}`,
  ].join("\n\n");

  posts.push({
    platform: "reviews",
    text: reviewText,
    url: articleUrl,
    status: "prepared",
  });

  // Уведомляем эксперта со ссылками для шеринга
  if (expert.telegram_id) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (botToken) {
      const text = [
        `🚀 Статья опубликована! Поделитесь для максимального охвата:`,
        "",
        `📝 ${pkg.title}`,
        "",
        "Чем быстрее поделитесь — тем быстрее нейросети найдут вашу статью.",
      ].join("\n");

      const keyboard = {
        inline_keyboard: [
          [{ text: "📤 Поделиться в Telegram", url: posts[0].url }],
          [{ text: "📤 Поделиться в VK", url: posts[1].url }],
          [{ text: "📋 Копировать текст поста", callback_data: `copy_post:${contentId}` }],
        ],
      };

      try {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: expert.telegram_id, text, reply_markup: keyboard }),
        });
      } catch { /* ignore */ }
    }
  }

  console.log(`[crosspost_social] Prepared ${posts.length} posts for content ${contentId}`);
  return { posts };
}
