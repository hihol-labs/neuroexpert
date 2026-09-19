import { tgFetch } from "shared/http/telegram-fetch";

/** Сообщение эксперту в Telegram после публикации (вынесено из /api/publish без изменений, R-07). */
export async function sendSharingNotification(telegramId: number, title: string, url: string, nicheSlug?: string): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return;

  // Get niche-specific channels
  let channelLines: string[] = [];
  if (nicheSlug) {
    const { getNicheChannels } = await import("@/lib/niche-channels");
    const channels = getNicheChannels(nicheSlug);
    if (channels.length > 0) {
      channelLines = [
        "",
        "📢 Рекомендуемые чаты для вашей ниши:",
        ...channels.map((c) => `  • ${c.name}`),
      ];
    }
  }

  const text = [
    "🎉 Статья опубликована!",
    "",
    `📝 ${title}`,
    `🔗 ${url}`,
    "",
    "Поделитесь в первые 3 дня — это важно для индексации!",
    ...channelLines,
  ].join("\n");

  // Build keyboard with niche-specific share buttons
  const shareButtons: Array<{ text: string; url: string }> = [
    { text: "📤 Шеринг в чаты", url: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}` },
  ];

  if (nicheSlug) {
    const { getNicheChannels } = await import("@/lib/niche-channels");
    const channels = getNicheChannels(nicheSlug);
    for (const ch of channels.slice(0, 2)) {
      shareButtons.push({
        text: `📢 ${ch.name}`,
        url: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}&to=${encodeURIComponent(ch.url.replace("https://t.me/", ""))}`,
      });
    }
  }

  const keyboard = {
    inline_keyboard: [
      shareButtons.slice(0, 1).map((b) => ({ text: b.text, url: b.url })),
      ...shareButtons.slice(1).map((b) => [{ text: b.text, url: b.url }]),
      [{ text: "📋 Копировать пост", callback_data: `copy_post:${url}` }],
    ],
  };

  try {
    await tgFetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: telegramId, text, reply_markup: keyboard }),
    });
  } catch (err) {
    console.error("[publish] Sharing notification failed:", err);
  }
}
